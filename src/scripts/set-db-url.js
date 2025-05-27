// Script to check and set the DATABASE_URL environment variable
// This is used to verify the connection to Railway PostgreSQL

// Check if we're running in Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'true' || 
                 process.env.RAILWAY_STATIC_URL || 
                 process.env.RAILWAY_SERVICE_ID;

// Determine which DATABASE_URL to use
let databaseUrl;

// Try internal connection first (preferred for Railway)
if (isRailway && process.env.PGHOST === 'postgres.railway.internal') {
  databaseUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  console.log('Using internal Railway database connection');
} else if (process.env.DATABASE_URL) {
  databaseUrl = process.env.DATABASE_URL;
  console.log('Using DATABASE_URL from environment');
} else if (process.env.DATABASE_PUBLIC_URL) {
  databaseUrl = process.env.DATABASE_PUBLIC_URL;
  console.log('Using DATABASE_PUBLIC_URL from environment');
} else {
  console.error('WARNING: DATABASE_URL is not set in the environment!');
  console.error('The application may not be able to connect to the database.');
  
  // Try to construct a URL from individual environment variables
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    databaseUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE}`;
    console.log('Constructed DATABASE_URL from individual environment variables');
  } else {
    databaseUrl = null;
  }
}

if (databaseUrl) {
  // Set the DATABASE_URL environment variable
  process.env.DATABASE_URL = databaseUrl;
  console.log('DATABASE_URL has been set. First 15 chars:', databaseUrl.substring(0, 15) + '...');
}

// Export the URL for other modules to use
module.exports = {
  DATABASE_URL: databaseUrl
};