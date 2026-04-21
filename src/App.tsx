import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth, signInWithGoogle, logout, getUserProfile, saveUserProfile, getLeaderboard } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { GameCanvas } from './components/GameCanvas';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Play, LogOut, ChevronRight, Activity, Globe, Zap } from 'lucide-react';

const socket: Socket = io();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        if (p) {
          setProfile(p);
        } else {
          const newProfile = { userId: u.uid, displayName: u.displayName, runs: 0, wickets: 0, matchesPlayed: 0, matchesWon: 0 };
          await saveUserProfile(u.uid, newProfile);
          setProfile(newProfile);
        }
      }
    });

    socket.on('match_found', (data) => {
      setMatchInfo(data);
      setIsSearching(false);
    });

    fetchLiveData();
    fetchLeaderboard();
  }, []);

  const fetchLiveData = async () => {
    // Mocking real-time cricket data
    setLiveData({
      match: "IND vs AUS - Test Series",
      score: "IND 245/4 (78.2 ov)",
      venue: "Wankhede Stadium, Mumbai",
      status: "In Progress"
    });
  };

  const fetchLeaderboard = async () => {
    const lb = await getLeaderboard();
    setLeaderboard(lb);
  };

  const handleJoinLobby = () => {
    setIsSearching(true);
    socket.emit('join_lobby');
  };

  const handleGameAction = (action: any) => {
    socket.emit('game_action', { matchId: matchInfo.matchId, action });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bold-gradient-bg pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/5 p-10 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl text-center z-10"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center rotate-12 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-6xl font-black italic tracking-tighter text-white mb-2 leading-none">CRICKET<br/><span className="text-blue-600">PRO</span></h1>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mb-10">Multiplayer League</p>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full py-5 bg-white text-black rounded-xl font-black italic text-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95 shadow-xl uppercase skew-btn"
          >
            <span className="skew-btn-content flex items-center gap-3">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="G" className="w-6" />
              Sign in with Google
            </span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-white font-sans overflow-hidden flex flex-col relative">
      <div className="absolute inset-0 bold-gradient-bg pointer-events-none" />
      
      {/* Navigation */}
      <nav className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white/20 flex items-center justify-center text-xl font-black italic">
            CP
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Regional Rank #12</h3>
            <p className="text-lg font-black tracking-tight uppercase italic">{user.displayName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Server: Optimized</span>
          </div>
          <button onClick={logout} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 hover:bg-red-500/20 transition-colors">
            <LogOut className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col p-8 gap-8 z-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!matchInfo ? (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full"
            >
              {/* Left Column: Stats & Data */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Ranked Season 8</h4>
                  <div className="text-5xl font-black italic tracking-tighter text-blue-500">PRO I</div>
                  <p className="text-sm text-white/60 mt-2 font-medium uppercase">Top 12% Worldwide</p>
                  <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-[75%]"></div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex-1">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 font-bold tracking-widest">Live Global Data</h4>
                  {liveData && (
                    <div className="space-y-4">
                      <div className="border-l-2 border-blue-500 pl-3">
                        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">{liveData.match}</p>
                        <p className="text-xl font-black italic">{liveData.score}</p>
                      </div>
                      <div className="border-l-2 border-white/10 pl-3">
                        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Wankhede Stadium</p>
                        <p className="text-lg font-black italic opacity-40">NEXT MATCH: MI vs CSK</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Column: Hero Play Area */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center text-center relative group">
                <div className="absolute -z-10 text-[12rem] font-black italic text-white/[0.02] select-none tracking-tighter">LEAGUE</div>
                
                <h1 className="text-8xl font-black italic tracking-tighter leading-[0.8] mb-8 uppercase drop-shadow-2xl">
                  BATTLE<br/>
                  <span className="text-blue-600">ROYALE</span>
                </h1>

                <div className="flex flex-col gap-4 w-full max-w-sm">
                  <button 
                    onClick={handleJoinLobby}
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-xl font-black text-3xl italic tracking-tighter shadow-2xl shadow-blue-900/40 uppercase skew-btn transition-all active:scale-95 disabled:bg-gray-800 disabled:text-gray-500"
                  >
                    <span className="skew-btn-content flex items-center justify-center gap-3">
                      {isSearching ? <Users className="w-8 h-8 animate-pulse" /> : <Play className="w-8 h-8 fill-white" />}
                      {isSearching ? 'Matching...' : 'Play Now'}
                    </span>
                  </button>
                  <button className="bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-black text-xl italic tracking-tighter uppercase skew-btn transition-all border border-white/10">
                    <span className="skew-btn-content">Tournament</span>
                  </button>
                </div>

                <div className="mt-12 flex items-center gap-8 text-white/40 font-bold uppercase tracking-widest text-[10px]">
                  <span>Matchmaking: Active</span>
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  <span>4.2k Online</span>
                </div>
              </div>

              {/* Right Column: Mini Stats & Squad */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Stat Overview</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">RUNS</p>
                      <p className="text-2xl font-black italic text-white">{profile?.runs || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">WICKETS</p>
                      <p className="text-2xl font-black italic text-red-500">{profile?.wickets || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex-1">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Hall of Fame</h4>
                  <div className="space-y-3">
                    {leaderboard.slice(0, 5).map((entry, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-black italic ${i < 3 ? 'text-blue-500' : 'text-white/20'}`}>{i + 1}</span>
                          <span className="text-xs font-bold uppercase truncate max-w-[80px]">{entry.displayName}</span>
                        </div>
                        <span className="text-xs font-black italic text-blue-400">{entry.runs} <span className="text-[8px] opacity-40">R</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-tr from-yellow-600 to-yellow-400 p-6 rounded-2xl text-black">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-black mb-1">Exclusive Offer</h4>
                  <p className="text-2xl font-black leading-none italic uppercase">Premium Kit</p>
                  <p className="text-[10px] font-bold mt-2 opacity-80">UNLOCK ALL LEGENDS</p>
                  <button className="w-full bg-black text-white mt-4 py-3 font-black text-xs uppercase rounded-lg shadow-lg active:scale-95 transition-all">Store</button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="game"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-10 py-10"
            >
              <div className="flex items-center gap-12 bg-black/80 px-12 py-6 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl skew-btn">
                <div className="skew-btn-content flex items-center gap-10">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">STRIKER</p>
                    <p className="text-2xl font-black text-white italic uppercase">{user.displayName}</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center border-2 border-white/20 shadow-xl shadow-blue-500/20 rotate-12">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">CHALLENGER</p>
                    <p className="text-2xl font-black text-white italic opacity-50 uppercase">OPPONENT</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-[40px] border border-white/10 backdrop-blur-md shadow-2xl relative">
                <GameCanvas 
                  role={matchInfo.role} 
                  onAction={handleGameAction} 
                  gameState={null} 
                />
              </div>
              
              <button 
                onClick={() => setMatchInfo(null)}
                className="text-white/20 font-black hover:text-red-500 transition-colors uppercase text-xs tracking-[0.4em] flex items-center gap-2 italic"
              >
                Terminate Match <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-20 bg-black border-t border-white/10 px-12 flex items-center justify-between z-50">
        <nav className="flex gap-12 font-black uppercase tracking-tighter text-lg italic text-white/20">
          <a href="#" className="text-blue-500 hover:text-blue-400">Home</a>
          <a href="#" className="hover:text-white transition-colors">Squad</a>
          <a href="#" className="hover:text-white transition-colors">Market</a>
          <a href="#" className="hover:text-white transition-colors">Stats</a>
          <a href="#" className="hover:text-white transition-colors">Events</a>
        </nav>
        <div className="text-right">
          <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest">v1.4.2-BUILD-OPTIMIZED</p>
        </div>
      </footer>
    </div>
  );
}
