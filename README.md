# 🏍️ Rocky Taxi v2.0 — Full Stack App

A feature-rich bike taxi web application inspired by Rapido, with frontend and backend in one folder.

---

## 📁 Project Structure

```
rocky-taxi/
├── middleware/
│   └── auth.js            # JWT auth middleware
├── routes/
│   ├── auth.js            # Register & login
│   ├── rides.js           # Book, estimate, history, cancel, rate, SOS
│   ├── captains.js        # List captains
│   └── user.js            # Profile, wallet, notifications, support, stats
├── public/
│   └── index.html         # Full SPA frontend (all features)
├── db.js                  # In-memory DB with seed data
├── server.js              # Express server entry point
├── .env                   # Environment variables
├── package.json
└── README.md
```

---

## 🚀 Setup & Run

```bash
npm install
npm start       # production
npm run dev     # development (auto-reload)
```

Open: **http://localhost:5000**

---

## 🔑 Demo Credentials

| Email | Password |
|-------|----------|
| arjun@example.com | password123 |
| priya@example.com | password123 |

Or register a new account — you get ₹50 wallet bonus!

---

## 🎟️ Promo Codes (for testing)

| Code | Discount |
|------|----------|
| ROCKY50 | ₹50 flat off (min ₹100) |
| FIRST25 | 25% off first ride |
| SPEED10 | ₹10 flat off (min ₹30) |

---

## ✨ New Features in v2.0

### 🚗 Multiple Ride Types
- **Bike** — ₹20 base + ₹7/km, 1 passenger
- **Auto** — ₹30 base + ₹10/km, 3 passengers
- **Cab** — ₹50 base + ₹14/km, 4 passengers

### 💳 Rocky Wallet
- Top up with quick amounts or custom amount
- Pay rides directly from wallet
- 5% cashback on all cash rides (auto-credited)
- Full transaction history

### 🎟️ Promo Codes
- Flat and percentage discount codes
- Code validation before booking
- Discount shown in estimate breakdown

### ⭐ Ride Ratings
- Rate captains after every completed ride (1–5 stars)
- Optional comment
- Rating auto-triggers after ride completes

### 🔔 Notifications
- Real-time ride updates (confirmed, in-progress, completed)
- Wallet credit/debit alerts
- Unread badge in nav and sidebar
- Mark all read

### 🆘 SOS Button
- Available during active rides
- Alerts emergency services with location

### 📊 User Stats
- Total rides, amount spent, km covered, wallet balance
- Displayed on home dashboard

### 🧑 Enhanced Captain Profiles
- Vehicle type, languages spoken, experience
- Filter captains by bike/auto/cab

### 💬 Help & Support
- Raise support tickets
- FAQ accordion
- Contact info

### 🏠 Sidebar Navigation
- Home with quick book widget
- Dedicated sections for all features
- Mobile bottom navigation bar

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register + ₹50 wallet bonus |
| POST | /api/auth/login | Login |

### Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/rides/estimate | Multi-vehicle fare estimate |
| POST | /api/rides/validate-promo | Validate promo code |
| POST | /api/rides/book | Book ride (with promo + wallet) |
| GET | /api/rides/history | Ride history |
| GET | /api/rides/:id | Single booking |
| POST | /api/rides/:id/cancel | Cancel ride (refunds wallet) |
| POST | /api/rides/:id/rate | Rate a completed ride |
| POST | /api/rides/:id/sos | Trigger SOS alert |

### Captains
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/captains | All captains |
| GET | /api/captains/available | Available captains (filter: ?vehicleType=bike) |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/user/profile | Get profile |
| PUT | /api/user/profile | Update profile |
| GET | /api/user/wallet | Wallet balance + transactions |
| POST | /api/user/wallet/topup | Add money to wallet |
| GET | /api/user/notifications | All notifications |
| PUT | /api/user/notifications/read | Mark all read |
| POST | /api/user/support | Submit support ticket |
| GET | /api/user/stats | Ride stats |
