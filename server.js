/* ============================================================
   GrammatikDuell – Lobby-Server
   Stellt die API bereit, die index.html erwartet:
   /api/create, /api/join, /api/poll, /api/progress, /api/done, /api/leave
   ============================================================ */

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

/* Statische Dateien (index.html, css, js, bilder) aus dem
   gleichen Ordner ausliefern, in dem server.js liegt. */
app.use(express.static(__dirname));

/* ---- Lobby-Speicher (im Arbeitsspeicher, reicht für dieses Projekt) ---- */
const lobbies = {}; // code -> lobby

function makeCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (lobbies[code]);
  return code;
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pushEvent(lobby, targetId, type, data) {
  lobby.events.push(Object.assign({ target: targetId, type }, data));
}

function otherPlayerId(lobby, playerId) {
  return lobby.order.find(id => id !== playerId);
}

/* Alte/verlassene Lobbys nach 30 Minuten aufräumen */
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const code in lobbies) {
    if (lobbies[code].createdAt < cutoff) delete lobbies[code];
  }
}, 5 * 60 * 1000);

/* ---- Lobby erstellen ---- */
app.post('/api/create', (req, res) => {
  const name = (req.body.name || 'Spieler 1').slice(0, 16);
  const diff = req.body.diff || 'mittel';
  const code = makeCode();
  const playerId = makeId();

  lobbies[code] = {
    code,
    diff,
    order: [playerId],
    players: { [playerId]: { name, progress: 0, score: 0, done: false } },
    events: [],
    createdAt: Date.now()
  };

  res.json({ ok: true, code, playerId, diff });
});

/* ---- Lobby beitreten ---- */
app.post('/api/join', (req, res) => {
  const code = String(req.body.code || '');
  const name = (req.body.name || 'Spieler 2').slice(0, 16);
  const lobby = lobbies[code];

  if (!lobby) return res.json({ ok: false, why: 'notfound' });
  if (lobby.order.length >= 2) return res.json({ ok: false, why: 'full' });

  const playerId = makeId();
  const hostId = lobby.order[0];
  lobby.order.push(playerId);
  lobby.players[playerId] = { name, progress: 0, score: 0, done: false };

  pushEvent(lobby, hostId, 'opp_joined', { opp: name });

  res.json({
    ok: true,
    code,
    playerId,
    diff: lobby.diff,
    oppName: lobby.players[hostId].name
  });
});

/* ---- Fortschritt nach jeder Frage ---- */
app.post('/api/progress', (req, res) => {
  const { code, playerId, progress, score } = req.body;
  const lobby = lobbies[code];
  if (!lobby || !lobby.players[playerId]) return res.json({ ok: false });

  lobby.players[playerId].progress = progress;
  lobby.players[playerId].score = score;

  const oppId = otherPlayerId(lobby, playerId);
  if (oppId) pushEvent(lobby, oppId, 'opp_progress', { progress, score });

  res.json({ ok: true });
});

/* ---- Spiel fertig ---- */
app.post('/api/done', (req, res) => {
  const { code, playerId, score } = req.body;
  const lobby = lobbies[code];
  if (!lobby || !lobby.players[playerId]) return res.json({ ok: false });

  lobby.players[playerId].done = true;
  lobby.players[playerId].score = score;

  const oppId = otherPlayerId(lobby, playerId);
  if (oppId) pushEvent(lobby, oppId, 'opp_done', { score });

  const allDone = lobby.order.every(id => lobby.players[id].done);
  if (allDone) {
    const results = lobby.order.map(id => ({
      name: lobby.players[id].name,
      score: lobby.players[id].score
    }));
    lobby.order.forEach(id => pushEvent(lobby, id, 'result', { players: results }));
  }

  res.json({ ok: true });
});

/* ---- Polling: neue Ereignisse abholen ---- */
app.get('/api/poll', (req, res) => {
  const { code, playerId } = req.query;
  const since = parseInt(req.query.since, 10) || 0;
  const lobby = lobbies[code];
  if (!lobby) return res.json({ ok: false });

  const fresh = lobby.events.slice(since).filter(ev => ev.target === playerId);
  res.json({ ok: true, total: lobby.events.length, events: fresh });
});

/* ---- Lobby verlassen ---- */
app.post('/api/leave', (req, res) => {
  const { code, playerId } = req.body;
  const lobby = lobbies[code];
  if (!lobby) return res.json({ ok: true });

  const name = lobby.players[playerId] ? lobby.players[playerId].name : 'Spieler';
  const oppId = otherPlayerId(lobby, playerId);
  if (oppId) pushEvent(lobby, oppId, 'opp_left', { name });

  delete lobby.players[playerId];
  lobby.order = lobby.order.filter(id => id !== playerId);
  if (lobby.order.length === 0) delete lobbies[code];

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server läuft auf Port ' + PORT));
