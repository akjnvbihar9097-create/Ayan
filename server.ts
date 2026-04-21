import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  const PORT = 3000;

  // Matchmaking State
  const lobby: string[] = [];
  const matches: Map<string, { p1: string; p2: string; state: any }> = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_lobby', () => {
      if (!lobby.includes(socket.id)) {
        lobby.push(socket.id);
        console.log('User joined lobby:', socket.id);
        
        if (lobby.length >= 2) {
          const p1 = lobby.shift()!;
          const p2 = lobby.shift()!;
          const matchId = `match_${Date.now()}`;
          
          matches.set(matchId, { p1, p2, state: { score: 0, wickets: 0, overs: 0 } });
          
          io.to(p1).emit('match_found', { matchId, opponent: p2, role: 'batting' });
          io.to(p2).emit('match_found', { matchId, opponent: p1, role: 'bowling' });
          
          socket.join(matchId);
          io.sockets.sockets.get(p1)?.join(matchId);
        }
      }
    });

    socket.on('game_action', (data) => {
      const { matchId, action } = data;
      // Broadcast action to the other player in the match
      socket.to(matchId).emit('opponent_action', action);
    });

    socket.on('disconnect', () => {
      const index = lobby.indexOf(socket.id);
      if (index !== -1) lobby.splice(index, 1);
      console.log('User disconnected:', socket.id);
    });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
