// Simple script to test database connection
const { Client } = require('pg');

// Use the connection string from your configuration
const connectionString = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";

async function testConnection() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('Connection successful!');

    // Test a simple query
    const result = await client.query('SELECT NOW() as time');
    console.log(`Database server time: ${result.rows[0].time}`);

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

    // Check users table if it exists
    const userTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    if (userTableExists) {
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`\nNumber of users in database: ${usersResult.rows[0].count}`);
      
      // Sample a user
      const sampleUser = await client.query('SELECT id, email, "firstName", "lastName", role FROM users LIMIT 1');
      if (sampleUser.rows.length > 0) {
        console.log('\nSample user:');
        console.log(sampleUser.rows[0]);
      }
    }

  } catch (error) {
    console.error('Connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

testConnection();