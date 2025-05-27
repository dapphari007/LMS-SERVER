// Script to manually set the DATABASE_URL environment variable
// This is a workaround for Railway deployment issues

// The connection string provided by the user
const railwayDbUrl = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";

// Always set the DATABASE_URL environment variable regardless of environment
// This ensures consistent database connection across all environments
process.env.DATABASE_URL = railwayDbUrl;
console.log('DATABASE_URL has been manually set to:', railwayDbUrl.substring(0, 15) + '...');

// Export the URL for other modules to use
module.exports = {
  DATABASE_URL: railwayDbUrl
};