const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

/* -------------------- Middleware -------------------- */

// Parse cookies
app.use(cookieParser());

// CORS configuration (IMPORTANT FOR COOKIES)
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  credentials: true, // 👈 REQUIRED for HttpOnly cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle preflight requests
app.options("*", cors());

// Parse JSON body
app.use(express.json());

/* -------------------- MongoDB -------------------- */

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/* -------------------- Routes -------------------- */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

/* -------------------- Health Check -------------------- */

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

/* -------------------- Server -------------------- */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
