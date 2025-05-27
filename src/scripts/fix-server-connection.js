// Script to fix server connection issues
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function fixServerConnection() {
  console.log('Starting server connection fix...');
  console.log('Timestamp:', new Date().toISOString());
  
  // Check if the server is running
  let serverRunning = false;
  try {
    const port = process.env.PORT || 3000;
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/`);
    console.log(`Server is running on port ${port}, status code: ${result.toString()}`);
    serverRunning = true;
  } catch (error) {
    console.log(`Server does not appear to be running: ${error.message}`);
  }
  
  // If the server is running, restart it
  if (serverRunning) {
    console.log('Restarting server...');
    try {
      // This is a simplified approach - in a real environment, you'd use proper process management
      execSync('pkill -f "node server.js"');
      console.log('Server stopped');
    } catch (error) {
      console.log('Error stopping server:', error.message);
    }
  }
  
  // Fix database connection
  console.log('\nFixing database connection...');
  
  // Load environment variables
  require('dotenv').config();
  
  // Get the DATABASE_URL from environment
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    return;
  }
  
  // Clean the connection string
  try {
    const url = new URL(connectionString);
    
    // Remove any query parameters that might cause issues
    url.search = '';
    
    // Update the connection string
    const cleanedUrl = url.toString();
    
    if (cleanedUrl !== connectionString) {
      console.log('Cleaned DATABASE_URL to remove custom parameters');
      
      // Update the .env file if it exists
      const envPath = path.join(__dirname, '..', '..', '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Replace the DATABASE_URL line
        if (envContent.includes('DATABASE_URL=')) {
          envContent = envContent.replace(/DATABASE_URL=.*$/m, `DATABASE_URL=${cleanedUrl}`);
          fs.writeFileSync(envPath, envContent);
          console.log('.env file updated with cleaned DATABASE_URL');
        } else {
          // Add the DATABASE_URL line if it doesn't exist
          fs.appendFileSync(envPath, `\nDATABASE_URL=${cleanedUrl}\n`);
          console.log('Added cleaned DATABASE_URL to .env file');
        }
      } else {
        // Create a new .env file
        fs.writeFileSync(envPath, `DATABASE_URL=${cleanedUrl}\n`);
        console.log('Created .env file with cleaned DATABASE_URL');
      }
      
      // Update the environment variable for the current process
      process.env.DATABASE_URL = cleanedUrl;
    }
  } catch (error) {
    console.error('Error cleaning DATABASE_URL:', error);
  }
  
  // Check if TypeORM config exists and update it
  const typeormConfigPath = path.join(__dirname, '..', 'config', 'database.ts');
  if (fs.existsSync(typeormConfigPath)) {
    console.log('TypeORM config found, checking for issues...');
    
    // We can't easily modify TypeScript files programmatically
    // Just notify the user to check the file
    console.log('Please check the TypeORM config file for any issues:');
    console.log(typeormConfigPath);
  }
  
  // Check if Prisma config exists and update it
  const prismaConfigPath = path.join(__dirname, '..', '..', 'prisma', 'schema.prisma');
  if (fs.existsSync(prismaConfigPath)) {
    console.log('Prisma config found, checking for issues...');
    
    // Read the Prisma schema
    const prismaSchema = fs.readFileSync(prismaConfigPath, 'utf8');
    
    // Check if there are any custom parameters in the datasource block
    if (prismaSchema.includes('db_type')) {
      console.log('Found "db_type" parameter in Prisma schema, this might be causing issues');
      
      // Create a backup of the original file
      fs.writeFileSync(`${prismaConfigPath}.bak`, prismaSchema);
      console.log('Created backup of original Prisma schema');
      
      // Remove the db_type parameter
      const updatedSchema = prismaSchema.replace(/\s+db_type\s*=\s*.*$/m, '');
      
      // Write the updated schema
      fs.writeFileSync(prismaConfigPath, updatedSchema);
      console.log('Removed "db_type" parameter from Prisma schema');
    }
  }
  
  console.log('\nServer connection fix completed');
  console.log('Please restart your server to apply the changes');
}

// Run the function if this script is executed directly
if (require.main === module) {
  fixServerConnection().catch(err => {
    console.error('Unhandled error during fix:', err);
    process.exit(1);
  });
}

module.exports = { fixServerConnection };