const mongoose = require('mongoose');

async function testConnection() {
    try {
        const uri = '[MONGODB_URI_PLACEHOLDER]';
        
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