require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const foundItemRoutes = require('./routes/foundItemRoutes');
const missingRoutes = require('./routes/missingRoutes');
const searchRoutes = require('./routes/searchRoutes');
const claimRoutes = require('./routes/claimRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const moderationRoutes = require('./routes/moderationRoutes');

const app = express();

// Middleware
const normalizeOrigin = origin => origin?.trim().replace(/\/$/, '');
const allowedOrigins = new Set([
  normalizeOrigin(process.env.CLIENT_URL || 'https://lost-link-beryl.vercel.app'),
  'http://localhost:5173'
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    // Requests without Origin are server-to-server, health checks, or same-origin.
    if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'LostLink API',
    university: 'Anurag University',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/found-items', foundItemRoutes);
app.use('/api/missing', missingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/conversations', chatRoutes); // Handles /api/conversations & messages
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/moderation', moderationRoutes);

// Global 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ message: `API Endpoint ${req.originalUrl} not found.` });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Do not accept API requests until the database is ready.
    await connectDB();

    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 LostLink Backend running on http://localhost:${PORT}`);
      console.log(`🎓 Anurag University Lost & Found Portal`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('Backend startup failed. Check MONGO_URI and MongoDB availability.');
    process.exit(1);
  }
};

startServer();
