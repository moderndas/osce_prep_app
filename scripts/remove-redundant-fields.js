require('dotenv').config();
const mongoose = require('mongoose');

// Use environment variable instead of hardcoded connection string
const MONGODB_URI = process.env.MONGODB_URI;

// Validate environment variable
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined');
  console.error('Please set it in your .env.local file or environment');
  process.exit(1);
}

const main = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('Removing redundant fields from user records...');
    
    // Update all users to unset/remove the redundant fields
    const result = await usersCollection.updateMany(
      {}, // match all documents
      { 
        $unset: { 
          firstName: "",
          lastName: "",
          agreedToTerms: "" 
        } 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} out of ${result.matchedCount} user records`);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  }
};

main(); 