// Simple test script to verify signup functionality
const fetch = require('node-fetch');

async function testSignup() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';

  console.log('Testing signup functionality...');
  console.log(`Test email: ${testEmail}`);

  try {
    // Test signup
    const signupResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const signupData = await signupResponse.json();
    console.log('Signup response:', signupData);

    if (signupData.success) {
      console.log('✅ Signup successful! User stored in database.');
      console.log('User data:', signupData.data.user);
      
      // Test login with the same credentials
      console.log('\nTesting login with created account...');
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });

      const loginData = await loginResponse.json();
      console.log('Login response:', loginData);

      if (loginData.success) {
        console.log('✅ Login successful! Database storage verified.');
      } else {
        console.log('❌ Login failed:', loginData.error);
      }
    } else {
      console.log('❌ Signup failed:', signupData.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSignup(); 