// Script to test database connection directly
require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  let connectionString;
  
  if (process.env.DATABASE_URL) {
    connectionString = process.env.DATABASE_URL;
    console.log('Using DATABASE_URL');
  } else if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD) {
    connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
    console.log('Using constructed connection string from PG* variables');
  } else {
    connectionString = `postgresql://${process.env.DB_USERNAME || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_DATABASE || 'leave_management'}`;
    console.log('Using constructed connection string from DB_* variables');
  }
  
  console.log('Connection string starts with:', connectionString.substring(0, 15) + '...');
  
  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('Successfully connected to the database!');
    const res = await client.query('SELECT current_database() as db_name');
    console.log('Connected to database:', res.rows[0].db_name);
    await client.end();
    return true;
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('Database connection test completed successfully');
    } else {
      console.log('Database connection test failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error during database connection test:', err);
    process.exit(1);
  });