import fs from 'fs';
import path from 'path';
import { requireAdmin } from '../../../lib/auth-clerk';

export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { stationId, referenceIndex, deletePatientProfile } = req.body;
    
    if (!stationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Station ID is required' 
      });
    }

    const stationDir = `./public/references/station-${stationId}`;
    
    if (deletePatientProfile) {
      // Delete patient profile
      const configPath = './public/references/references-config.json';
      let config = {};
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = configContent ? JSON.parse(configContent) : {};
      }
      
      // Get current patient profile to find file name
      const currentProfile = config.patientProfiles?.[stationId];
      if (currentProfile) {
        // Delete the physical file
        const filePath = path.join(stationDir, currentProfile.file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        // Remove from config
        if (config.patientProfiles) {
          delete config.patientProfiles[stationId];
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
      
      res.status(200).json({ 
        success: true, 
        message: 'Patient profile deleted successfully' 
      });
    } else {
      // Delete reference (existing logic)
      if (referenceIndex === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reference index is required for reference deletion' 
        });
      }

      // Delete the physical file
      const fileName = `reference-${referenceIndex}.pdf`;
      const filePath = path.join(stationDir, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update references config
      const configPath = './public/references/references-config.json';
      let config = {};
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = configContent ? JSON.parse(configContent) : {};
      }
      
      if (config[stationId]) {
        // Remove the reference with matching index
        config[stationId] = config[stationId].filter(ref => ref.index !== parseInt(referenceIndex));
      }
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      res.status(200).json({ 
        success: true, 
        message: 'Reference deleted successfully' 
      });
    }

  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete: ' + error.message 
    });
  }
} 