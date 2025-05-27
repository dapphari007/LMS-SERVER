// Script to test both internal and external Railway PostgreSQL connections
const { Client } = require('pg');

// Connection parameters
const INTERNAL_URL = 'postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@postgres.railway.internal:5432/railway';
const EXTERNAL_URL = 'postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway';

async function testConnection(connectionString, name) {
  console.log(`\n🔄 Testing ${name} connection...`);
  console.log(`Connection string starts with: ${connectionString.substring(0, 15)}...`);
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000 // 5 second timeout
  });
  
  try {
    await client.connect();
    console.log(`✅ ${name} connection successful!`);
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as time');
    console.log(`Database time: ${result.rows[0].time}`);
    
    return true;
  } catch (error) {
    console.error(`❌ ${name} connection failed:`, error.message);
    return false;
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore errors on disconnect
    }
  }
}

async function testBothConnections() {
  console.log('🔍 Testing both Railway PostgreSQL connections...');
  
  // Test internal connection first
  const internalSuccess = await testConnection(INTERNAL_URL, 'Internal');
  
  // Test external connection
  const externalSuccess = await testConnection(EXTERNAL_URL, 'External');
  
  // Summary
  console.log('\n📊 Connection Test Summary:');
  console.log(`Internal connection: ${internalSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`External connection: ${externalSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (internalSuccess) {
    console.log('\n✅ Your server should use the INTERNAL connection URL for best performance.');
  } else if (externalSuccess) {
    console.log('\n⚠️ Internal connection failed but external works. Your server will work but with higher latency.');
  } else {
    console.log('\n❌ Both connections failed. Check your credentials and network settings.');
  }
}

// Run the tests
testBothConnections().catch(err => {
  console.error('Unhandled error:', err);
});