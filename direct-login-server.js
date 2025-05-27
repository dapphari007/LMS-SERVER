// Direct login server for handling authentication when the main app is not responding
const http = require('http');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const url = require('url');

// JWT secret for token generation
const JWT_SECRET = process.env.JWT_SECRET || 'harish123';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1d';

// Create a simple HTTP server
const server = http.createServer(async (req, res) => {
  // Log all incoming requests
  console.log(`Received ${req.method} request to ${req.url}`);
  
  // Set CORS headers - allow requests from any origin
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
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
      service: 'Leave Management API - Direct Login Server',
      timestamp: new Date().toISOString(),
      message: 'Direct login server is running'
    }));
    return;
  }
  
  // Handle login requests
  if (req.method === 'POST' && path === '/api/auth/login') {
    console.log('Processing login request');
    
    // Read the request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        // Parse the request body
        const { email, password } = JSON.parse(body);
        console.log(`Login attempt for email: ${email}`);
        
        if (!email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'error',
            message: 'Email and password are required'
          }));
          return;
        }
        
        // Connect to the database
        console.log('Connecting to database...');
        console.log('DATABASE_URL first 15 chars:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'not set');
        
        if (!process.env.DATABASE_URL) {
          console.error('DATABASE_URL is not set!');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'error',
            message: 'Database connection string is not configured'
          }));
          return;
        }
        
        const client = new Client({
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false
          },
          connectionTimeoutMillis: 10000 // 10 second timeout
        });
        
        try {
          await client.connect();
          console.log('Connected to database');
          
          // Query the user
          const userResult = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
          );
          
          if (userResult.rows.length === 0) {
            console.log(`User not found: ${email}`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              status: 'error',
              message: 'Invalid email or password'
            }));
            return;
          }
          
          const user = userResult.rows[0];
          console.log(`User found: ${user.email}, ID: ${user.id}`);
          
          // Check password
          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (!isPasswordValid) {
            console.log('Invalid password');
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              status: 'error',
              message: 'Invalid email or password'
            }));
            return;
          }
          
          // Get user role
          const roleResult = await client.query(
            'SELECT * FROM roles WHERE id = $1',
            [user.roleId]
          );
          
          const role = roleResult.rows.length > 0 ? roleResult.rows[0] : { name: 'unknown' };
          
          // Generate JWT token
          const token = jwt.sign(
            { 
              id: user.id,
              email: user.email,
              role: role.name,
              roleId: user.roleId
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
          );
          
          // Return success response
          console.log('Login successful');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'success',
            message: 'Login successful',
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: role.name,
              roleId: user.roleId,
              departmentId: user.departmentId,
              positionId: user.positionId,
              isActive: user.isActive
            }
          }));
        } catch (dbError) {
          console.error('Database error:', dbError);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'error',
            message: 'Database error',
            error: dbError.message
          }));
        } finally {
          await client.end();
          console.log('Database connection closed');
        }
      } catch (error) {
        console.error('Error processing login request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error',
          message: 'Internal server error',
          error: error.message
        }));
      }
    });
    
    return;
  }
  
  // For all other requests, return a 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'error',
    message: 'Not found',
    path: path
  }));
});

// Use a different port for the direct login server to avoid conflicts
const port = process.env.DIRECT_LOGIN_PORT || 3001;

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Direct login server running on port ${port}`);
  console.log('Environment variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL first 15 chars:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'not set');
  console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS || 'not set');
});