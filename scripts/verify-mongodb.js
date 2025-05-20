const mongoose = require('mongoose');
require('dotenv').config();

async function verifyMongoDBConnection() {
  try {
    // Check if MONGODB_URI is defined in environment variables
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }
    
    console.log('MONGODB_URI found:', uri.substring(0, 20) + '...');
    
    // Verify it's in the correct format (doesn't have database name issues)
    const url = new URL(uri);
    const dbName = url.pathname.split('/')[1];
    console.log('Database name:', dbName);
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected successfully!');
    
    await mongoose.disconnect();
    console.log('Disconnected successfully!');
    
    return {
      success: true,
      message: 'MongoDB connection verified successfully!'
    };
  } catch (error) {
    console.error('Verification failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Run the verification when this script is executed directly
if (require.main === module) {
  if (!process.env.MONGODB_URI) {
    console.error('1. Missing MONGODB_URI environment variable');
  } else {
    console.log('2. MONGODB_URI is defined in .env.local');
    verifyMongoDBConnection().then(result => {
      console.log(result);
      process.exit(result.success ? 0 : 1);
    });
  }
}

module.exports = { verifyMongoDBConnection }; 