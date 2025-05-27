// Simple HTTP server for Railway health checks
const http = require('http');
const { spawn } = require('child_process');
const url = require('url');

// Track if the main application is running
let mainAppRunning = false;
let mainAppStartAttempted = false;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Parse the URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Handle GET requests to root path for health checks
  if (req.method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Leave Management API',
      timestamp: new Date().toISOString(),
      message: 'Health check server is running',
      mainAppRunning: mainAppRunning
    }));
    return;
  }
  
  // If the main app is not running and this is an API request, return a more helpful error
  if (!mainAppRunning && path.startsWith('/api')) {
    console.log(`Received API request to ${path} but main app is not running`);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'error',
      message: 'API server is starting up, please try again in a moment',
      path: path
    }));
    return;
  }
  
  // For all other requests, let the main application handle them
  // The main app should be running on a different port and handling these requests
  if (mainAppRunning) {
    // Just let the request pass through - the main app should be handling these
    // This works because we're not actually proxying, the main app is listening on the same port
    return;
  } else {
    // If main app is not running, return a 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'error',
      message: 'Not found or main application not running',
      path: path
    }));
  }
});

// Get port from environment variable or use 3000 as default
const port = process.env.PORT || 3000;

// Function to start the main application
const startMainApplication = () => {
  // Manually set DATABASE_URL if not already set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";
    console.log('DATABASE_URL has been manually set');
  }
  
  console.log('Attempting to start main application...');
  mainAppStartAttempted = true;
  
  try {
    // Import the main application
    require('./dist/server.js');
    mainAppRunning = true;
    console.log('Main application started successfully');
  } catch (error) {
    console.error('Error starting main application:', error);
    console.log('Continuing to run simple health check server');
    
    // Try to restart the main app after a delay
    setTimeout(() => {
      if (!mainAppRunning) {
        console.log('Attempting to restart main application...');
        startMainApplication();
      }
    }, 10000); // Try again after 10 seconds
  }
};

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Health check server running on port ${port}`);
  
  // Start the main application
  startMainApplication();
});