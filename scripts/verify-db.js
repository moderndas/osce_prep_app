const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function verifyConnection() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully to MongoDB');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Count documents in stations collection
    const Station = mongoose.model('Station', new mongoose.Schema({}));
    const count = await Station.countDocuments();
    console.log('Number of stations:', count);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Verification error:', error);
  }
}

verifyConnection(); 