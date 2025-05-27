// Script to manually set the DATABASE_URL environment variable
// This is a workaround for Railway deployment issues

// The connection string provided by the user
const railwayDbUrl = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";

// Set the environment variable
process.env.DATABASE_URL = railwayDbUrl;

console.log('DATABASE_URL has been manually set to:', railwayDbUrl.substring(0, 15) + '...');

// Export the URL for other modules to use
module.exports = {
  DATABASE_URL: railwayDbUrl
};