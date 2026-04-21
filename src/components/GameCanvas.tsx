import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Users, Play, LogOut, ChevronRight } from 'lucide-react';

interface GameCanvasProps {
  role: 'batting' | 'bowling';
  onAction: (action: any) => void;
  gameState: any;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ role, onAction, gameState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballRef = useRef<Matter.Body | null>(null);
  const batRef = useRef<Matter.Body | null>(null);
  const fieldersRef = useRef<Matter.Body[]>([]);

  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [message, setMessage] = useState('');
  
  // New Batting Controls
  const [shotType, setShotType] = useState<'defensive' | 'standard' | 'lofted'>('standard');
  const [shotDirection, setShotDirection] = useState<'off' | 'straight' | 'on'>('straight');
  const [isBallInZone, setIsBallInZone] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const { Engine, Render, Runner, Bodies, Composite, Events, Vector, Body } = Matter;

    const engine = Engine.create();
    engineRef.current = engine;
    
    const render = Render.create({
      element: containerRef.current,
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: '#2d5a27', // Pitch green
      },
    });

    // Boundaries
    const ground = Bodies.rectangle(400, 590, 810, 60, { isStatic: true, label: 'ground', render: { fillStyle: '#8b4513' } });
    const wallLeft = Bodies.rectangle(-20, 300, 40, 600, { isStatic: true, label: 'boundary' });
    const wallRight = Bodies.rectangle(820, 300, 40, 600, { isStatic: true, label: 'backstop' });
    const sky = Bodies.rectangle(400, -50, 800, 40, { isStatic: true, label: 'sky' });

    // Stumps
    const stumps = Bodies.rectangle(100, 500, 30, 100, { 
      isStatic: true, 
      label: 'stumps',
      render: { fillStyle: '#ffffff' } 
    });

    // Fielders
    const fielderPositions = [
      { x: 300, y: 150, label: 'fielder' },
      { x: 300, y: 450, label: 'fielder' },
      { x: 600, y: 300, label: 'fielder' },
      { x: 450, y: 550, label: 'fielder' },
      { x: 450, y: 50, label: 'fielder' },
    ];

    const fielders = fielderPositions.map(pos => Bodies.circle(pos.x, pos.y, 12, {
      label: 'fielder',
      frictionAir: 0.05,
      render: { 
        fillStyle: '#2563eb',
        strokeStyle: '#ffffff',
        lineWidth: 3
      }
    }));
    fieldersRef.current = fielders;

    Composite.add(engine.world, [ground, wallLeft, wallRight, sky, stumps, ...fielders]);

    // Bat
    const bat = Bodies.rectangle(150, 480, 20, 80, {
      isStatic: true,
      label: 'bat',
      render: { fillStyle: '#ffcc00' }
    });
    batRef.current = bat;
    Composite.add(engine.world, bat);

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    // Collision Logic
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const ball = bodyA.label === 'ball' ? bodyA : (bodyB.label === 'ball' ? bodyB : null);
        const target = bodyA.label === 'ball' ? bodyB : bodyA;

        if (ball && target.label === 'stumps') {
          setWickets(prev => prev + 1);
          setMessage('CLEAN BOWLED!');
          resetBall();
        }

        if (ball && target.label === 'fielder') {
          const ballY = ball.position.y;
          // If ball is above ground (y < 540) when hit by fielder, it's a catch
          if (ballY < 540) {
            setWickets(prev => prev + 1);
            setMessage('OUT! CAUGHT!');
            resetBall();
          } else {
            setMessage('STOPPED!');
            Body.setVelocity(ball, { x: 0, y: 0 }); // Fielders stop the ball
          }
        }
        
        if (ball && target.label === 'bat') {
          // Calculate hit force based on bat angle and ball speed
          const speed = Vector.magnitude(ball.velocity);
          const hitForce = Vector.create(
            (Math.random() - 0.2) * (speed * 2 + 10),
            -Math.random() * (speed * 1.5 + 5)
          );
          
          Body.applyForce(ball, ball.position, Vector.mult(hitForce, 0.002));
          setMessage('NICE HIT!');
          confetti({
            particleCount: 40,
            spread: 70,
            origin: { y: 0.7 }
          });
        }

        if (ball && target.label === 'boundary') {
          setScore(prev => prev + 4);
          setMessage('FOUR!');
          confetti();
          resetBall();
        }

        if (ball && target.label === 'sky') {
          setScore(prev => prev + 6);
          setMessage('MASSIVE SIX!');
          confetti({
            particleCount: 100,
            spread: 120,
            origin: { y: 0.6 }
          });
          resetBall();
        }
      });
    });

    // Magnus Effect & Fielding Logic
    Events.on(engine, 'beforeUpdate', () => {
      const ball = ballRef.current;
      if (ball) {
        const spin = ball.angularVelocity;
        const velocity = ball.velocity;
        
        // Sweet spot detection (x between 120 and 220)
        setIsBallInZone(ball.position.x > 120 && ball.position.x < 220);

        // Apply a small perpendicular force based on spin
        const drift = Vector.create(-velocity.y * spin * 0.1, velocity.x * spin * 0.1);
        Body.applyForce(ball, ball.position, Vector.mult(drift, 0.001));

        // Fielding movement: If ball is moving fast (hit), fielders chase
        if (Vector.magnitude(velocity) > 4 && ball.position.x > 180) {
          fieldersRef.current.forEach(fielder => {
            const delta = Vector.sub(ball.position, fielder.position);
            const dist = Vector.magnitude(delta);
            if (dist < 300) { // Fielders only chase if ball is nearby
              const direction = Vector.normalise(delta);
              const chaseSpeed = 1.5;
              Body.setVelocity(fielder, Vector.mult(direction, chaseSpeed));
            }
          });
        }
      } else {
        setIsBallInZone(false);
        // Fielders slow down when ball is reset
        fieldersRef.current.forEach(fielder => {
          Body.setVelocity(fielder, Vector.mult(fielder.velocity, 0.9));
        });
      }
    });

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, []);

  const shootBall = () => {
    const { Bodies, Composite, Body } = Matter;
    const isSpinBall = Math.random() > 0.5;
    
    const ball = Bodies.circle(750, 480, 10, {
      restitution: 0.85,
      friction: 0.01,
      frictionAir: 0.01,
      label: 'ball',
      render: { 
        fillStyle: isSpinBall ? '#b22222' : '#ff0000', // Darker red for spin balls
        strokeStyle: '#ffffff',
        lineWidth: 2
      }
    });

    ballRef.current = ball;
    Composite.add(engineRef.current!.world, ball);

    // Varied trajectory and speed
    const speedX = -18 - Math.random() * 7;
    const speedY = -3 - Math.random() * 5;
    const spin = isSpinBall ? (Math.random() - 0.5) * 0.4 : 0; // High spin for "spinners"

    Body.setVelocity(ball, { x: speedX, y: speedY });
    Body.setAngularVelocity(ball, spin);
    
    if (role === 'bowling') {
      onAction({ type: 'shoot_ball', spin, speedX, speedY });
    }
  };

  const swingBat = () => {
    if (!batRef.current) return;
    const { Body, Vector } = Matter;
    
    // Direction mapping
    const dirOffset = shotDirection === 'off' ? 0.2 : (shotDirection === 'on' ? -0.2 : 0);
    const powerMult = shotType === 'lofted' ? 1.5 : (shotType === 'defensive' ? 0.3 : 1);
    
    // Animate bat swing
    Body.setAngularVelocity(batRef.current, -0.4 * powerMult);
    Body.setAngle(batRef.current, -Math.PI / 4 + dirOffset);
    
    // Visual feedback for timing
    if (isBallInZone) {
      setMessage('PERFECT TIMING!');
    }

    setTimeout(() => {
      Body.setAngle(batRef.current, 0);
      Body.setAngularVelocity(batRef.current, 0);
    }, 150);
    
    if (role === 'batting') {
      onAction({ type: 'swing_bat', shotType, shotDirection });
    }
  };

  const resetBall = () => {
    if (ballRef.current) {
      Matter.Composite.remove(engineRef.current!.world, ballRef.current);
      ballRef.current = null;
    }
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full max-w-[800px] bg-black/80 p-4 rounded-xl text-white font-mono border-b-4 border-yellow-500">
        <div className="text-2xl">SCORE: {score}</div>
        <div className="text-xl opacity-70">OVERS: 0.0</div>
        <div className="text-2xl text-red-500">WICKETS: {wickets}</div>
      </div>

      <div ref={containerRef} className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-gray-900 bg-gray-800">
        <canvas ref={canvasRef} />
        
        {/* Timing Zones Overlay */}
        <div className="absolute bottom-16 left-[120px] w-[100px] h-4 bg-yellow-500/20 rounded-full border border-yellow-500/40 pointer-events-none flex items-center justify-center">
            <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter">Sweet Spot</span>
        </div>

        {isBallInZone && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-full shadow-lg"
          >
            STRIKE ZONE ACTIVE
          </motion.div>
        )}

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ scale: 0, opacity: 0, y: 50 }}
              animate={{ scale: 1.5, opacity: 1, y: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-6xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] italic uppercase">{message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mt-4 w-full max-w-[800px]">
        {role === 'bowling' && (
          <button 
            onClick={shootBall}
            className="flex-1 py-6 bg-red-600 text-white rounded-3xl font-black text-2xl hover:bg-red-500 active:scale-95 transition-all shadow-[0_10px_0_rgb(153,27,27)] border-2 border-white/20 uppercase tracking-tighter"
          >
            BOWL NOW
          </button>
        )}
        
        {role === 'batting' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shot Type */}
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Style</span>
                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    {(['defensive', 'standard', 'lofted'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setShotType(t)}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all uppercase ${shotType === t ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Action */}
            <button 
                onClick={swingBat}
                className={`py-6 px-10 rounded-3xl font-black text-2xl transition-all active:scale-95 shadow-[0_10px_0_rgb(161,98,7)] border-2 border-black/20 uppercase tracking-tighter ${isBallInZone ? 'bg-green-500 text-black animate-pulse shadow-[0_10px_0_rgb(22,101,52)]' : 'bg-yellow-500 text-black'}`}
            >
                SWING
            </button>

            {/* Shot Direction */}
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Direction</span>
                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    {(['off', 'straight', 'on'] as const).map(d => (
                        <button 
                            key={d}
                            onClick={() => setShotDirection(d)}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all uppercase ${shotDirection === d ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
