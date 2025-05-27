// Simple script to check environment variables
console.log('Checking environment variables...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL first 10 chars:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 10) + '...' : 'not set');
console.log('PORT:', process.env.PORT);
console.log('HOST:', process.env.HOST);