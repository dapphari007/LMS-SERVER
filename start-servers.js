// Script to start both the main server and the direct login server
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting both servers...');

// Start the main server
const mainServer = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '3000'
  }
});

mainServer.on('error', (err) => {
  console.error('Failed to start main server:', err);
});

// Start the direct login server
const directLoginServer = spawn('node', ['direct-login-server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DIRECT_LOGIN_PORT: process.env.DIRECT_LOGIN_PORT || '3001'
  }
});

directLoginServer.on('error', (err) => {
  console.error('Failed to start direct login server:', err);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  mainServer.kill();
  directLoginServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down servers...');
  mainServer.kill();
  directLoginServer.kill();
  process.exit(0);
});

// Keep the process running
console.log('Both servers started. Press Ctrl+C to stop.');