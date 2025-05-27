require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // First, check if we already have a super_admin role
    const roleCheckRes = await client.query(`
      SELECT id FROM roles WHERE name = 'super_admin'
    `);
    
    let roleId;
    
    if (roleCheckRes.rows.length === 0) {
      // Create super_admin role if it doesn't exist
      const createRoleRes = await client.query(`
        INSERT INTO roles (id, name, description, "isActive", "isSystem", "dashboardType", "createdAt", "updatedAt")
        VALUES (uuid_generate_v4(), 'super_admin', 'Super Administrator', true, true, 'super_admin', NOW(), NOW())
        RETURNING id
      `);
      
      roleId = createRoleRes.rows[0].id;
      console.log(`Created super_admin role with ID: ${roleId}`);
    } else {
      roleId = roleCheckRes.rows[0].id;
      console.log(`Found existing super_admin role with ID: ${roleId}`);
    }
    
    // Check if admin user already exists
    const userCheckRes = await client.query(`
      SELECT id FROM users WHERE email = 'admin@example.com'
    `);
    
    if (userCheckRes.rows.length === 0) {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('Admin@123', saltRounds);
      
      // Create admin user
      const createUserRes = await client.query(`
        INSERT INTO users (
          id, "firstName", "lastName", email, password, role, level, "isActive", 
          "roleId", "createdAt", "updatedAt"
        )
        VALUES (
          uuid_generate_v4(), 'Admin', 'User', 'admin@example.com', $1, 
          'super_admin', '1', true, $2, NOW(), NOW()
        )
        RETURNING id, email
      `, [hashedPassword, roleId]);
      
      console.log(`Created admin user: ${JSON.stringify(createUserRes.rows[0])}`);
      console.log('Login credentials:');
      console.log('Email: admin@example.com');
      console.log('Password: Admin@123');
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

createAdminUser();