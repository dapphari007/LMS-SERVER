const http = require('http');

// Function to make a POST request to the login API
function testLoginAPI() {
  // Login credentials
  const data = JSON.stringify({
    email: 'admin@example.com',
    password: 'Admin@123'
  });

  // Request options
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  // Create the request
  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response ended');
      if (responseData) {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('Response body:', JSON.stringify(parsedData, null, 2));
          
          if (parsedData.token) {
            console.log('Login successful! Token received.');
          } else {
            console.log('Login failed: No token in response');
          }
        } catch (e) {
          console.log('Could not parse response as JSON:', responseData);
        }
      } else {
        console.log('Empty response body');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  // Write data to request body
  req.write(data);
  req.end();
}

// Run the test
console.log('Testing login API...');
testLoginAPI();