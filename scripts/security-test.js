/**
 * Security Testing Script
 * 
 * This script tests various security aspects of the OSCE preparation application
 * including rate limiting, path traversal protection, and input sanitization.
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const AUTH_ENDPOINT = `${API_BASE_URL}/auth/signin`;
const SIGNUP_ENDPOINT = `${API_BASE_URL}/auth/signup`;
const STATION_ENDPOINT = `${API_BASE_URL}/stations`;
const VIDEO_ENDPOINT = `${API_BASE_URL}/video`;

// Utility function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test rate limiting for authentication
async function testAuthRateLimiting() {
  console.log('\n--- Testing Authentication Rate Limiting ---');
  
  try {
    // Try to sign in multiple times with invalid credentials
    const payload = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };
    
    // Perform 6 requests (limit is 5 per 15 minutes)
    for (let i = 0; i < 6; i++) {
      try {
        console.log(`Request ${i + 1}: Sending...`);
        const response = await axios.post(AUTH_ENDPOINT, payload);
        console.log(`Request ${i + 1}: ${response.status} - Success (Expected to fail auth)`);
      } catch (error) {
        if (error.response) {
          if (error.response.status === 429) {
            console.log(`Request ${i + 1}: 429 - Rate Limited (Expected after 5 attempts)`);
          } else {
            console.log(`Request ${i + 1}: ${error.response.status} - ${error.response.data.message || 'Authentication failed'}`);
          }
        } else {
          console.log(`Request ${i + 1}: Error - ${error.message}`);
        }
      }
      
      // Small delay between requests
      await sleep(500);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Test path traversal protection
async function testPathTraversalProtection() {
  console.log('\n--- Testing Path Traversal Protection ---');
  
  const maliciousIds = [
    '12345', // Valid ID
    '../config', // Directory traversal
    '..%2F..%2Fconfig', // URL encoded traversal
    '../../etc/passwd', // Extreme traversal
    '"><script>alert(1)</script>', // XSS attempt
    '`cat /etc/passwd`', // Command injection attempt
  ];
  
  for (const id of maliciousIds) {
    try {
      console.log(`Testing path: ${id}`);
      const response = await axios.get(`${VIDEO_ENDPOINT}/${id}`);
      console.log(`- Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`- Status: ${error.response.status} - ${error.response.data.message || 'Request failed'}`);
      } else {
        console.log(`- Error: ${error.message}`);
      }
    }
  }
}

// Test XSS protection
async function testXSSProtection() {
  console.log('\n--- Testing XSS Protection ---');
  
  // Payloads containing XSS attempts
  const xssPayloads = [
    { name: 'Normal Input', value: 'John Doe' },
    { name: 'Basic Script Tag', value: '<script>alert("XSS")</script>' },
    { name: 'Img Tag Injection', value: '<img src="x" onerror="alert(\'XSS\')">' },
    { name: 'JavaScript URI', value: 'javascript:alert("XSS")' },
    { name: 'Event Handler', value: 'onmouseover=alert("XSS")' }
  ];
  
  for (const payload of xssPayloads) {
    try {
      console.log(`Testing: ${payload.name}`);
      
      // We'll use the signup endpoint with deliberately wrong credentials
      // but with the XSS payloads in the name field
      const response = await axios.post(SIGNUP_ENDPOINT, {
        name: payload.value,
        email: 'test@example.com',
        password: 'Password123!'
      });
      
      console.log(`- Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`- Status: ${error.response.status} - ${error.response.data.message || 'Request failed'}`);
      } else {
        console.log(`- Error: ${error.message}`);
      }
    }
  }
}

// Run the tests
async function runTests() {
  console.log('=== OSCE App Security Tests ===');
  
  await testAuthRateLimiting();
  await testPathTraversalProtection();
  await testXSSProtection();
  
  console.log('\nAll tests completed.');
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
}); 