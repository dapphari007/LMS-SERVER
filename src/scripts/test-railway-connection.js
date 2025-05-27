// Script to test database connection on Railway
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function testDatabaseConnection() {
  console.log('Starting database connection test...');
  
  // Load environment variables
  require('dotenv').config();
  
  // Get the DATABASE_URL from environment
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('Connection string starts with:', connectionString.substring(0, 15) + '...');
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // Set a shorter connection timeout
    connectionTimeoutMillis: 5000
  });
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    console.log('Timestamp:', new Date().toISOString());
    
    const startTime = Date.now();
    await client.connect();
    const connectTime = Date.now() - startTime;
    
    console.log(`Connected successfully in ${connectTime}ms`);
    
    // Test a simple query
    console.log('Testing query execution...');
    const queryStartTime = Date.now();
    const result = await client.query('SELECT NOW() as time');
    const queryTime = Date.now() - queryStartTime;
    
    console.log(`Query executed in ${queryTime}ms`);
    console.log('Database time:', result.rows[0].time);
    
    // Test a more complex query to check if tables exist
    console.log('Checking database tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Database tables:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Check if users table exists and has data
    if (tablesResult.rows.some(row => row.table_name === 'users')) {
      console.log('Testing users table...');
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`Users table contains ${usersResult.rows[0].count} records`);
      
      // Check a sample user (without exposing sensitive data)
      if (parseInt(usersResult.rows[0].count) > 0) {
        const sampleUser = await client.query(`
          SELECT id, email, role, "isActive"
          FROM users
          LIMIT 1
        `);
        
        if (sampleUser.rows.length > 0) {
          console.log('Sample user found:');
          console.log('- ID:', sampleUser.rows[0].id);
          console.log('- Email:', sampleUser.rows[0].email);
          console.log('- Role:', sampleUser.rows[0].role);
          console.log('- Active:', sampleUser.rows[0].isActive);
        }
      }
    }
    
    console.log('Database connection test completed successfully');
  } catch (error) {
    console.error('Error during database connection test:', error);
    process.exit(1);
  } finally {
    try {
      await client.end();
      console.log('Database connection closed');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  testDatabaseConnection().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { testDatabaseConnection };