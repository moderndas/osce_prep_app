import dbConnect from '../../lib/db';
import Analysis from '../../models/Analysis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { stationId, videoId, transcript } = req.body;

    const analysis = await Analysis.findOneAndUpdate(
      { stationId, videoId },
      { 
        $set: { transcript }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    console.error('Save transcript error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
} 