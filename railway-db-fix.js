// Script to fix database connection issues in Railway
// This script can be run directly in the Railway environment

// Import required modules
const { Client } = require('pg');

// Function to diagnose and fix database connection issues
async function diagnoseAndFixDatabaseConnection() {
  console.log('Starting database connection diagnosis...');
  
  // Check environment variables
  console.log('\n--- Environment Variables ---');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 15) + '...');
  }
  
  console.log('POSTGRES_DB:', process.env.POSTGRES_DB);
  console.log('PGDATABASE:', process.env.PGDATABASE);
  console.log('PGHOST:', process.env.PGHOST);
  console.log('PGPORT:', process.env.PGPORT);
  console.log('PGUSER:', process.env.PGUSER);
  console.log('PGPASSWORD exists:', !!process.env.PGPASSWORD);
  
  // Try to fix the DATABASE_URL
  console.log('\n--- Fixing DATABASE_URL ---');
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.log('DATABASE_URL is not set, creating from components...');
    
    // Try to construct from individual parts
    if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD) {
      const host = process.env.PGHOST;
      const port = process.env.PGPORT || '5432';
      const database = (process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway').trim();
      const user = process.env.PGUSER;
      const password = process.env.PGPASSWORD;
      
      connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
      console.log('Created connection string from components');
    } else {
      // Fallback to known Railway URLs
      console.log('Using fallback connection string...');
      
      // Try internal URL first (for Railway environment)
      connectionString = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@postgres.railway.internal:5432/railway";
    }
  }
  
  // Clean the connection string
  try {
    console.log('Cleaning connection string...');
    const url = new URL(connectionString);
    
    // Remove any query parameters
    if (url.search) {
      console.log('Removing query parameters:', url.search);
      url.search = '';
    }
    
    // Fix the database name
    const pathParts = url.pathname.split('/');
    if (pathParts.length > 1) {
      const originalDbName = pathParts[1];
      const cleanDbName = originalDbName.trim();
      
      if (originalDbName !== cleanDbName) {
        console.log(`Fixing database name: "${originalDbName}" -> "${cleanDbName}"`);
        pathParts[1] = cleanDbName;
        url.pathname = pathParts.join('/');
      }
    }
    
    connectionString = url.toString();
    console.log('Cleaned connection string starts with:', connectionString.substring(0, 15) + '...');
  } catch (error) {
    console.error('Error cleaning connection string:', error.message);
  }
  
  // Try to connect with the fixed connection string
  console.log('\n--- Testing Connection ---');
  console.log('Attempting to connect to database...');
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000 // 10 second timeout
  });
  
  try {
    await client.connect();
    console.log('Connection successful!');
    
    // Get database information
    const dbResult = await client.query('SELECT current_database() as db_name');
    console.log(`Current database name: "${dbResult.rows[0].db_name}"`);
    
    // List tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nDatabase tables:');
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the database!');
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    // Update the environment variable with the fixed connection string
    if (connectionString !== process.env.DATABASE_URL) {
      console.log('\nUpdating DATABASE_URL environment variable...');
      process.env.DATABASE_URL = connectionString;
      console.log('DATABASE_URL updated successfully');
    }
    
    console.log('\nDatabase connection diagnosis completed successfully');
  } catch (error) {
    console.error('Connection failed:', error.message);
    console.error('Error details:', error);
    
    // Try alternative connection methods
    console.log('\n--- Trying Alternative Connection Methods ---');
    
    // Try external URL if internal failed
    if (connectionString.includes('railway.internal')) {
      console.log('Internal connection failed, trying external URL...');
      const externalUrl = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";
      
      const externalClient = new Client({
        connectionString: externalUrl,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 10000
      });
      
      try {
        await externalClient.connect();
        console.log('External connection successful!');
        process.env.DATABASE_URL = externalUrl;
        console.log('Updated DATABASE_URL to use external URL');
        await externalClient.end();
      } catch (externalError) {
        console.error('External connection also failed:', externalError.message);
      }
    }
  } finally {
    try {
      await client.end();
    } catch (error) {
      // Ignore errors when closing the client
    }
    console.log('Connection closed');
  }
}

// Run the diagnosis function
diagnoseAndFixDatabaseConnection().catch(err => {
  console.error('Unhandled error:', err);
});