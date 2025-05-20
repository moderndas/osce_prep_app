const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        // Use environment variable or fallback to a correctly formatted URI
        const uri = process.env.MONGODB_URI || 
                   '[MONGODB_URI_PLACEHOLDER]';
        
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