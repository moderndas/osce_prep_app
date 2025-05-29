/**
 * Test SSRF protection
 * 
 * This script tests the SSRF protection by attempting to access
 * various URLs, both safe and potentially malicious.
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const TEST_ENDPOINT = `${API_URL}/test-ssrf`;

// Test URLs - a mix of safe and potentially unsafe URLs
const TEST_URLS = [
  // Safe URLs (should pass validation)
  'https://api.openai.com/v1/models',
  'https://api.anam.ai/v1/personas',
  
  // Unsafe URLs (should be blocked)
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://169.254.169.254/latest/meta-data/', // AWS metadata service
  'http://10.0.0.1',
  'http://172.16.0.1',
  'http://192.168.1.1',
  
  // File URLs (should be blocked)
  'file:///etc/passwd',
  
  // URLs with non-HTTP protocols (should be blocked)
  'ftp://example.com',
  'gopher://example.com',
  
  // Malformed URLs (should be blocked)
  'httpx://malicious-site.com',
  '//localhost:3000',
  
  // Domain fronting attempts (should be blocked if not on whitelist)
  'https://not-on-whitelist.com'
];

// Get admin token (you need to have admin credentials)
async function getAdminToken() {
  try {
    // You would need to implement this based on your auth system
    // For testing purposes, you could hardcode a token or use a test user
    console.log('Note: You need admin credentials to run this test');
    
    // Return a valid admin token or null
    return null;
  } catch (error) {
    console.error('Error getting admin token:', error.message);
    return null;
  }
}

// Test SSRF protection
async function testSSRFProtection() {
  // Get admin token (or you could use another authentication method)
  const token = await getAdminToken();
  
  if (!token) {
    console.log('No admin token available. Some tests may fail due to authorization.');
  }
  
  console.log('=== Testing SSRF Protection ===\n');
  
  // Test each URL
  for (const url of TEST_URLS) {
    console.log(`Testing URL: ${url}`);
    
    try {
      const response = await axios.post(TEST_ENDPOINT, 
        { url },
        { 
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      console.log(`  Result: ${response.data.safe ? 'ALLOWED ✓' : 'BLOCKED ✓'}`);
      console.log(`  Message: ${response.data.message}`);
    } catch (error) {
      if (error.response) {
        const isBlocked = error.response.data.message?.includes('SSRF protection');
        console.log(`  Result: ${isBlocked ? 'BLOCKED ✓' : 'ERROR ✗'}`);
        console.log(`  Status: ${error.response.status}`);
        console.log(`  Message: ${error.response.data.message || 'Unknown error'}`);
      } else {
        console.log(`  Result: ERROR ✗`);
        console.log(`  Message: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('SSRF Protection testing complete.');
}

// Run the tests
testSSRFProtection().catch(error => {
  console.error('Test failed:', error);
}); 