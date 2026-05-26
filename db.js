const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const db = {
  users: [],
  captains: [],
  bookings: [],
  walletTransactions: [],
  captainEarningsTxns: [],
  ratings: [],
  promoCodes: [],
  notifications: [],
  supportTickets: [],
  liveLocations: {}   // bookingId -> { lat, lng, updatedAt, sharedByUser }
};

const pwd = bcrypt.hashSync('password123', 10);

db.users.push(
  { id: uuidv4(), name: 'Arjun Kumar',  email: 'arjun@example.com',  phone: '9876543210', password: pwd, walletBalance: 250, totalRides: 0, createdAt: new Date() },
  { id: uuidv4(), name: 'Priya Sharma', email: 'priya@example.com',  phone: '9123456789', password: pwd, walletBalance: 100, totalRides: 0, createdAt: new Date() }
);

db.captains.push(
  { id: uuidv4(), name: 'Ravi Verma',   phone: '9000011111', password: pwd, rating: 4.8, totalRides: 1240, vehicleNo: 'TN01AB1234', vehicleType: 'bike', status: 'available', earnings: 1240 * 45, location: { lat: 13.0827, lng: 80.2707 }, photo: '👨',   languages: ['Tamil','Hindi'],           experience: '3 years' },
  { id: uuidv4(), name: 'Suresh Babu',  phone: '9000022222', password: pwd, rating: 4.6, totalRides: 870,  vehicleNo: 'TN02CD5678', vehicleType: 'auto', status: 'available', earnings: 870  * 60, location: { lat: 13.0569, lng: 80.2425 }, photo: '👨‍🦱', languages: ['Tamil','English'],         experience: '2 years' },
  { id: uuidv4(), name: 'Karthik Raja', phone: '9000033333', password: pwd, rating: 4.9, totalRides: 2100, vehicleNo: 'TN03EF9012', vehicleType: 'bike', status: 'available', earnings: 2100 * 45, location: { lat: 13.0674, lng: 80.2376 }, photo: '🧑',   languages: ['Tamil'],                   experience: '5 years' },
  { id: uuidv4(), name: 'Meena Devi',   phone: '9000044444', password: pwd, rating: 4.7, totalRides: 540,  vehicleNo: 'TN04GH3456', vehicleType: 'auto', status: 'available', earnings: 540  * 60, location: { lat: 13.0712, lng: 80.2600 }, photo: '👩',   languages: ['Tamil','Telugu'],          experience: '1 year'  },
  { id: uuidv4(), name: 'Vijay Kumar',  phone: '9000055555', password: pwd, rating: 4.5, totalRides: 320,  vehicleNo: 'TN05IJ7890', vehicleType: 'cab',  status: 'available', earnings: 320  * 80, location: { lat: 13.0900, lng: 80.2800 }, photo: '👨‍🦲', languages: ['Tamil','English','Hindi'],  experience: '2 years' }
);

db.promoCodes.push(
  { code: 'ROCKY50', discount: 50,  type: 'flat',    minFare: 100, maxUses: 100, usedCount: 0, active: true, expiresAt: new Date('2027-12-31') },
  { code: 'FIRST25', discount: 25,  type: 'percent', minFare: 50,  maxUses: 500, usedCount: 0, active: true, expiresAt: new Date('2027-12-31') },
  { code: 'SPEED10', discount: 10,  type: 'flat',    minFare: 30,  maxUses: 500, usedCount: 0, active: true, expiresAt: new Date('2027-12-31') }
);

module.exports = db;
