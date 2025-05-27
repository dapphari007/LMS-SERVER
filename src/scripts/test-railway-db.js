// Script to test the Railway PostgreSQL connection
// This can be run in the Railway environment to verify database connectivity

const { Client } = require('pg');

async function testRailwayDbConnection() {
  console.log('Testing Railway PostgreSQL connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    console.error('This script requires the DATABASE_URL to be set by Railway.');
    process.exit(1);
  }
  
  console.log('DATABASE_URL is set. First 15 chars:', process.env.DATABASE_URL.substring(0, 15) + '...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
  });
  
  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as time');
    console.log(`✅ Database server time: ${result.rows[0].time}`);
    
    // List tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Database tables:');
    if (tablesResult.rows.length === 0) {
      console.log('⚠️ No tables found in the database!');
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    // Check users table if it exists
    const userTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    if (userTableExists) {
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n👥 Number of users in database: ${usersResult.rows[0].count}`);
      
      // Sample a user
      const sampleUser = await client.query('SELECT id, email, "firstName", "lastName", role FROM users LIMIT 1');
      if (sampleUser.rows.length > 0) {
        console.log('\n👤 Sample user:');
        console.log(sampleUser.rows[0]);
      }
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

// Run the test
testRailwayDbConnection().catch(err => {
  console.error('Unhandled error in test script:', err);
  process.exit(1);
});