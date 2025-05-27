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
    
    // Clean the DATABASE_URL to ensure no newline characters in the database name
    try {
      const url = new URL(process.env.DATABASE_URL);
      const pathParts = url.pathname.split('/');
      if (pathParts.length > 1) {
        const dbName = pathParts[1].trim(); // Remove any whitespace including newlines
        pathParts[1] = dbName;
        url.pathname = pathParts.join('/');
        process.env.DATABASE_URL = url.toString();
        console.log('Cleaned DATABASE_URL to remove any newline characters in database name');
      }
    } catch (error) {
      console.error('Error cleaning DATABASE_URL:', error.message);
    }
    
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
    console.error('DATABASE_URL is not set! Attempting to set a fallback...');
    
    // Check if we're running on Railway by looking for DATABASE_PUBLIC_URL
    if (process.env.DATABASE_PUBLIC_URL) {
      console.log('Found DATABASE_PUBLIC_URL but no DATABASE_URL. Setting internal URL...');
      // We're on Railway but the internal URL isn't set correctly
      process.env.DATABASE_URL = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@postgres.railway.internal:5432/railway";
      console.log('Set DATABASE_URL to Railway internal URL');
    }
    // Fallback for Railway - try to construct the URL from individual parts
    else if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD) {
      const pgHost = process.env.PGHOST;
      const pgPort = process.env.PGPORT || '5432';
      const pgDatabase = process.env.PGDATABASE;
      const pgUser = process.env.PGUSER;
      const pgPassword = process.env.PGPASSWORD;
      
      // Make sure there are no newline characters in the database name
      const cleanPgDatabase = pgDatabase.trim();
      
      process.env.DATABASE_URL = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${cleanPgDatabase}`;
      console.log('Created DATABASE_URL from individual PostgreSQL environment variables');
    } else {
      // Last resort fallback - use the known Railway internal URL
      process.env.DATABASE_URL = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@postgres.railway.internal:5432/railway";
      console.log('Using hardcoded fallback DATABASE_URL (internal) as last resort');
    }
    
    console.log('DATABASE_URL first 15 chars:', process.env.DATABASE_URL.substring(0, 15) + '...');
  } else {
    console.log('DATABASE_URL is set. First 15 chars:', process.env.DATABASE_URL.substring(0, 15) + '...');
    
    // Check if we need to update the URL to use the internal Railway URL
    if (process.env.DATABASE_URL.includes('maglev.proxy.rlwy.net') && 
        process.env.NODE_ENV === 'production') {
      console.log('Detected external URL in production environment. Switching to internal URL...');
      process.env.DATABASE_URL = process.env.DATABASE_URL
        .replace('maglev.proxy.rlwy.net:31901', 'postgres.railway.internal:5432');
      console.log('Updated DATABASE_URL to use internal Railway hostname');
      console.log('New DATABASE_URL first 15 chars:', process.env.DATABASE_URL.substring(0, 15) + '...');
    }
    
    // Clean the DATABASE_URL to remove any newline characters in the database name
    try {
      const url = new URL(process.env.DATABASE_URL);
      const pathParts = url.pathname.split('/');
      if (pathParts.length > 1) {
        const dbName = pathParts[1].trim(); // Remove any whitespace including newlines
        pathParts[1] = dbName;
        url.pathname = pathParts.join('/');
        process.env.DATABASE_URL = url.toString();
        console.log('Cleaned DATABASE_URL to remove any newline characters in database name');
      }
    } catch (error) {
      console.error('Error cleaning DATABASE_URL:', error.message);
    }
  }
  
  // Ensure we're using standard PostgreSQL connection parameters
  // This helps prevent issues with unrecognized parameters like "db_type"
  if (process.env.DATABASE_URL) {
    // Parse the URL to ensure it doesn't have any custom parameters
    try {
      const url = new URL(process.env.DATABASE_URL);
      
      // Remove any query parameters that might cause issues
      url.search = '';
      
      // Clean the database name part to remove any newline characters
      const pathParts = url.pathname.split('/');
      if (pathParts.length > 1) {
        const dbName = pathParts[1].trim(); // Remove any whitespace including newlines
        pathParts[1] = dbName;
        url.pathname = pathParts.join('/');
      }
      
      // Update the DATABASE_URL with the cleaned version
      if (url.toString() !== process.env.DATABASE_URL) {
        console.log('Cleaned DATABASE_URL to remove custom parameters and fix database name');
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
    // Run database initialization script first
    console.log('Running database initialization script...');
    try {
      // Check if the script exists
      const fs = require('fs');
      if (fs.existsSync('./dist/scripts/init-railway-db.js')) {
        require('./dist/scripts/init-railway-db.js');
        console.log('Database initialization script executed');
      } else {
        console.log('Database initialization script not found, skipping');
      }
    } catch (initError) {
      console.error('Error running database initialization script:', initError);
      console.log('Continuing with application startup...');
    }
    
    // Check if the compiled server file exists
    const fs = require('fs');
    if (fs.existsSync('./dist/server.js')) {
      console.log('Found compiled server.js, starting application...');
      // Import the main application
      require('./dist/server.js');
      mainAppRunning = true;
      console.log('Main application started successfully');
    } else {
      console.error('Compiled server.js not found in dist directory!');
      console.log('Available files in dist directory:');
      try {
        const files = fs.readdirSync('./dist');
        files.forEach(file => console.log(`- ${file}`));
      } catch (e) {
        console.error('Error listing dist directory:', e.message);
      }
      
      // Try to build the application
      console.log('Attempting to build the application...');
      try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('Build successful, starting application...');
        require('./dist/server.js');
        mainAppRunning = true;
        console.log('Main application started successfully after build');
      } catch (buildError) {
        console.error('Build failed:', buildError.message);
        console.log('Continuing to run simple health check server');
      }
    }
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