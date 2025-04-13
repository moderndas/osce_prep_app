const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' }); // Explicitly specify the path

async function verifyConnection() {
    try {
        console.log('Checking environment setup...');
        
        // Get the connection string
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in .env.local');
        }
        
        console.log('MONGODB_URI found:', uri.substring(0, 20) + '...');
        
        // Try to connect
        console.log('Attempting MongoDB connection...');
        await mongoose.connect(uri);
        console.log('✅ MongoDB connection successful!');
        
        await mongoose.disconnect();
        console.log('✅ Disconnected successfully');
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (!process.env.MONGODB_URI) {
            console.log('\nPlease check that:');
            console.log('1. .env.local file exists');
            console.log('2. MONGODB_URI is defined in .env.local');
            console.log('3. No syntax errors in .env.local');
        }
    }
}

verifyConnection(); 