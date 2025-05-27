// Script to update Railway configuration files
const fs = require('fs');
const path = require('path');

console.log('Updating Railway configuration files...');

// Update railway.toml
function updateRailwayToml() {
  const filePath = path.join(__dirname, 'railway.toml');
  
  if (!fs.existsSync(filePath)) {
    console.log('railway.toml does not exist, creating it...');
    
    const content = `# Railway configuration file
# This file defines the relationships between services

[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

# Pre-start script to fix PostgreSQL configuration
preStartCommand = "node railway-db-fix.js"

[env]
# Use the Railway-provided PostgreSQL connection URL
DATABASE_URL = "\${RAILWAY_POSTGRESQL_CONNECTION_URL}"
# Disable any custom parameters that might be causing issues
PG_CUSTOM_PARAMS = "false"

# Define the relationship with the PostgreSQL database
[[services]]
name = "postgresql"
# Ensure we're using standard PostgreSQL configuration
[services.config]
standard_conforming_strings = "on"
`;
    
    fs.writeFileSync(filePath, content);
    console.log('Created railway.toml with updated configuration');
  } else {
    console.log('Updating existing railway.toml...');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update preStartCommand to use the new fix script
    if (content.includes('preStartCommand')) {
      content = content.replace(/preStartCommand\s*=\s*"[^"]*"/, 'preStartCommand = "node railway-db-fix.js"');
    } else {
      content = content.replace('[deploy]', '[deploy]\npreStartCommand = "node railway-db-fix.js"');
    }
    
    // Remove any db_type parameter
    content = content.replace(/db_type\s*=\s*["'][^"']*["']/g, '');
    
    fs.writeFileSync(filePath, content);
    console.log('Updated railway.toml');
  }
}

// Update railway.json
function updateRailwayJson() {
  const filePath = path.join(__dirname, 'railway.json');
  
  if (!fs.existsSync(filePath)) {
    console.log('railway.json does not exist, creating it...');
    
    const content = `{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "preStartCommand": "node railway-db-fix.js"
  },
  "env": {
    "DATABASE_URL": "${RAILWAY_POSTGRESQL_CONNECTION_URL}",
    "PG_CUSTOM_PARAMS": "false"
  }
}`;
    
    fs.writeFileSync(filePath, content);
    console.log('Created railway.json with updated configuration');
  } else {
    console.log('Updating existing railway.json...');
    let content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);
    
    // Update preStartCommand
    if (!config.deploy) {
      config.deploy = {};
    }
    config.deploy.preStartCommand = "node railway-db-fix.js";
    
    // Update env settings
    if (!config.env) {
      config.env = {};
    }
    config.env.PG_CUSTOM_PARAMS = "false";
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.log('Updated railway.json');
  }
}

// Update .env.railway
function updateEnvRailway() {
  const filePath = path.join(__dirname, '.env.railway');
  
  if (fs.existsSync(filePath)) {
    console.log('Updating .env.railway...');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Make sure DATABASE_URL is set correctly
    if (!content.includes('DATABASE_URL=')) {
      content += '\n# Explicitly set DATABASE_URL without db_type parameter\n';
      content += 'DATABASE_URL=postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway\n';
    }
    
    // Add PGSSLMODE if not present
    if (!content.includes('PGSSLMODE=')) {
      content += '\nPGSSLMODE=require\n';
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Updated .env.railway');
  }
}

// Run the update functions
updateRailwayToml();
updateRailwayJson();
updateEnvRailway();

console.log('Railway configuration files updated successfully');
console.log('Please redeploy your application to Railway for the changes to take effect');