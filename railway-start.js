// Railway-specific start script
console.log('Starting application with Railway-specific configuration...');

// Set the DATABASE_URL environment variable
process.env.DATABASE_URL = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";
process.env.NODE_ENV = "production";
process.env.HOST = "0.0.0.0";

console.log('Environment variables set:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- HOST:', process.env.HOST);
console.log('- PORT:', process.env.PORT || '3000 (default)');

// Start the application
require('./dist/server.js');