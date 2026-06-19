// Load .env from server/ directory regardless of where node is run from
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { getAIHealth } = require('./services/aiService');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.active === false) return next(new Error('Invalid user'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Health check — visit http://localhost:5001/api/health
app.get('/api/health', async (req, res) => {
  let python = { status: 'offline', fallbackAvailable: true };
  try {
    const health = await getAIHealth(700);
    python = { status: health.status, version: health.version, capabilities: health.capabilities };
  } catch {}
  res.json({
    status: 'ok',
    server: 'MediCare AI Backend v2.0',
    mongodb: mongoose.connection.readyState === 1 ? '✅ connected' : '❌ disconnected',
    mongoState: ['disconnected','connected','connecting','disconnecting'][mongoose.connection.readyState],
    pythonAnalysis: python,
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/patients',    require('./routes/patients'));
app.use('/api/vitals',      require('./routes/vitals'));
app.use('/api/reminders',   require('./routes/reminders'));
app.use('/api/chat',        require('./routes/chat'));
app.use('/api/scans',       require('./routes/scans'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/timeline',    require('./routes/timeline'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/ai',          require('./routes/ai'));
app.use('/api/labs',        require('./routes/labs'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/privacy',     require('./routes/privacy'));

// Connect MongoDB
// Validate MONGO_URI before connecting
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI || MONGO_URI.includes('REPLACE_USERNAME') || MONGO_URI.includes('REPLACE_PASSWORD')) {
  console.error('\n❌  MONGO_URI not configured in server/.env');
  console.error('    Open server/.env and replace REPLACE_USERNAME and REPLACE_PASSWORD');
  console.error('    See the instructions printed below:\n');
  printAtlasHelp();
}

function printAtlasHelp() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  HOW TO GET YOUR MONGODB ATLAS CONNECTION STRING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Go to: https://cloud.mongodb.com');
  console.log('  2. Click your cluster: medicare-ai');
  console.log('  3. Click the green [ Connect ] button');
  console.log('  4. Choose: Drivers → Node.js');
  console.log('  5. Copy the connection string shown');
  console.log('     It looks like:');
  console.log('     mongodb+srv://john:abc123@medicare-ai.xyz.mongodb.net/');
  console.log('  6. Open  server/.env  in a text editor');
  console.log('  7. Replace the MONGO_URI line with:');
  console.log('     MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASS@medicare-ai.XXXX.mongodb.net/medicare?retryWrites=true&w=majority');
  console.log('  8. Save .env and restart the server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  IMPORTANT — Two different passwords:');
  console.log('  • Atlas LOGIN email/password = to log into cloud.mongodb.com website');
  console.log('  • DATABASE USER password     = what goes inside the MONGO_URI string');
  console.log('  These are NOT the same!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('\n✅ MongoDB Atlas connected successfully!');
    console.log('   Database: medicare');
    console.log('   Now run: node seed.js  (to create demo accounts)\n');
  })
  .catch(err => {
    console.error('\n❌ MongoDB connection FAILED');
    console.error('   Error:', err.message, '\n');
    if (err.message.includes('Authentication failed') || err.message.includes('bad auth')) {
      console.error('   ⚠️  WRONG DATABASE PASSWORD');
      console.error('   The username or password in your MONGO_URI is incorrect.');
      console.error('   Fix: Atlas → Database Access → Edit user → Reset password');
      console.error('   Then update MONGO_URI in server/.env\n');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('   ⚠️  CLUSTER NOT FOUND');
      console.error('   The cluster hostname in your MONGO_URI is wrong.');
      console.error('   Fix: Copy the exact URI from Atlas → Connect button\n');
    } else if (err.message.includes('IP')) {
      console.error('   ⚠️  IP NOT WHITELISTED');
      console.error('   Your IP is not allowed in Atlas Network Access.');
      console.error('   Fix: Atlas → Network Access → Add IP → Allow from Anywhere (0.0.0.0/0)\n');
    } else if (err.message.includes('timed out') || err.message.includes('ETIMEDOUT')) {
      console.error('   ⚠️  CONNECTION TIMED OUT');
      console.error('   Your IP may not be whitelisted in Atlas.');
      console.error('   Fix: Atlas → Network Access → Add IP Address → Allow Access from Anywhere\n');
    }
    printAtlasHelp();
  });

// ─── REAL-TIME ICU SIMULATION ────────────────────────────
const ICU_PATIENTS = [
  { id: 'p1', name: 'Rajan Mehta',     age: 67, ward: 'ICU-1', bed: 'A1', condition: 'Post-MI',         avatar: '#0ea5e9' },
  { id: 'p2', name: 'Priya Sharma',    age: 42, ward: 'ICU-2', bed: 'A2', condition: 'Pneumonia',        avatar: '#8b5cf6' },
  { id: 'p3', name: 'Arjun Nair',      age: 75, ward: 'ICU-1', bed: 'A3', condition: 'Septic Shock',     avatar: '#ef4444' },
  { id: 'p4', name: 'Sunita Devi',     age: 55, ward: 'ICU-3', bed: 'B1', condition: 'COPD',             avatar: '#10b981' },
  { id: 'p5', name: 'Vikram Patel',    age: 61, ward: 'ICU-2', bed: 'B2', condition: 'Cardiac Arrest',   avatar: '#f59e0b' },
  { id: 'p6', name: 'Meera Krishnan',  age: 38, ward: 'ICU-4', bed: 'B3', condition: 'Anaphylaxis',      avatar: '#ec4899' },
  { id: 'p7', name: 'Sanjay Gupta',    age: 80, ward: 'ICU-1', bed: 'C1', condition: 'Stroke',           avatar: '#06b6d4' },
  { id: 'p8', name: 'Kavita Reddy',    age: 48, ward: 'ICU-3', bed: 'C2', condition: 'Renal Failure',    avatar: '#22c55e' },
  { id: 'p9', name: 'Rohit Kumar',     age: 29, ward: 'ICU-2', bed: 'C3', condition: 'Trauma ICU',       avatar: '#a855f7' },
  { id:'p10', name: 'Lakshmi Iyer',    age: 70, ward: 'ICU-4', bed: 'D1', condition: 'Diabetic Keto.',   avatar: '#f97316' },
  { id:'p11', name: 'Deepak Joshi',    age: 58, ward: 'ICU-1', bed: 'D2', condition: 'Heart Failure',    avatar: '#0891b2' },
  { id:'p12', name: 'Ananya Singh',    age: 33, ward: 'ICU-3', bed: 'D3', condition: 'Post-Op Care',     avatar: '#6366f1' },
];

const VITAL_RANGES = {
  p1:  { hr:[88,118], bp_s:[145,195], bp_d:[88,115], spo2:[86,95], temp:[37.5,39.2], rr:[20,28], glucose:[140,220] },
  p2:  { hr:[78,102], bp_s:[118,148], bp_d:[75,92],  spo2:[90,98], temp:[37.8,39.5], rr:[18,26], glucose:[95,145] },
  p3:  { hr:[105,145],bp_s:[80,105],  bp_d:[50,68],  spo2:[78,91], temp:[38.5,40.2], rr:[26,38], glucose:[180,290]},
  p4:  { hr:[82,110], bp_s:[132,168], bp_d:[82,102], spo2:[82,93], temp:[37.2,38.6], rr:[22,34], glucose:[110,175]},
  p5:  { hr:[45,68],  bp_s:[155,205], bp_d:[95,125], spo2:[88,96], temp:[36.8,38.0], rr:[14,20], glucose:[130,190]},
  p6:  { hr:[92,128], bp_s:[88,115],  bp_d:[55,75],  spo2:[91,97], temp:[37.0,38.2], rr:[16,24], glucose:[90,135] },
  p7:  { hr:[62,88],  bp_s:[165,210], bp_d:[98,128], spo2:[90,97], temp:[37.3,38.5], rr:[15,22], glucose:[155,225]},
  p8:  { hr:[72,96],  bp_s:[148,188], bp_d:[90,118], spo2:[91,98], temp:[37.0,38.3], rr:[16,23], glucose:[125,195]},
  p9:  { hr:[95,130], bp_s:[92,122],  bp_d:[62,82],  spo2:[88,96], temp:[37.4,38.8], rr:[18,28], glucose:[105,170]},
  p10: { hr:[98,125], bp_s:[118,152], bp_d:[72,94],  spo2:[89,96], temp:[37.8,39.0], rr:[22,32], glucose:[320,520]},
  p11: { hr:[55,82],  bp_s:[138,175], bp_d:[85,112], spo2:[88,95], temp:[36.9,37.8], rr:[18,26], glucose:[115,165]},
  p12: { hr:[70,90],  bp_s:[108,132], bp_d:[68,86],  spo2:[94,99], temp:[36.8,37.5], rr:[14,18], glucose:[88,125] },
};

function ri(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function genVitals(pid) {
  const r = VITAL_RANGES[pid];
  const bp_s = ri(r.bp_s[0], r.bp_s[1]);
  const bp_d = ri(r.bp_d[0], r.bp_d[1]);
  return {
    pid,
    hr:      ri(r.hr[0],   r.hr[1]),
    bp_s, bp_d,
    bp:      `${bp_s}/${bp_d}`,
    spo2:    ri(r.spo2[0], r.spo2[1]),
    temp:    (Math.random() * (r.temp[1] - r.temp[0]) + r.temp[0]).toFixed(1),
    rr:      ri(r.rr[0],   r.rr[1]),
    glucose: ri(r.glucose[0], r.glucose[1]),
    timestamp: Date.now(),
  };
}

// Broadcast vitals every 2 seconds to all connected doctor sockets
const vitalHistory = {};
ICU_PATIENTS.forEach(p => { vitalHistory[p.id] = []; });

setInterval(() => {
  const batch = ICU_PATIENTS.map(p => {
    const v = genVitals(p.id);
    vitalHistory[p.id].push(v);
    if (vitalHistory[p.id].length > 60) vitalHistory[p.id].shift();
    return { ...p, vitals: v };
  });
  io.to('doctors').emit('vitals:update', batch);
}, 2000);

// ─── WAR ROOM real-time events ──────────────────────────
const WAR_EVENTS = [
  { type: 'critical', msg: '🚨 Code Blue — ICU Bed A3 · Response team dispatched' },
  { type: 'warning',  msg: '⚠ Blood O− critically low (2 units) · Donation requested' },
  { type: 'critical', msg: '🚨 Trauma incoming ETA 8 min · MVA on Baner Road' },
  { type: 'info',     msg: 'ℹ OT-3 cleared and prepped for next procedure' },
  { type: 'success',  msg: '✓ Dr. Meera Pillai back on duty · Cardiology available' },
  { type: 'warning',  msg: '⚠ ICU at 92% capacity · Transfer stable patients' },
  { type: 'critical', msg: '🚨 Sepsis alert — Ward B Bed 12 · Antibiotics ordered' },
  { type: 'info',     msg: 'ℹ Shift handover 22:00 · Night team briefing in 15 min' },
  { type: 'success',  msg: '✓ Blood donation drive complete · +18 units collected' },
  { type: 'critical', msg: '🚨 STEMI alert — Cath lab activation · Dr. Rao en route' },
];
let warEventIdx = 0;
setInterval(() => {
  if (Math.random() < 0.4) {
    const event = { ...WAR_EVENTS[warEventIdx % WAR_EVENTS.length], time: new Date().toLocaleTimeString() };
    warEventIdx++;
    io.to('doctors').emit('war:alert', event);
  }
}, 3000);

// ─── Socket.IO connection handler ─────────────────────
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join:doctors', () => {
    if (!['doctor', 'admin'].includes(socket.user?.role)) {
      socket.emit('access:error', { error: 'Clinician/admin only' });
      return;
    }
    socket.join('doctors');
    // Send full patient list + current vitals snapshot
    const snapshot = ICU_PATIENTS.map(p => ({
      ...p,
      vitals: genVitals(p.id),
      history: vitalHistory[p.id].slice(-20),
    }));
    socket.emit('vitals:snapshot', snapshot);
    console.log(`Doctor joined room`);
  });
  socket.on('join:patient', (patientId) => {
    const ownId = String(socket.user?._id || '');
    if (socket.user?.role === 'patient' && String(patientId) !== ownId) {
      socket.emit('access:error', { error: 'Cannot join another patient room' });
      return;
    }
    socket.join(`patient:${patientId}`);
  });
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// Attach io to app for use in routes
app.set('io', io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 MediCare server running on port ${PORT}`));
