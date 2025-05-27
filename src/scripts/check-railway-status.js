// Script to check Railway connection status
const { Client } = require('pg');
const os = require('os');
const fs = require('fs');
const path = require('path');

async function checkRailwayStatus() {
  console.log('=== Railway Connection Status Check ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  console.log('Hostname:', os.hostname());
  
  // Load environment variables
  try {
    require('dotenv').config();
  } catch (error) {
    console.log('Error loading dotenv:', error.message);
  }
  
  // Check environment variables
  console.log('\n--- Environment Variables ---');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
  console.log('PORT:', process.env.PORT || 'Not set');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set');
  console.log('PGSSLMODE:', process.env.PGSSLMODE || 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    return;
  }
  
  console.log('\n--- Database Connection Test ---');
  console.log('Connection string starts with:', process.env.DATABASE_URL.substring(0, 15) + '...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    // Set a shorter connection timeout
    connectionTimeoutMillis: 5000
  });
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    
    const startTime = Date.now();
    await client.connect();
    const connectTime = Date.now() - startTime;
    
    console.log(`Connected successfully in ${connectTime}ms`);
    
    // Test a simple query
    console.log('Testing query execution...');
    const queryStartTime = Date.now();
    const result = await client.query('SELECT NOW() as time, current_database() as db_name, version() as pg_version');
    const queryTime = Date.now() - queryStartTime;
    
    console.log(`Query executed in ${queryTime}ms`);
    console.log('Database time:', result.rows[0].time);
    console.log('Database name:', result.rows[0].db_name);
    console.log('PostgreSQL version:', result.rows[0].pg_version);
    
    // Test a more complex query to check if tables exist
    console.log('\nChecking database tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tablesResult.rows.length} tables in database:`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Check connection info
    console.log('\nConnection information:');
    const connInfo = await client.query(`
      SELECT 
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        pg_backend_pid() as backend_pid
    `);
    
    if (connInfo.rows.length > 0) {
      console.log('Server IP:', connInfo.rows[0].server_ip);
      console.log('Server Port:', connInfo.rows[0].server_port);
      console.log('Backend PID:', connInfo.rows[0].backend_pid);
    }
    
    console.log('\nRailway connection status check completed successfully');
  } catch (error) {
    console.error('Error during database connection test:', error);
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
  checkRailwayStatus().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { checkRailwayStatus };