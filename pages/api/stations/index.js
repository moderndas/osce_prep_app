import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "../../../lib/db";
import Station from "../../../models/Station";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'You must be signed in.' });
  }

  // Connect to database
  await dbConnect();

  if (req.method === 'POST') {
    try {
      // Check station limit
      const stationCount = await Station.countDocuments({ createdBy: session.user.id });
      if (stationCount >= 5) {
        return res.status(400).json({
          success: false,
          message: 'You have reached the limit of 5 stations'
        });
      }

      const { stationName, clinicalBackground, keyQuestions, expectedAnswers, initialQuestion, fiveMinuteQuestion } = req.body;

      // Create new station
      const station = await Station.create({
        stationName,
        clinicalBackground,
        keyQuestions,
        expectedAnswers,
        initialQuestion,
        fiveMinuteQuestion,
        createdBy: session.user.id
      });

      return res.status(201).json({
        success: true,
        data: station
      });
    } catch (error) {
      console.error('Station creation error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating station'
      });
    }
  }

  // Handle GET request to fetch user's stations
  if (req.method === 'GET') {
    try {
      const stations = await Station.find({ createdBy: session.user.id })
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: stations
      });
    } catch (error) {
      console.error('Error fetching stations:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error fetching stations'
      });
    }
  }

  // Add DELETE method
  if (req.method === 'DELETE') {
    try {
      const { stationId } = req.query;
      const station = await Station.findOneAndDelete({
        _id: stationId,
        createdBy: session.user.id
      });

      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Error deleting station'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
} 