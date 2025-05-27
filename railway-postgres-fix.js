// Script to fix PostgreSQL connection issues on Railway
const { Client } = require('pg');

async function fixPostgresConfig() {
  console.log('Starting PostgreSQL configuration fix...');
  
  // Get the DATABASE_URL from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString,
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
    
    // Reset any problematic parameters if needed
    // This is just a check - we're not modifying anything yet
    
    console.log('PostgreSQL configuration check completed');
  } catch (error) {
    console.error('Error during PostgreSQL configuration check:', error);
  } finally {
    await client.end();
  }
}

// Run the function
fixPostgresConfig().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});