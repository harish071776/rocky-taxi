const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../middleware/auth');

/* ── GET /api/user/profile ── */
router.get('/profile', auth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...s } = user;
  res.json(s);
});

/* ── PUT /api/user/profile ── */
router.put('/profile', auth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.body.name)  user.name  = req.body.name;
  if (req.body.phone) user.phone = req.body.phone;
  const { password, ...s } = user;
  res.json(s);
});

/* ── GET /api/user/wallet ── */
router.get('/wallet', auth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const txns = db.walletTransactions.filter(t => t.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ balance: user.walletBalance, transactions: txns });
});

/* ── POST /api/user/wallet/topup ── */
router.post('/wallet/topup', auth, (req, res) => {
  const amount = Number(req.body.amount);
  if (!amount || amount < 10 || amount > 10000)
    return res.status(400).json({ error: 'Amount must be ₹10 – ₹10,000' });
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.walletBalance = (user.walletBalance || 0) + amount;
  db.walletTransactions.push({ id: uuidv4(), userId: user.id, type: 'credit', amount, description: 'Wallet top-up', createdAt: new Date() });
  db.notifications.push({ id: uuidv4(), userId: user.id, title: '✅ Wallet recharged', message: `₹${amount} added to Rocky Wallet.`, read: false, createdAt: new Date() });
  res.json({ balance: user.walletBalance, message: `₹${amount} added successfully` });
});

/* ── GET /api/user/notifications ── */
router.get('/notifications', auth, (req, res) => {
  const notifs = db.notifications.filter(n => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(notifs);
});

/* ── PUT /api/user/notifications/read ── */
router.put('/notifications/read', auth, (req, res) => {
  db.notifications.filter(n => n.userId === req.user.id).forEach(n => n.read = true);
  res.json({ ok: true });
});

/* ── GET /api/user/stats ── */
router.get('/stats', auth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const bookings = db.bookings.filter(b => b.userId === req.user.id && b.status === 'completed');
  res.json({
    totalRides:  bookings.length,
    totalSpent:  bookings.reduce((s, b) => s + (b.finalFare || b.fare), 0),
    totalKm:     bookings.reduce((s, b) => s + (b.distance || 0), 0),
    walletBalance: user?.walletBalance || 0
  });
});

/* ── POST /api/user/support ── */
router.post('/support', auth, (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });
  const ticket = { id: uuidv4(), userId: req.user.id, subject, message, status: 'open', createdAt: new Date() };
  db.supportTickets.push(ticket);
  db.notifications.push({ id: uuidv4(), userId: req.user.id, title: 'Support ticket raised', message: `Ticket #${ticket.id.slice(0,8)} created. We'll reply within 24 h.`, read: false, createdAt: new Date() });
  res.status(201).json({ ticketId: ticket.id });
});

module.exports = router;
