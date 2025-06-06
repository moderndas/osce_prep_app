const mongoose = require('mongoose');
require('dotenv').config();

async function insertTestStation() {
    try {
        // Check for MongoDB URI in environment variables
        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            console.error('ERROR: MONGODB_URI environment variable is not defined');
            console.error('Please set it in your .env.local file or environment');
            process.exit(1);
        }
        
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected successfully!');

        // Define Station Schema
        const StationSchema = new mongoose.Schema({
            stationName: String,
            clinicalBackground: String,
            expectedAnswers: [String],
            timeLimit: Number,
            difficulty: String,
            createdAt: { type: Date, default: Date.now }
        });

        // Create or get the model
        const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);

        // Create a test station
        const testStation = await Station.create({
            stationName: "Test Station 1",
            clinicalBackground: "This is a test clinical scenario",
            expectedAnswers: ["Fever and cough", "CBC and chest X-ray"],
            timeLimit: 15,
            difficulty: "beginner"
        });

        console.log('\nCreated test station:', testStation);
        console.log('\nCheck MongoDB Compass now - you should see:');
        console.log('1. Database: osce_prep');
        console.log('2. Collection: stations');
        console.log('3. A new station document');

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error);
    }
}

insertTestStation(); 