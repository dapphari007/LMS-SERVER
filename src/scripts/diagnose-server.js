// Script to diagnose server issues
const { testDatabaseConnection } = require('./test-railway-connection');
const { checkApiRoutes } = require('./check-api-routes');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function diagnoseServer() {
  console.log('Starting server diagnosis...');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  
  // Check environment variables
  console.log('\n--- Environment Variables ---');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
  console.log('PORT:', process.env.PORT || 'Not set');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set');
  
  // Check if the server is running
  console.log('\n--- Server Status ---');
  try {
    const port = process.env.PORT || 3000;
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/`);
    console.log(`Server is running on port ${port}, status code: ${result.toString()}`);
  } catch (error) {
    console.log(`Server does not appear to be running: ${error.message}`);
  }
  
  // Check database connection
  console.log('\n--- Database Connection ---');
  try {
    await testDatabaseConnection();
  } catch (error) {
    console.error('Database connection test failed:', error);
  }
  
  // Check API routes
  console.log('\n--- API Routes ---');
  try {
    await checkApiRoutes();
  } catch (error) {
    console.error('API routes check failed:', error);
  }
  
  // Check for common issues
  console.log('\n--- Common Issues Check ---');
  
  // Check if the dist directory exists
  const distDir = path.join(__dirname, '..', '..');
  if (!fs.existsSync(path.join(distDir, 'dist'))) {
    console.error('dist directory not found. The project may not be built.');
  } else {
    console.log('dist directory found.');
    
    // Check if server.js exists in dist
    if (!fs.existsSync(path.join(distDir, 'dist', 'server.js'))) {
      console.error('dist/server.js not found. The project may not be built correctly.');
    } else {
      console.log('dist/server.js found.');
    }
  }
  
  // Check if node_modules exists
  if (!fs.existsSync(path.join(distDir, 'node_modules'))) {
    console.error('node_modules directory not found. Dependencies may not be installed.');
  } else {
    console.log('node_modules directory found.');
  }
  
  console.log('\nServer diagnosis completed');
}

// Run the function if this script is executed directly
if (require.main === module) {
  diagnoseServer().catch(err => {
    console.error('Unhandled error during diagnosis:', err);
    process.exit(1);
  });
}

module.exports = { diagnoseServer };