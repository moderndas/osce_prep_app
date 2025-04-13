import dbConnect from '../../lib/db';
import Station from '../../models/Station';

export default async function handler(req, res) {
  try {
    // Connect to database
    await dbConnect();
    
    // Create a test station
    const testStation = await Station.create({
      stationName: "Test Station",
      clinicalBackground: "This is a test clinical scenario",
      expectedAnswers: ["Patient has fever", "Order blood tests"],
      timeLimit: 15,
      difficulty: "beginner",
      stationInstructions: "Test instructions"
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Test station created successfully',
      data: testStation 
    });
  } catch (error) {
    console.error('Database test error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
} 