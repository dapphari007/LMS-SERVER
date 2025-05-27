// Script to fix PostgreSQL configuration issues
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function fixPostgresConfig() {
  console.log('Starting PostgreSQL configuration fix...');
  
  // Load environment variables
  require('dotenv').config();
  
  // Get the DATABASE_URL from environment
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  // Clean the connection string to remove any problematic parameters
  try {
    const url = new URL(connectionString);
    
    // Remove any query parameters that might cause issues
    url.search = '';
    
    // Update the connection string
    connectionString = url.toString();
    console.log('Using cleaned connection string');
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
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
    
    // Check if the database has the required extensions
    console.log('Checking for required extensions...');
    const extensions = await client.query(`
      SELECT extname FROM pg_extension
    `);
    
    console.log('Installed extensions:');
    extensions.rows.forEach(row => {
      console.log(`- ${row.extname}`);
    });
    
    // Check if uuid-ossp extension is installed
    const hasUuidOssp = extensions.rows.some(row => row.extname === 'uuid-ossp');
    if (!hasUuidOssp) {
      console.log('Installing uuid-ossp extension...');
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('uuid-ossp extension installed successfully');
      } catch (error) {
        console.error('Error installing uuid-ossp extension:', error);
      }
    } else {
      console.log('uuid-ossp extension is already installed');
    }
    
    console.log('PostgreSQL configuration check completed');
  } catch (error) {
    console.error('Error during PostgreSQL configuration check:', error);
  } finally {
    await client.end();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fixPostgresConfig().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { fixPostgresConfig };