const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../middleware/auth');

const RATES = {
  bike: { base: 20, perKm: 7,  label: 'Bike', emoji: '🏍️', capacity: 1 },
  auto: { base: 30, perKm: 10, label: 'Auto', emoji: '🛺',  capacity: 3 },
  cab:  { base: 50, perKm: 14, label: 'Cab',  emoji: '🚗',  capacity: 4 }
};

function calcFare(vehicleType, distKm) {
  const r = RATES[vehicleType] || RATES.bike;
  const fare = Math.round(r.base + r.perKm * distKm);
  const duration = Math.round(distKm * (vehicleType === 'bike' ? 3 : 4.5));
  return { fare, distance: distKm, duration, ...r };
}

function randomKm() { return Math.floor(Math.random() * 12) + 3; } // 3–14 km

/* ── POST /api/rides/estimate ── */
router.post('/estimate', auth, (req, res) => {
  const { pickup, drop } = req.body;
  if (!pickup || !drop) return res.status(400).json({ error: 'Pickup and drop required' });
  const km = randomKm();
  const estimates = {};
  ['bike','auto','cab'].forEach(t => { estimates[t] = calcFare(t, km); });
  res.json({ pickup, drop, distanceKm: km, estimates });
});

/* ── POST /api/rides/validate-promo ── */
router.post('/validate-promo', auth, (req, res) => {
  const { code, fare } = req.body;
  const p = db.promoCodes.find(x => x.code === (code||'').toUpperCase().trim() && x.active);
  if (!p)                          return res.status(404).json({ error: 'Invalid promo code' });
  if (new Date() > new Date(p.expiresAt)) return res.status(400).json({ error: 'Promo code expired' });
  if (fare < p.minFare)            return res.status(400).json({ error: `Min fare ₹${p.minFare} required` });
  if (p.usedCount >= p.maxUses)    return res.status(400).json({ error: 'Promo limit reached' });
  const discount = p.type === 'flat' ? p.discount : Math.floor(fare * p.discount / 100);
  res.json({ valid: true, code: p.code, discount, finalFare: Math.max(0, fare - discount) });
});

/* ── POST /api/rides/book ── */
router.post('/book', auth, (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ error: 'Only users can book rides' });
  const { pickup, drop, pickupCoords, dropCoords, vehicleType = 'bike', paymentMethod = 'cash', promoCode } = req.body;
  if (!pickup || !drop) return res.status(400).json({ error: 'Pickup and drop required' });

  const captain = db.captains.find(c => c.status === 'available' && c.vehicleType === vehicleType)
               || db.captains.find(c => c.status === 'available');
  if (!captain) return res.status(503).json({ error: 'No captains available right now. Try again shortly.' });

  const km = randomKm();
  const { fare, distance, duration } = calcFare(vehicleType, km);
  let finalFare = fare, promoDiscount = 0;

  if (promoCode) {
    const p = db.promoCodes.find(x => x.code === promoCode.toUpperCase().trim() && x.active);
    if (p && new Date() <= new Date(p.expiresAt) && p.usedCount < p.maxUses) {
      promoDiscount = p.type === 'flat' ? p.discount : Math.floor(fare * p.discount / 100);
      finalFare = Math.max(0, fare - promoDiscount);
      p.usedCount += 1;
    }
  }

  const user = db.users.find(u => u.id === req.user.id);
  if (paymentMethod === 'wallet') {
    if (!user || user.walletBalance < finalFare)
      return res.status(400).json({ error: `Insufficient wallet balance. Available: ₹${user?.walletBalance || 0}` });
    user.walletBalance -= finalFare;
    db.walletTransactions.push({ id: uuidv4(), userId: user.id, type: 'debit', amount: finalFare, description: `Ride: ${pickup} → ${drop}`, createdAt: new Date() });
  }

  const booking = {
    id: uuidv4(),
    userId: req.user.id,
    captainId: captain.id,
    captain: { id: captain.id, name: captain.name, phone: captain.phone, rating: captain.rating, vehicleNo: captain.vehicleNo, vehicleType: captain.vehicleType, photo: captain.photo },
    pickup, drop,
    pickupCoords: pickupCoords || null,
    dropCoords: dropCoords || null,
    vehicleType, paymentMethod,
    fare, finalFare, promoDiscount,
    distance, duration,
    promoCode: promoCode || null,
    status: 'confirmed',      // confirmed -> in_progress -> completed | cancelled
    otp: Math.floor(1000 + Math.random() * 9000).toString(),
    bookedAt: new Date(),
    startedAt: null,
    completedAt: null,
    eta: Math.floor(Math.random() * 5) + 2,
    rated: false,
    fareCredited: false        // becomes true when captain marks complete
  };

  captain.status = 'busy';
  db.bookings.push(booking);
  if (user) user.totalRides = (user.totalRides || 0) + 1;

  db.notifications.push({ id: uuidv4(), userId: req.user.id, title: '🏍️ Ride confirmed!', message: `${captain.name} is on the way. OTP: ${booking.otp}. ETA ${booking.eta} min.`, read: false, createdAt: new Date() });

  res.status(201).json(booking);
});

/* ── POST /api/rides/:id/location  (user shares live GPS) ── */
router.post('/:id/location', auth, (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  db.liveLocations[req.params.id] = { lat: parseFloat(lat), lng: parseFloat(lng), updatedAt: new Date(), sharedBy: req.user.role };
  res.json({ ok: true });
});

/* ── GET /api/rides/:id/location  (captain polls user location) ── */
router.get('/:id/location', auth, (req, res) => {
  const loc = db.liveLocations[req.params.id];
  if (!loc) return res.status(404).json({ error: 'No live location yet' });
  res.json(loc);
});

