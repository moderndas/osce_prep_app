import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '../../../lib/auth-clerk';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: './public/references/temp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept PDFs for references and images/PDFs for patient profiles
        return mimetype && (
          mimetype.includes('pdf') || 
          mimetype.includes('image/jpeg') || 
          mimetype.includes('image/png') ||
          mimetype.includes('image/jpg')
        );
      },
    });

    // Create temp directory if it doesn't exist
    const tempDir = './public/references/temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);
    const stationId = fields.stationId[0];
    
    if (!stationId) {
      return res.status(400).json({ success: false, message: 'Station ID is required' });
    }

    // Create station folder
    const stationDir = `./public/references/station-${stationId}`;
    if (!fs.existsSync(stationDir)) {
      fs.mkdirSync(stationDir, { recursive: true });
    }

    // Process uploaded references
    const references = [];
    
    for (let i = 0; i < 3; i++) {
      const fileKey = `reference${i}`;
      const nameKey = `name${i}`;
      
      if (files[fileKey] && fields[nameKey] && fields[nameKey][0].trim()) {
        const file = Array.isArray(files[fileKey]) ? files[fileKey][0] : files[fileKey];
        const referenceName = fields[nameKey][0].trim();
        const fileName = `reference-${i + 1}.pdf`;
        const finalPath = path.join(stationDir, fileName);
        
        // Move file from temp to final location
        fs.renameSync(file.filepath, finalPath);
        
        // Add to references config
        references.push({
          name: referenceName,
          file: fileName,
          index: i + 1
        });
      }
    }

    // Process patient profile upload
    let patientProfile = null;
    if (files.patientProfile && fields.patientProfileName && fields.patientProfileName[0].trim()) {
      const file = Array.isArray(files.patientProfile) ? files.patientProfile[0] : files.patientProfile;
      const profileName = fields.patientProfileName[0].trim();
      
      // Get file extension
      const originalName = file.originalFilename || '';
      const extension = path.extname(originalName).toLowerCase();
      const fileName = `patient-profile${extension}`;
      const finalPath = path.join(stationDir, fileName);
      
      // Move file from temp to final location
      fs.renameSync(file.filepath, finalPath);
      
      patientProfile = {
        name: profileName,
        file: fileName,
        type: extension.includes('pdf') ? 'pdf' : 'image'
      };
    }

    // Update references config file
    const configPath = './public/references/references-config.json';
    let config = {};
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      config = configContent ? JSON.parse(configContent) : {};
    }
    
    // Get existing references for this station
    let existingReferences = config[stationId] || [];
    
    // Merge new references with existing ones
    references.forEach(newRef => {
      // Remove any existing reference with the same index
      existingReferences = existingReferences.filter(ref => ref.index !== newRef.index);
      // Add the new reference
      existingReferences.push(newRef);
    });
    
    // Sort by index to maintain order
    existingReferences.sort((a, b) => a.index - b.index);
    
    config[stationId] = existingReferences;
    
    // Handle patient profile in config
    if (patientProfile) {
      if (!config.patientProfiles) {
        config.patientProfiles = {};
      }
      config.patientProfiles[stationId] = patientProfile;
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      const tempFiles = fs.readdirSync(tempDir);
      tempFiles.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Files uploaded successfully',
      references: existingReferences,
      patientProfile: patientProfile
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload files: ' + error.message 
    });
  }
} 