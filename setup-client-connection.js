// Script to set up client-server connection in Railway
const fs = require('fs');
const path = require('path');

console.log('Setting up client-server connection variables...');

// Update .env.railway file with client URL
function updateEnvRailway() {
  const filePath = path.join(__dirname, '.env.railway');
  
  if (fs.existsSync(filePath)) {
    console.log('Updating .env.railway with client URL...');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add CLIENT_URL if not present
    if (!content.includes('CLIENT_URL=')) {
      content += '\n# Client URL for CORS configuration\n';
      content += 'CLIENT_URL=https://your-client-app-name.up.railway.app\n';
      content += 'CORS_ORIGIN=https://your-client-app-name.up.railway.app\n';
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Updated .env.railway with client URL variables');
  }
}

// Update railway.json with client URL
function updateRailwayJson() {
  const filePath = path.join(__dirname, 'railway.json');
  
  if (fs.existsSync(filePath)) {
    console.log('Updating railway.json with client URL...');
    let content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);
    
    // Add client URL to environment variables
    if (!config.deploy) {
      config.deploy = {};
    }
    
    if (!config.deploy.envVars) {
      config.deploy.envVars = [];
    }
    
    // Check if CLIENT_URL already exists
    const clientUrlExists = config.deploy.envVars.some(env => env.name === 'CLIENT_URL');
    const corsOriginExists = config.deploy.envVars.some(env => env.name === 'CORS_ORIGIN');
    
    if (!clientUrlExists) {
      config.deploy.envVars.push({
        name: 'CLIENT_URL',
        value: 'https://your-client-app-name.up.railway.app'
      });
    }
    
    if (!corsOriginExists) {
      config.deploy.envVars.push({
        name: 'CORS_ORIGIN',
        value: 'https://your-client-app-name.up.railway.app'
      });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.log('Updated railway.json with client URL variables');
  }
}

// Update server.js to use the client URL for CORS
function updateServerJs() {
  const filePath = path.join(__dirname, 'server.js');
  
  if (fs.existsSync(filePath)) {
    console.log('Checking server.js for CORS configuration...');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if server.js already has CORS configuration
    if (content.includes('Access-Control-Allow-Origin') && !content.includes('process.env.CLIENT_URL')) {
      console.log('Server.js already has CORS configuration, but not using environment variables.');
      console.log('Please update your CORS configuration manually to use process.env.CLIENT_URL or process.env.CORS_ORIGIN');
    }
  }
}

// Run the update functions
updateEnvRailway();
updateRailwayJson();
updateServerJs();

console.log('\nIMPORTANT: You need to replace "your-client-app-name" with your actual Railway client app name');
console.log('To find your client app name:');
console.log('1. Go to your Railway dashboard');
console.log('2. Select your client application');
console.log('3. Look at the URL shown in the "Deployments" tab');
console.log('\nAfter updating the URLs, redeploy both your client and server applications');