/* ── GET /api/rides/history ── */
router.get('/history', auth, (req, res) => {
  let bookings;
  if (req.user.role === 'captain') {
    bookings = db.bookings.filter(b => b.captainId === req.user.id);
  } else {
    bookings = db.bookings.filter(b => b.userId === req.user.id);
  }
  res.json(bookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt)));
});

/* ── GET /api/rides/captain/active  (captain's current ride) ── */
router.get('/captain/active', auth, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: 'Captains only' });
  const ride = db.bookings.find(b => b.captainId === req.user.id && ['confirmed','in_progress'].includes(b.status));
  res.json(ride || null);
});

/* ── POST /api/rides/:id/start  (captain starts ride after OTP) ── */
router.post('/:id/start', auth, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: 'Captains only' });
  const { otp } = req.body;
  const booking = db.bookings.find(b => b.id === req.params.id && b.captainId === req.user.id);
  if (!booking)              return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Ride already started or not confirmed' });
  if (booking.otp !== otp)  return res.status(400).json({ error: 'Wrong OTP. Ask the customer for the 4-digit code.' });

  booking.status = 'in_progress';
  booking.startedAt = new Date();
  db.notifications.push({ id: uuidv4(), userId: booking.userId, title: '🏍️ Ride started!', message: `${booking.captain.name} has started your ride to ${booking.drop}.`, read: false, createdAt: new Date() });
  res.json(booking);
});

/* ── POST /api/rides/:id/complete  (captain completes ride → fare credited to captain) ── */
router.post('/:id/complete', auth, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: 'Captains only' });
  const booking = db.bookings.find(b => b.id === req.params.id && b.captainId === req.user.id);
  if (!booking)                    return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'in_progress') return res.status(400).json({ error: 'Ride not in progress' });

  booking.status = 'completed';
  booking.completedAt = new Date();

  const captain = db.captains.find(c => c.id === req.user.id);
  if (captain) {
    captain.status = 'available';
    captain.totalRides += 1;
    captain.earnings = (captain.earnings || 0) + booking.finalFare;   // ← FARE CREDITED TO CAPTAIN
    booking.fareCredited = true;
    db.captainEarningsTxns.push({
      id: uuidv4(),
      captainId: captain.id,
      bookingId: booking.id,
      amount: booking.finalFare,
      description: `Ride: ${booking.pickup} → ${booking.drop}`,
      createdAt: new Date()
    });
  }

  // 5% cashback to user for cash rides
  if (booking.paymentMethod === 'cash') {
    const cashback = Math.max(1, Math.floor(booking.finalFare * 0.05));
    const user = db.users.find(u => u.id === booking.userId);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + cashback;
      db.walletTransactions.push({ id: uuidv4(), userId: user.id, type: 'credit', amount: cashback, description: '5% cashback on ride 🎉', createdAt: new Date() });
    }
  }

  db.notifications.push({ id: uuidv4(), userId: booking.userId, title: '✅ Ride completed!', message: `Your ride to ${booking.drop} is done. Fare: ₹${booking.finalFare}. Please rate your captain!`, read: false, createdAt: new Date() });
  delete db.liveLocations[booking.id];

  res.json(booking);
});

/* ── POST /api/rides/:id/cancel ── */
router.post('/:id/cancel', auth, (req, res) => {
  const booking = db.bookings.find(b => b.id === req.params.id &&
    (req.user.role === 'captain' ? b.captainId === req.user.id : b.userId === req.user.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!['confirmed'].includes(booking.status)) return res.status(400).json({ error: 'Cannot cancel this ride' });

  booking.status = 'cancelled';
  const captain = db.captains.find(c => c.id === booking.captainId);
  if (captain) captain.status = 'available';

  if (booking.paymentMethod === 'wallet') {
    const user = db.users.find(u => u.id === booking.userId);
    if (user) {
      user.walletBalance += booking.finalFare;
      db.walletTransactions.push({ id: uuidv4(), userId: user.id, type: 'credit', amount: booking.finalFare, description: 'Refund: ride cancelled', createdAt: new Date() });
    }
  }
  db.notifications.push({ id: uuidv4(), userId: booking.userId, title: 'Ride cancelled', message: `Your ride to ${booking.drop} was cancelled.`, read: false, createdAt: new Date() });
  res.json(booking);
});

/* ── POST /api/rides/:id/rate ── */
router.post('/:id/rate', auth, (req, res) => {
  const { rating, comment } = req.body;
  const booking = db.bookings.find(b => b.id === req.params.id && b.userId === req.user.id);
  if (!booking)                    return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only rate completed rides' });
  if (booking.rated)               return res.status(400).json({ error: 'Already rated' });
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
  booking.rated = true; booking.userRating = rating; booking.userComment = comment;
  const captain = db.captains.find(c => c.id === booking.captainId);
  if (captain) {
    const newRating = ((captain.rating * captain.totalRides) + rating) / (captain.totalRides + 1);
    captain.rating = Math.round(newRating * 10) / 10;
  }
  res.json({ message: 'Rating submitted' });
});

/* ── POST /api/rides/:id/sos ── */
router.post('/:id/sos', auth, (req, res) => {
  const booking = db.bookings.find(b => b.id === req.params.id && b.userId === req.user.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  db.notifications.push({ id: uuidv4(), userId: req.user.id, title: '🆘 SOS Alert Sent', message: 'Emergency services notified. Stay safe!', read: false, createdAt: new Date() });
  res.json({ message: 'SOS alert sent', emergency: true });
});

/* ── GET /api/rides/:id ── */
router.get('/:id', auth, (req, res) => {
  const booking = db.bookings.find(b => b.id === req.params.id &&
    (req.user.role === 'captain' ? b.captainId === req.user.id : b.userId === req.user.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

module.exports = router;
