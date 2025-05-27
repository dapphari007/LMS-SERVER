// CORS configuration for Railway deployment
const corsOptions = {
  origin: function(origin, callback) {
    // Define allowed origins
    const allowedOrigins = [
      'https://lms-client-production.up.railway.app',
      'https://lms-client-seven-azure.vercel.app'
    ];
    
    // Add origins from environment variables if they exist
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }
    
    if (process.env.CORS_ORIGIN) {
      allowedOrigins.push(process.env.CORS_ORIGIN);
    }
    
    if (process.env.ALLOWED_ORIGINS) {
      const origins = process.env.ALLOWED_ORIGINS.split(',');
      origins.forEach(o => allowedOrigins.push(o.trim()));
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      return callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

module.exports = corsOptions;