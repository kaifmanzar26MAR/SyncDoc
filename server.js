import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const presenceRooms = new Map();

async function connectMongo() {
  if (!process.env.MONGODB_URI) return;
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: '/socket.io',
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL || '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('presence:join', async ({ documentId, userId, name, color }) => {
      if (!documentId || !userId) return;
      const room = `document:${documentId}`;
      socket.join(room);

      if (!presenceRooms.has(room)) presenceRooms.set(room, new Map());
      const roomMap = presenceRooms.get(room);
      roomMap.set(userId, { userId, name, color, socketId: socket.id });

      try {
        await connectMongo();
        const PresenceSession = (await import('./src/modules/shared/data/models/PresenceSession.js')).default;
        await PresenceSession.findOneAndUpdate(
          { documentId, userId },
          { socketId: socket.id, name, color, lastSeenAt: new Date() },
          { upsert: true }
        );
      } catch (err) {
        console.error('[Socket] presence join error:', err.message);
      }

      const list = [...roomMap.values()];
      io.to(room).emit('presence:list', list);
      socket.to(room).emit('presence:joined', { userId, name, color });
    });

    socket.on('presence:leave', async ({ documentId, userId }) => {
      const room = `document:${documentId}`;
      const roomMap = presenceRooms.get(room);
      if (roomMap) {
        roomMap.delete(userId);
        if (!roomMap.size) presenceRooms.delete(room);
      }
      socket.to(room).emit('presence:left', { userId });
      socket.leave(room);

      try {
        await connectMongo();
        const PresenceSession = (await import('./src/modules/shared/data/models/PresenceSession.js')).default;
        await PresenceSession.deleteOne({ documentId, userId });
      } catch {
        /* ignore */
      }
    });

    socket.on('doc:update', ({ documentId, userId, update }) => {
      socket.to(`document:${documentId}`).emit('doc:update', { documentId, userId, update });
    });

    socket.on('disconnect', () => {
      for (const [room, roomMap] of presenceRooms.entries()) {
        for (const [userId, data] of roomMap.entries()) {
          if (data.socketId === socket.id) {
            roomMap.delete(userId);
            io.to(room).emit('presence:left', { userId });
          }
        }
        if (!roomMap.size) presenceRooms.delete(room);
      }
    });
  });

  server.listen(port, () => {
    console.log(`> SyncDoc ready on http://${hostname}:${port}`);
  });
});
