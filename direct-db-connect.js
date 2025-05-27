// Direct database connection script for Railway
// This bypasses TypeORM and connects directly to PostgreSQL

const { Client } = require('pg');

// Direct connection parameters
const DB_HOST = 'postgres.railway.internal';
const DB_PORT = '5432';
const DB_NAME = 'railway';
const DB_USER = 'postgres';
const DB_PASSWORD = 'DDzRHavWnatSRwZKlrPRQQfphjKRHEna';

async function connectDirectly() {
  console.log('Attempting direct connection to PostgreSQL database...');
  
  // Create connection string
  const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  console.log('Connection string first 15 chars:', connectionString.substring(0, 15) + '...');
  
  // Create client
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Direct connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as time');
    console.log(`Database time: ${result.rows[0].time}`);
    
    // List tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nDatabase tables:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Check for workflow_categories table
    const workflowCategoriesExists = tablesResult.rows.some(row => 
      row.table_name === 'workflow_categories');
    
    if (workflowCategoriesExists) {
      console.log('\nChecking workflow_categories table:');
      const categoriesResult = await client.query('SELECT * FROM workflow_categories LIMIT 5');
      console.log(`Found ${categoriesResult.rows.length} categories`);
      if (categoriesResult.rows.length > 0) {
        console.log('Sample category:', categoriesResult.rows[0]);
      }
      
      // Check columns
      const columnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'workflow_categories'
        ORDER BY ordinal_position
      `);
      
      console.log('\nworkflow_categories columns:');
      columnsResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.column_name} (${row.data_type})`);
      });
      
      // Check if maxSteps column exists
      const maxStepsExists = columnsResult.rows.some(row => 
        row.column_name === 'maxSteps');
      
      console.log(`maxSteps column exists: ${maxStepsExists}`);
    }
    
    console.log('\nDirect database connection test completed successfully!');
  } catch (error) {
    console.error('❌ Direct connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

// Run the test
connectDirectly().catch(err => {
  console.error('Unhandled error:', err);
});