// Script to check the DATABASE_URL environment variable
// This is used to verify the connection to Railway PostgreSQL

// Check if DATABASE_URL is set by Railway
if (!process.env.DATABASE_URL) {
  console.error('WARNING: DATABASE_URL is not set in the environment!');
  console.error('The application may not be able to connect to the database.');
  
  // Export an empty object - we don't want to set a default URL
  module.exports = {
    DATABASE_URL: null
  };
} else {
  console.log('DATABASE_URL is set in the environment. First 15 chars:', process.env.DATABASE_URL.substring(0, 15) + '...');
  
  // Export the URL for other modules to use
  module.exports = {
    DATABASE_URL: process.env.DATABASE_URL
  };
}