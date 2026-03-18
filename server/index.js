const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env FIRST before anything else
dotenv.config();

// ── Startup checks ─────────────────────────────
console.log('\n🔍 Checking environment variables...');
const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  console.error('👉 Copy server/.env.example to server/.env and fill in the values');
  process.exit(1);
}

if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('XXXX')) {
  console.warn('⚠️  RAZORPAY_KEY_ID not set — payment features will not work');
  console.warn('   Get keys from: https://dashboard.razorpay.com → Settings → API Keys');
} else {
  console.log('✅ Razorpay Key ID:', process.env.RAZORPAY_KEY_ID);
}

if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes('XXXX')) {
  console.warn('⚠️  RAZORPAY_KEY_SECRET not set — payment features will not work');
} else {
  console.log('✅ Razorpay Key Secret: [hidden, loaded OK]');
}
console.log('─────────────────────────────────────────\n');
// ───────────────────────────────────────────────

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'https://vaultsave.vercel.app',
  credentials: true,
}));
app.use(express.json());




// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/payment', require('./routes/payment'));

// Health check — also shows config status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'VaultSave API is running 🔐',
    razorpay: process.env.RAZORPAY_KEY_ID ? '✅ configured' : '❌ missing keys',
    mongo: mongoose.connection.readyState === 1 ? '✅ connected' : '❌ disconnected',
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health\n`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
