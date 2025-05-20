/**
 * This script creates or updates a user with admin privileges.
 * To run: node scripts/seedAdmin.js email@example.com
 */

const mongoose = require('mongoose');
const { hash } = require('bcryptjs');
require('dotenv').config();

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Define the admin user schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

async function seedAdmin() {
  try {
    const adminEmail = process.argv[2];
    
    if (!adminEmail) {
      console.error('Please provide an email address for the admin user.');
      console.error('Usage: node scripts/seedAdmin.js admin@example.com');
      process.exit(1);
    }

    if (!MONGODB_URI) {
      console.error('MongoDB URI is not defined in environment variables.');
      console.error('Please create a .env.local file with MONGODB_URI variable.');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log(`Connecting to MongoDB...`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get or create User model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Check if the admin user already exists
    const existingUser = await User.findOne({ email: adminEmail });

    if (existingUser) {
      // Update the existing user to have admin role
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`\nUpdated user ${existingUser.email} to admin role.`);
      console.log('Admin user details:', {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role
      });
    } else {
      // Create a new admin user with a default password
      const defaultPassword = 'adminPassword123!';
      const hashedPassword = await hash(defaultPassword, 12);
      
      const newAdminUser = await User.create({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      
      console.log(`\nCreated new admin user: ${newAdminUser.email}`);
      console.log(`Default password: ${defaultPassword}`);
      console.log('IMPORTANT: Change this password after first login!');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedAdmin(); 