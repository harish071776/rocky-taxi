require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/rides',    require('./routes/rides'));
app.use('/api/captains', require('./routes/captains'));
app.use('/api/user',     require('./routes/user'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// All non-API routes → SPA
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n🏍️  Rocky Taxi v2 running → http://localhost:${PORT}`);
  console.log(`   Captain login demo phone: 9000011111  password: password123\n`);
});
