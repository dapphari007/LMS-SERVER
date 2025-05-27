// Simple HTTP server for Railway health checks
const http = require('http');
const { spawn } = require('child_process');
const url = require('url');
const { execSync } = require('child_process');

// Track if the main application is running
let mainAppRunning = false;
let mainAppStartAttempted = false;
let dbConnectionAttempts = 0;
const MAX_DB_CONNECTION_ATTEMPTS = 5;

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

// Function to test database connection
const testDatabaseConnection = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set, cannot test database connection');
    return false;
  }
  
  try {
    // Use a simple pg client to test the connection
    const { Client } = require('pg');
    
    console.log('Database URL starts with:', process.env.DATABASE_URL.substring(0, 15) + '...');
    console.log('Attempting to connect to PostgreSQL database...');
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000 // 5 second timeout
    });
    
    console.log('Testing database connection...');
    await client.connect();
    
    // Run a simple query to verify the connection
    const result = await client.query('SELECT NOW() as time');
    console.log(`Database connection successful, server time: ${result.rows[0].time}`);
    
    // Check database tables
    console.log('Checking database tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Database tables:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    await client.end();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
};

// Function to start the main application
const startMainApplication = async () => {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set! This is required for the application to work.');
    console.error('Please make sure the DATABASE_URL environment variable is set in Railway.');
    // Don't set a default here - we want to fail if it's not properly set
  } else {
    console.log('DATABASE_URL is set. First 15 chars:', process.env.DATABASE_URL.substring(0, 15) + '...');
  }
  
  // Ensure we're using standard PostgreSQL connection parameters
  // This helps prevent issues with unrecognized parameters like "db_type"
  if (process.env.DATABASE_URL) {
    // Parse the URL to ensure it doesn't have any custom parameters
    try {
      const url = new URL(process.env.DATABASE_URL);
      
      // Remove any query parameters that might cause issues
      url.search = '';
      
      // Update the DATABASE_URL with the cleaned version
      if (url.toString() !== process.env.DATABASE_URL) {
        console.log('Cleaned DATABASE_URL to remove custom parameters');
        process.env.DATABASE_URL = url.toString();
      }
    } catch (error) {
      console.error('Error parsing DATABASE_URL:', error);
    }
  }
  
  console.log('Attempting to start main application...');
  mainAppStartAttempted = true;
  
  // Test database connection before starting the application
  dbConnectionAttempts++;
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.log(`Database connection failed (attempt ${dbConnectionAttempts} of ${MAX_DB_CONNECTION_ATTEMPTS})`);
    
    if (dbConnectionAttempts < MAX_DB_CONNECTION_ATTEMPTS) {
      console.log(`Retrying in ${dbConnectionAttempts * 2} seconds...`);
      setTimeout(() => {
        startMainApplication();
      }, dbConnectionAttempts * 2000); // Increase delay with each attempt
      return;
    } else {
      console.error('Maximum database connection attempts reached. Starting application anyway...');
    }
  } else {
    console.log('Database connection successful, starting application...');
  }
  
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
        dbConnectionAttempts = 0; // Reset connection attempts
        startMainApplication();
      }
    }, 10000); // Try again after 10 seconds
  }
};

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Health check server running on port ${port}`);
  
  // Start the main application
  startMainApplication().catch(err => {
    console.error('Error in startMainApplication:', err);
  });
});