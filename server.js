// server.js – GrammatikDuell Lobby-Server (HTTP-Polling, kein WebSocket)
// Funktioniert zuverlaessig auf Render Free Tier
// Aufruf: node server.js

const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Lobby-Verwaltung ──────────────────────────────────────────────────────────
// Map<code, { players:[{id,name,score,progress,done}], diff, created, events:[] }>
const lobbies = new Map();

function makeCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); }
  while (lobbies.has(code));
  return code;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// Lobbys aelter als 2h bereinigen
setInterval(() => {
  const now = Date.now();
  for (const [code, l] of lobbies)
    if (now - l.created > 7_200_000) lobbies.delete(code);
}, 300_000);

// ── API-Endpunkte ─────────────────────────────────────────────────────────────

// Neue Lobby erstellen
app.post('/api/create', (req, res) => {
  const { name, diff } = req.body || {};
  const code    = makeCode();
  const playerId = makeId();
  lobbies.set(code, {
    players: [{ id: playerId, name: String(name || 'Spieler 1').slice(0,16), score: 0, progress: 0, done: false }],
    diff:    ['leicht','mittel','schwer'].includes(diff) ? diff : 'mittel',
    created: Date.now(),
    events:  [{ type: 'created', code }]
  });
  res.json({ ok: true, code, playerId, diff: lobbies.get(code).diff });
});

// Lobby beitreten
app.post('/api/join', (req, res) => {
  const { code, name } = req.body || {};
  const lobby = lobbies.get(String(code || '').trim());
  if (!lobby)                      return res.json({ ok: false, why: 'notfound' });
  if (lobby.players.length >= 2)   return res.json({ ok: false, why: 'full' });
  const playerId = makeId();
  lobby.players.push({ id: playerId, name: String(name || 'Spieler 2').slice(0,16), score: 0, progress: 0, done: false });
  lobby.events.push({ type: 'opp_joined', opp: lobby.players[1].name });
  res.json({ ok: true, code, playerId, diff: lobby.diff, oppName: lobby.players[0].name });
});

// Fortschritt melden
app.post('/api/progress', (req, res) => {
  const { code, playerId, progress, score } = req.body || {};
  const lobby = lobbies.get(code);
  if (!lobby) return res.json({ ok: false });
  const p = lobby.players.find(p => p.id === playerId);
  if (!p)   return res.json({ ok: false });
  p.score    = Number(score)    || 0;
  p.progress = Number(progress) || 0;
  lobby.events.push({ type: 'opp_progress', progress: p.progress, score: p.score, from: playerId });
  res.json({ ok: true });
});

// Fertig melden
app.post('/api/done', (req, res) => {
  const { code, playerId, score } = req.body || {};
  const lobby = lobbies.get(code);
  if (!lobby) return res.json({ ok: false });
  const p = lobby.players.find(p => p.id === playerId);
  if (!p)   return res.json({ ok: false });
  p.score    = Number(score) || 0;
  p.progress = 10;
  p.done     = true;
  lobby.events.push({ type: 'opp_done', score: p.score, from: playerId });
  // Beide fertig?
  if (lobby.players.length === 2 && lobby.players.every(p => p.done)) {
    lobby.events.push({
      type:    'result',
      players: lobby.players.map(p => ({ name: p.name, score: p.score }))
    });
  }
  res.json({ ok: true });
});

// Polling: neue Events seit lastSeen abrufen (Client pollt alle 1.5s)
app.get('/api/poll', (req, res) => {
  const { code, playerId, since } = req.query;
  const lobby = lobbies.get(code);
  if (!lobby) return res.json({ ok: false, why: 'notfound' });
  const sinceIdx = parseInt(since, 10) || 0;
  // Nur Events zurueckgeben, die NICHT von diesem Spieler stammen
  const events = lobby.events
    .slice(sinceIdx)
    .filter(e => !e.from || e.from !== playerId);
  res.json({
    ok:      true,
    total:   lobby.events.length,
    events,
    players: lobby.players.map(p => ({ name: p.name, score: p.score, progress: p.progress, done: p.done }))
  });
});

// Lobby verlassen
app.post('/api/leave', (req, res) => {
  const { code, playerId } = req.body || {};
  const lobby = lobbies.get(code);
  if (lobby) {
    const p = lobby.players.find(p => p.id === playerId);
    if (p) {
      lobby.events.push({ type: 'opp_left', name: p.name });
      lobby.players = lobby.players.filter(p => p.id !== playerId);
      if (lobby.players.length === 0) lobbies.delete(code);
    }
  }
  res.json({ ok: true });
});

// Health-Check
app.get('/health', (_, res) => res.json({ ok: true, lobbies: lobbies.size }));

app.listen(PORT, () => console.log('GrammatikDuell Server Port ' + PORT));
