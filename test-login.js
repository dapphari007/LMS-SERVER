require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function testLogin(email, password) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Find user by email
    const userRes = await client.query(`
      SELECT u.*, r.name as role_name, r."dashboardType" 
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      WHERE u.email = $1
    `, [email]);
    
    if (userRes.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = userRes.rows[0];
    
    // Check if user is active
    if (!user.isActive) {
      console.log('User account is deactivated');
      return;
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('Invalid password');
      return;
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role,
        dashboardType: user.dashboardType || user.role
      },
      'your-secret-key', // This should be replaced with your actual JWT_SECRET
      { expiresIn: '1d' }
    );
    
    // Remove password from response
    delete user.password;
    
    console.log('Login successful');
    console.log('Token:', token);
    console.log('User:', JSON.stringify(user, null, 2));
    
    // Check if the roleObj relation is working
    console.log('\nChecking role relationship:');
    console.log('Role ID:', user.roleId);
    console.log('Role Name:', user.role_name);
    console.log('Dashboard Type:', user.dashboardType);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

// Test with the admin user we created
testLogin('admin@example.com', 'Admin@123');