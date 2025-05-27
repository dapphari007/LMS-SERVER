/**
 * Database Fix Script
 * 
 * This script compiles and runs the TypeScript fix-database-schema.ts script
 * to fix common database schema issues.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure the required directories exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Compiling TypeScript files...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation successful');
} catch (error) {
  console.error('Error compiling TypeScript files:', error.message);
  process.exit(1);
}

console.log('Running database fix script...');
try {
  execSync('node dist/scripts/fix-database-schema.js', { stdio: 'inherit' });
  console.log('Database fix script completed successfully');
} catch (error) {
  console.error('Error running database fix script:', error.message);
  process.exit(1);
}

console.log('Database fixes completed. You can now restart your server.');