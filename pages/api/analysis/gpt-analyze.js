import { connectDB } from '../../../lib/mongodb';
import Station from '../../../models/Station';
import { analyzeStationPerformance } from '../../../utils/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { stationId, ephemeralData } = req.body;

    if (!stationId || !ephemeralData) {
      return res.status(400).json({ 
        error: 'Missing required data. Please provide stationId and ephemeralData.' 
      });
    }

    // Fetch station data from MongoDB
    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    // Perform GPT analysis
    const analysisResult = await analyzeStationPerformance(station, ephemeralData);

    if (!analysisResult.success) {
      throw new Error(analysisResult.error);
    }

    return res.status(200).json(analysisResult);
  } catch (error) {
    console.error('GPT Analysis API error:', error);
    return res.status(500).json({ 
      error: 'Failed to perform GPT analysis: ' + error.message 
    });
  }
} 