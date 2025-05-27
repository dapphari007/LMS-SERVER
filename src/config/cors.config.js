// CORS configuration for Railway deployment
const corsOptions = {
  origin: process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'https://your-client-app-name.up.railway.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

module.exports = corsOptions;