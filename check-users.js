require('dotenv').config();
const { Client } = require('pg');

async function checkUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check if users table exists and has records
    const usersRes = await client.query(`
      SELECT COUNT(*) as count FROM users
    `);
    
    console.log(`Total users in database: ${usersRes.rows[0].count}`);
    
    if (parseInt(usersRes.rows[0].count) > 0) {
      // Get sample user data
      const userSampleRes = await client.query(`
        SELECT id, email, "firstName", "lastName", role, "roleId", "isActive"
        FROM users
        LIMIT 5
      `);
      
      console.log('Sample users:');
      userSampleRes.rows.forEach(user => {
        console.log(JSON.stringify(user, null, 2));
      });
      
      // Check roles table
      const rolesRes = await client.query(`
        SELECT COUNT(*) as count FROM roles
      `);
      
      console.log(`\nTotal roles in database: ${rolesRes.rows[0].count}`);
      
      if (parseInt(rolesRes.rows[0].count) > 0) {
        // Get sample role data
        const roleSampleRes = await client.query(`
          SELECT id, name, description, "dashboardType", "isActive"
          FROM roles
          LIMIT 5
        `);
        
        console.log('Sample roles:');
        roleSampleRes.rows.forEach(role => {
          console.log(JSON.stringify(role, null, 2));
        });
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

checkUsers();