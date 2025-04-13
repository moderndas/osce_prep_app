import { connectDB } from '../../../lib/mongodb';
import Station from '../../../models/Station';

export default async function handler(req, res) {
  await connectDB();
  const { stationId } = req.query;

  try {
    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    return res.status(200).json(station);
  } catch (error) {
    console.error('Error fetching station:', error);
    return res.status(500).json({ error: 'Failed to fetch station' });
  }
} 