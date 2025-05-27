// Script to fix Railway database connection issues
const fs = require('fs');
const path = require('path');

// Function to update the .env.railway file
function updateEnvRailway() {
  const envPath = path.join(__dirname, '.env.railway');
  
  try {
    // Read the current file
    let content = fs.readFileSync(envPath, 'utf8');
    
    // Add explicit DATABASE_URL with correct format
    if (!content.includes('DATABASE_URL=')) {
      content += '\n# Explicitly set DATABASE_URL without db_type parameter\n';
      content += 'DATABASE_URL=postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway\n';
      console.log('Added explicit DATABASE_URL to .env.railway');
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(envPath, content);
    console.log('.env.railway updated successfully');
  } catch (error) {
    console.error('Error updating .env.railway:', error);
  }
}

// Function to update the railway.toml file
function updateRailwayToml() {
  const tomlPath = path.join(__dirname, 'railway.toml');
  
  try {
    if (fs.existsSync(tomlPath)) {
      // Read the current file
      let content = fs.readFileSync(tomlPath, 'utf8');
      
      // Remove any db_type parameter if it exists
      content = content.replace(/db_type\s*=\s*["'].*["']/g, '');
      
      // Write the updated content back to the file
      fs.writeFileSync(tomlPath, content);
      console.log('railway.toml updated successfully');
    } else {
      console.log('railway.toml does not exist, no update needed');
    }
  } catch (error) {
    console.error('Error updating railway.toml:', error);
  }
}

// Function to update the direct-db-connect.js file
function updateDirectDbConnect() {
  const filePath = path.join(__dirname, 'direct-db-connect.js');
  
  try {
    // Read the current file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update the DB_NAME to ensure it doesn't have a newline character
    content = content.replace(/const DB_NAME = ['"]railway.*['"]/g, 'const DB_NAME = \'railway\'');
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content);
    console.log('direct-db-connect.js updated successfully');
  } catch (error) {
    console.error('Error updating direct-db-connect.js:', error);
  }
}

// Function to update the test-db-connection.js file
function updateTestDbConnection() {
  const filePath = path.join(__dirname, 'test-db-connection.js');
  
  try {
    // Read the current file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Ensure the connection string doesn't have db_type parameter
    if (content.includes('db_type')) {
      content = content.replace(/connectionString = .*/, 'connectionString = "postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway";');
      console.log('Removed db_type parameter from test-db-connection.js');
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content);
    console.log('test-db-connection.js updated successfully');
  } catch (error) {
    console.error('Error updating test-db-connection.js:', error);
  }
}

// Run all the update functions
updateEnvRailway();
updateRailwayToml();
updateDirectDbConnect();
updateTestDbConnection();

console.log('All files updated successfully. Please redeploy your application to Railway.');