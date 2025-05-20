const mongoose = require('mongoose');
require('dotenv').config();

async function verifyDB() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB!');
    
    // Get list of collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections:', collections.map(c => c.name));
    
    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    console.log('Database name:', dbName);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyDB(); 