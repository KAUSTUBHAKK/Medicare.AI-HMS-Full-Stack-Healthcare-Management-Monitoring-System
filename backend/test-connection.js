/**
 * MEDICARE AI — Connection Diagnostic
 * Run: node test-connection.js
 * Checks MongoDB, env vars, and port availability
 */
require('dotenv').config();
const mongoose = require('mongoose');
const net = require('net');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicare';
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET;

async function checkPort(port) {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.listen(port, () => { srv.close(); resolve(true); });
    srv.on('error', () => resolve(false));
  });
}

async function run() {
  console.log('\n🔍 MediCare AI — Connection Diagnostic');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Check .env
  console.log('📋 Environment Variables:');
  console.log(`   MONGO_URI:   ${MONGO_URI}`);
  console.log(`   PORT:        ${PORT}`);
  console.log(`   JWT_SECRET:  ${JWT_SECRET ? '✅ Set' : '❌ NOT SET — add to server/.env'}\n`);

  // 2. Check port availability
  const portFree = await checkPort(PORT);
  console.log(`🔌 Port ${PORT}: ${portFree ? '✅ Available' : '❌ Already in use — change PORT in .env'}`);

  // 3. Check MongoDB
  console.log(`\n📡 Testing MongoDB connection: ${MONGO_URI}`);
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 });
    console.log('✅ MongoDB connection: SUCCESS\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`   Database: ${db.databaseName}`);
    console.log(`   Collections: ${collections.length === 0 ? '(empty — will be created on first use)' : collections.map(c=>c.name).join(', ')}`);
    await mongoose.disconnect();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Everything looks good!');
    console.log('\nNext steps:');
    console.log('  1. Run: node seed.js           (create demo accounts)');
    console.log('  2. Run: npm run dev            (start the full app)');
    console.log('  3. Open: http://localhost:3000\n');

  } catch (err) {
    console.error(`❌ MongoDB connection FAILED: ${err.message}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛠  FIXES:\n');
    if (MONGO_URI.includes('localhost')) {
      console.log('  Local MongoDB:');
      console.log('  → Install: https://www.mongodb.com/try/download/community');
      console.log('  → Windows: Start "MongoDB" service in Services panel');
      console.log('  → Mac:     brew services start mongodb-community');
      console.log('  → Linux:   sudo systemctl start mongod\n');
    }
    console.log('  OR use MongoDB Atlas (free cloud, no install):');
    console.log('  → https://www.mongodb.com/atlas/database');
    console.log('  → Create free cluster → Connect → Copy URI');
    console.log('  → Paste in server/.env as MONGO_URI=<your-uri>\n');
  }
}

run();
