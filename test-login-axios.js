require('dotenv').config();
const axios = require('axios');

// Function to test the login API
async function testLoginAPI() {
  try {
    console.log('Testing login API...');
    
    // Login credentials
    const loginData = {
      email: 'admin@example.com',
      password: 'Admin@123'
    };
    
    // Use port 3000 since that's where the server is running
    const port = 3000;
    const host = 'localhost';
    
    console.log(`Attempting to connect to ${host}:${port}`);
    
    // Make the request
    const response = await axios.post(`http://${host}:${port}/api/auth/login`, loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    if (response.data) {
      console.log('Response data:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.token) {
        console.log('Login successful! Token received.');
      } else {
        console.log('Login failed: No token in response');
      }
    } else {
      console.log('Empty response body');
    }
  } catch (error) {
    console.error('Error testing login API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testLoginAPI();