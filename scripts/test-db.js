const mongoose = require('mongoose');
require('dotenv').config();

async function testDB() {
  try {
    // Get MongoDB URI from environment
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB!');
    
    // Get the database name from the connection
    const dbName = mongoose.connection.db.databaseName;
    console.log('Connected to database:', dbName);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));
    
    // Disconnect
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

testDB(); 