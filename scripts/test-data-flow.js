const mongoose = require('mongoose');
require('dotenv').config();

async function testDataFlow() {
    try {
        // Check for MongoDB URI in environment variables
        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            console.error('ERROR: MONGODB_URI environment variable is not defined');
            console.error('Please set it in your .env.local file or environment');
            process.exit(1);
        }
        
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected successfully!');

        // Create a simple test schema
        const TestSchema = new mongoose.Schema({
            testName: String,
            createdAt: { type: Date, default: Date.now }
        });

        // Create or get the model
        const Test = mongoose.models.Test || mongoose.model('Test', TestSchema);

        // Insert a test document
        const testDoc = await Test.create({
            testName: 'Test Document ' + new Date().toISOString()
        });

        console.log('Created test document:', testDoc);
        console.log('\nCheck MongoDB Compass - you should see:');
        console.log('1. Database: osce_prep');
        console.log('2. Collection: tests');
        console.log('3. A new document with testName and createdAt');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error);
    }
}

testDataFlow(); 