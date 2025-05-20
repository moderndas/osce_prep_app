const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        // Check for MongoDB URI in environment variables
        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            console.error('ERROR: MONGODB_URI environment variable is not defined');
            console.error('Please set it in your .env.local file or environment');
            process.exit(1);
        }
        
        console.log('Attempting to connect...');
        await mongoose.connect(uri);
        console.log('Connected successfully!');
        
        await mongoose.disconnect();
        console.log('Disconnected successfully!');
    } catch (error) {
        console.error('Connection error:', error);
    }
}

testConnection(); 