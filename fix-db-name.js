// Script to fix the database name issue with newline character
const { Client } = require('pg');

// Use the connection string from your configuration
const connectionString = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";

async function fixDatabaseName() {
  console.log('Starting database name fix script...');
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connection successful!');

    // Check if we can access the database
    const result = await client.query('SELECT current_database() as db_name');
    console.log(`Current database name: "${result.rows[0].db_name}"`);
    
    // Check for any trailing characters in the database name
    const dbName = result.rows[0].db_name;
    if (dbName.includes('\n') || dbName.includes('\r')) {
      console.log('WARNING: Database name contains newline characters!');
      
      // This is just for diagnostic purposes - we can't actually rename the database this way
      console.log('Database name character codes:');
      for (let i = 0; i < dbName.length; i++) {
        console.log(`Character ${i}: '${dbName[i]}' (ASCII: ${dbName.charCodeAt(i)})`);
      }
      
      console.log('\nTo fix this issue, you need to:');
      console.log('1. Contact Railway support to fix the database name');
      console.log('2. Or create a new PostgreSQL instance in Railway');
    } else {
      console.log('Database name looks good - no newline characters detected.');
    }
    
    // Check if we can list tables
    console.log('\nAttempting to list tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Database tables:');
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the database!');
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
      console.log('\nDatabase tables are accessible - connection is working!');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Error details:', error);
    
    if (error.message.includes('database "railway\\n" does not exist')) {
      console.log('\nThis confirms the database name has a newline character issue.');
      console.log('Please create a new PostgreSQL instance in Railway or contact Railway support.');
    }
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

fixDatabaseName().catch(err => {
  console.error('Unhandled error:', err);
});