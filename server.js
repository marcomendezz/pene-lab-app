const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Agent webhook endpoint — Hermes/Jarvis post messages here
app.post('/api/agent-message', (req, res) => {
  const { agent, message, emoji } = req.body;
  if (!agent || !message) return res.status(400).json({ error: 'agent and message required' });
  const msg = { user: agent, text: message, emoji: emoji || '🤖', timestamp: Date.now(), type: 'agent' };
  io.emit('chat message', msg);
  res.json({ ok: true, delivered: true });
});

// Connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on('join', (name) => {
    users.set(socket.id, name);
    io.emit('chat message', { user: 'Sistema', text: `${name} entró al War Room`, emoji: '⚡', timestamp: Date.now(), type: 'system' });
    io.emit('users', Array.from(users.values()));
  });

  socket.on('chat message', (data) => {
    const msg = { user: users.get(socket.id) || 'Anon', text: data.text, emoji: data.emoji || '👤', timestamp: Date.now(), type: 'human' };
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    const name = users.get(socket.id);
    users.delete(socket.id);
    if (name) {
      io.emit('chat message', { user: 'Sistema', text: `${name} salió del War Room`, emoji: '⚡', timestamp: Date.now(), type: 'system' });
      io.emit('users', Array.from(users.values()));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🧪 Pene Lab War Room running on http://0.0.0.0:${PORT}`);
});
