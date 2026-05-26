const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');

const SECRET = process.env.JWT_SECRET || 'rocky_secret_2026';
const sign   = (payload) => jwt.sign(payload, SECRET, { expiresIn: '7d' });

/* ─── USER REGISTER ─── */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const em = email.toLowerCase().trim();
    if (db.users.find(u => u.email === em))
      return res.status(409).json({ error: 'Email already registered' });

    const user = {
      id: uuidv4(), name, email: em, phone,
      password: await bcrypt.hash(password, 10),
      walletBalance: 50, totalRides: 0, createdAt: new Date()
    };
    db.users.push(user);

    db.walletTransactions.push({ id: uuidv4(), userId: user.id, type: 'credit', amount: 50, description: 'Welcome bonus 🎉', createdAt: new Date() });
    db.notifications.push({ id: uuidv4(), userId: user.id, title: 'Welcome to Rocky Taxi! 🎉', message: 'You got ₹50 welcome bonus in your wallet.', read: false, createdAt: new Date() });

    const token = sign({ id: user.id, email: user.email, name: user.name, role: 'user' });
    res.status(201).json({ token, role: 'user', user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─── USER LOGIN ─── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.users.find(u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(404).json({ error: 'No account found with this email' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Incorrect password' });

    const token = sign({ id: user.id, email: user.email, name: user.name, role: 'user' });
    res.json({ token, role: 'user', user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─── CAPTAIN LOGIN ─── */
router.post('/captain/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

    const captain = db.captains.find(c => c.phone === phone.trim());
    if (!captain) return res.status(404).json({ error: 'No captain found with this phone' });
    if (!await bcrypt.compare(password, captain.password)) return res.status(401).json({ error: 'Incorrect password' });

    const token = sign({ id: captain.id, name: captain.name, role: 'captain' });
    res.json({ token, role: 'captain', captain: safeCaptain(captain) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

function safeUser(u)    { const { password, ...s } = u; return s; }
function safeCaptain(c) { const { password, ...s } = c; return s; }

module.exports = router;
