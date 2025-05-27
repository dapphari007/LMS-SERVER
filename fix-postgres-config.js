// Script to fix PostgreSQL configuration issues
// This script removes the "db_type" parameter from the connection string
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Function to update the DATABASE_URL in all environment files
function updateEnvFiles() {
  const envFiles = [
    '.env',
    '.env.railway',
    '.env.production'
  ];
  
  envFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace any DATABASE_URL that contains db_type parameter
        const regex = /(DATABASE_URL\s*=\s*[^?\n]+)(\?[^&\n]*db_type=[^&\n]*)/g;
        const updatedContent = content.replace(regex, '$1');
        
        if (content !== updatedContent) {
          fs.writeFileSync(filePath, updatedContent);
          console.log(`Updated ${file} to remove db_type parameter`);
        } else {
          console.log(`No db_type parameter found in ${file}`);
        }
      } catch (error) {
        console.error(`Error updating ${file}:`, error);
      }
    } else {
      console.log(`File ${file} does not exist, skipping`);
    }
  });
}

// Function to test the database connection
async function testDatabaseConnection() {
  console.log('\nTesting database connection...');
  
  // Use the external URL
  const connectionString = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000 // 10 second timeout
  });
  
  try {
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Get database information
    const dbResult = await client.query('SELECT current_database() as db_name');
    console.log(`Current database name: "${dbResult.rows[0].db_name}"`);
    
    console.log('Database connection test completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Main function
async function main() {
  console.log('Starting PostgreSQL configuration fix...');
  
  // Update environment files
  updateEnvFiles();
  
  // Test the database connection
  const connectionSuccessful = await testDatabaseConnection();
  
  if (connectionSuccessful) {
    console.log('\n✅ PostgreSQL configuration has been fixed successfully!');
    console.log('The "db_type" parameter has been removed from the connection string.');
    console.log('You should now be able to connect to the database without errors.');
  } else {
    console.log('\n❌ There are still issues with the PostgreSQL configuration.');
    console.log('Please check your connection string and database settings.');
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
});