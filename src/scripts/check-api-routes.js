// Script to check API routes
const Hapi = require('@hapi/hapi');
const fs = require('fs');
const path = require('path');

async function checkApiRoutes() {
  console.log('Checking API routes...');
  
  try {
    // Import the routes module
    const routesPath = path.join(__dirname, '..', 'routes', 'index.js');
    
    // Check if the routes file exists
    if (!fs.existsSync(routesPath)) {
      console.error(`Routes file not found at ${routesPath}`);
      console.log('Looking for TypeScript version...');
      
      const tsRoutesPath = path.join(__dirname, '..', 'routes', 'index.ts');
      if (!fs.existsSync(tsRoutesPath)) {
        console.error(`TypeScript routes file not found at ${tsRoutesPath}`);
        return;
      }
      
      console.log(`Found TypeScript routes file at ${tsRoutesPath}`);
      console.log('Please run this script after building the project');
      return;
    }
    
    // Create a temporary server to register routes
    const server = Hapi.server({
      port: 0,
      host: 'localhost'
    });
    
    // Import and register routes
    console.log('Importing routes module...');
    const { registerRoutes } = require(routesPath);
    
    console.log('Registering routes...');
    registerRoutes(server);
    
    // Get all registered routes
    const routes = server.table();
    
    console.log(`Found ${routes.length} registered routes:`);
    
    // Group routes by path
    const routesByPath = {};
    routes.forEach(route => {
      const path = route.path;
      if (!routesByPath[path]) {
        routesByPath[path] = [];
      }
      routesByPath[path].push(route.method);
    });
    
    // Print routes grouped by path
    Object.keys(routesByPath).sort().forEach(path => {
      console.log(`${path}:`);
      routesByPath[path].forEach(method => {
        console.log(`  - ${method}`);
      });
    });
    
    // Check specifically for auth routes
    const authRoutes = routes.filter(route => route.path.includes('/api/auth/'));
    
    console.log('\nAuth routes:');
    if (authRoutes.length === 0) {
      console.log('No auth routes found!');
    } else {
      authRoutes.forEach(route => {
        console.log(`${route.method} ${route.path}`);
      });
    }
    
    // Check for login route specifically
    const loginRoute = routes.find(route => 
      route.path === '/api/auth/login' && route.method === 'post'
    );
    
    if (loginRoute) {
      console.log('\nLogin route found:');
      console.log(`${loginRoute.method.toUpperCase()} ${loginRoute.path}`);
      console.log('Auth config:', loginRoute.settings.auth || 'Not specified');
    } else {
      console.error('\nLogin route NOT found!');
    }
    
    console.log('\nAPI routes check completed');
  } catch (error) {
    console.error('Error checking API routes:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  checkApiRoutes().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { checkApiRoutes };