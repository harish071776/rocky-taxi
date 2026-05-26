const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

/* ── GET /api/captains ── */
router.get('/', auth, (req, res) => {
  res.json(db.captains.map(safe));
});

/* ── GET /api/captains/available ── */
router.get('/available', auth, (req, res) => {
  const { vehicleType } = req.query;
  let list = db.captains.filter(c => c.status === 'available');
  if (vehicleType) list = list.filter(c => c.vehicleType === vehicleType);
  res.json(list.map(safe));
});

/* ── GET /api/captains/me  (captain's own profile + earnings) ── */
router.get('/me', auth, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: 'Captains only' });
  const captain = db.captains.find(c => c.id === req.user.id);
  if (!captain) return res.status(404).json({ error: 'Not found' });
  const earningsTxns = db.captainEarningsTxns.filter(t => t.captainId === captain.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ...safe(captain), earningsTxns });
});

/* ── PUT /api/captains/status  (captain toggles online/offline) ── */
router.put('/status', auth, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: 'Captains only' });
  const { status } = req.body;
  if (!['available','offline'].includes(status)) return res.status(400).json({ error: 'Status must be available or offline' });
  const captain = db.captains.find(c => c.id === req.user.id);
  if (!captain) return res.status(404).json({ error: 'Not found' });
  if (captain.status === 'busy') return res.status(400).json({ error: 'Cannot change status during an active ride' });
  captain.status = status;
  res.json({ status: captain.status });
});

/* ── PUT /api/captains/location  (captain updates own location) ── */
router.put('/location', auth, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: 'Captains only' });
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  const captain = db.captains.find(c => c.id === req.user.id);
  if (!captain) return res.status(404).json({ error: 'Not found' });
  captain.location = { lat: parseFloat(lat), lng: parseFloat(lng), updatedAt: new Date() };
  res.json({ ok: true });
});

function safe(c) { const { password, ...s } = c; return s; }

module.exports = router;
