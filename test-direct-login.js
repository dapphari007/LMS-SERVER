// Test script for the direct login server
const http = require('http');

// Configuration
const host = 'localhost';
const port = process.env.DIRECT_LOGIN_PORT || 3001;
const email = 'admin@example.com';
const password = 'admin123';

// Create the request options
const options = {
  hostname: host,
  port: port,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Create the request body
const data = JSON.stringify({
  email,
  password
});

console.log(`Testing direct login server at ${host}:${port}`);
console.log(`Attempting to login with email: ${email}`);

// Send the request
const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(responseData);
      console.log('Response:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.status === 'success') {
        console.log('Login successful!');
        console.log('Token:', parsedData.token.substring(0, 20) + '...');
      } else {
        console.log('Login failed:', parsedData.message);
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

// Write the request body
req.write(data);
req.end();

console.log('Request sent, waiting for response...');