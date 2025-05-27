// Direct database connection utility using pg
const { Client } = require('pg');
const logger = require('./logger').default;

// Load environment variables
require('dotenv').config();

// Get the connection string from environment variables
const getConnectionString = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Construct from individual parameters
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const username = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD || 'password';
  const database = process.env.DB_DATABASE || 'leave_management';
  
  return `postgresql://${username}:${password}@${host}:${port}/${database}`;
};

// Create a new client
const createClient = () => {
  const connectionString = getConnectionString();
  console.log('Connection string starts with:', connectionString.substring(0, 15) + '...');
  
  return new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
};

// Test the database connection
const testConnection = async () => {
  const client = createClient();
  
  try {
    console.log('Connecting to database directly...');
    await client.connect();
    console.log('Direct database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT current_database() as db_name');
    console.log('Connected to database:', result.rows[0].db_name);
    
    return true;
  } catch (error) {
    console.error('Direct database connection failed:', error.message);
    return false;
  } finally {
    await client.end();
  }
};

// Initialize the database schema if needed
const initializeSchema = async () => {
  const client = createClient();
  
  try {
    await client.connect();
    console.log('Connected to database for schema initialization');
    
    // Check if the users table exists
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    const usersTableExists = tableResult.rows[0].exists;
    console.log('Users table exists:', usersTableExists);
    
    if (!usersTableExists) {
      console.log('Creating essential tables...');
      
      // Create the migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL
        )
      `);
      
      // Create the users table with minimal fields
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'employee',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log('Essential tables created');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database schema:', error.message);
    return false;
  } finally {
    await client.end();
  }
};

module.exports = {
  testConnection,
  initializeSchema,
  createClient
};