// Script to fix PostgreSQL connection issues on Railway
const { Client } = require('pg');

// Function to clean the DATABASE_URL
function cleanDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL is not set, nothing to clean');
    return;
  }

  console.log('Original DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 15) + '...');
  
  try {
    // Parse the URL
    const url = new URL(process.env.DATABASE_URL);
    
    // Remove any query parameters that might cause issues (like db_type)
    url.search = '';
    
    // Clean the database name part to remove any newline characters
    const pathParts = url.pathname.split('/');
    if (pathParts.length > 1) {
      // Get the database name and trim any whitespace including newlines
      const originalDbName = pathParts[1];
      const cleanDbName = originalDbName.trim();
      
      if (originalDbName !== cleanDbName) {
        console.log(`Fixed database name: "${originalDbName}" -> "${cleanDbName}"`);
        pathParts[1] = cleanDbName;
        url.pathname = pathParts.join('/');
      }
    }
    
    // Update the DATABASE_URL with the cleaned version
    if (url.toString() !== process.env.DATABASE_URL) {
      process.env.DATABASE_URL = url.toString();
      console.log('Cleaned DATABASE_URL. New URL starts with:', process.env.DATABASE_URL.substring(0, 15) + '...');
    } else {
      console.log('DATABASE_URL is already clean');
    }
  } catch (error) {
    console.error('Error cleaning DATABASE_URL:', error.message);
  }
}

async function fixPostgresConfig() {
  console.log('Starting PostgreSQL configuration fix...');
  
  // Clean the DATABASE_URL first
  cleanDatabaseUrl();
  
  // Get the DATABASE_URL from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    // Try to set a fallback URL
    if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD) {
      const pgHost = process.env.PGHOST;
      const pgPort = process.env.PGPORT || '5432';
      const pgDatabase = process.env.PGDATABASE.trim(); // Clean the database name
      const pgUser = process.env.PGUSER;
      const pgPassword = process.env.PGPASSWORD;
      
      process.env.DATABASE_URL = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
      console.log('Created DATABASE_URL from individual PostgreSQL environment variables');
    } else {
      // Last resort fallback
      process.env.DATABASE_URL = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@postgres.railway.internal:5432/railway";
      console.log('Using hardcoded fallback DATABASE_URL');
    }
  }
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected successfully');
    
    // Check for any custom parameters in the database
    console.log('Checking for custom parameters...');
    const result = await client.query(`
      SELECT name, setting
      FROM pg_settings
      WHERE name LIKE '%type%'
    `);
    
    console.log('Current PostgreSQL settings:');
    result.rows.forEach(row => {
      console.log(`${row.name}: ${row.setting}`);
    });
    
    // Check the current database name
    const dbResult = await client.query('SELECT current_database() as db_name');
    console.log(`Current database name: "${dbResult.rows[0].db_name}"`);
    
    console.log('PostgreSQL configuration check completed');
  } catch (error) {
    console.error('Error during PostgreSQL configuration check:', error);
    console.log('Continuing with application startup despite PostgreSQL check failure');
  } finally {
    try {
      await client.end();
    } catch (error) {
      console.error('Error closing PostgreSQL client:', error);
    }
  }
}

// Run the function
fixPostgresConfig().catch(err => {
  console.error('Unhandled error:', err);
  console.log('Continuing with application startup despite PostgreSQL check failure');
});