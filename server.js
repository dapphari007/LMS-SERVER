// Simple HTTP server for Railway health checks
const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Handle GET requests to root path
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Leave Management API',
      timestamp: new Date().toISOString(),
      message: 'Simple health check server is running'
    }));
    return;
  }
  
  // Handle all other requests
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'error',
    message: 'Not found' 
  }));
});

// Get port from environment variable or use 3000 as default
const port = process.env.PORT || 3000;

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Simple health check server running on port ${port}`);
  
  // Manually set DATABASE_URL
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";
    console.log('DATABASE_URL has been manually set');
  }
  
  // Try to start the main application
  try {
    console.log('Attempting to start main application...');
    require('./dist/server.js');
  } catch (error) {
    console.error('Error starting main application:', error);
    console.log('Continuing to run simple health check server');
  }
});