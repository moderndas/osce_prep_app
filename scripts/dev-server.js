const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const START_PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;
let currentProcess = null;

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    function tryPort() {
      if (attempts >= MAX_PORT_ATTEMPTS) {
        reject(new Error('No available ports found'));
        return;
      }

      const server = net.createServer();
      server.unref();

      server.on('error', () => {
        port++;
        attempts++;
        tryPort();
      });

      server.listen(port, () => {
        server.close(() => resolve(port));
      });
    }

    tryPort();
  });
}

async function startServer(port) {
  try {
    // Update environment variables
    const envContent = `
NEXT_PUBLIC_VERCEL_URL=localhost:${port}
NEXTAUTH_URL=http://localhost:${port}
MONGODB_URI=${process.env.MONGODB_URI || 'your_mongodb_uri'}
NEXTAUTH_SECRET=${process.env.NEXTAUTH_SECRET || 'your-super-secret-key-at-least-32-characters'}
ASSEMBLYAI_API_KEY=${process.env.ASSEMBLYAI_API_KEY || 'your_assemblyai_key'}
`;

    fs.writeFileSync('.env.local', envContent.trim());
    console.log(`\n📝 Updated environment variables in .env.local`);

    // Start Next.js
    const nextBin = path.resolve(__dirname, '../node_modules/.bin/next');
    const env = { ...process.env, PORT: port.toString() };
    
    // Use npx to run next instead of direct path
    currentProcess = spawn('npx', ['next', 'dev', '-p', port.toString()], {
      stdio: 'inherit',
      env,
      shell: true,
      windowsVerbatimArguments: true // This helps with path issues on Windows
    });

    console.log(`\n🚀 Starting development server on port ${port}`);
    console.log(`📱 Local: http://localhost:${port}`);

    // Handle process events
    currentProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });

    currentProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Server exited with code ${code}`);
        restartServer(port);
      }
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

function restartServer(port) {
  console.log('\n🔄 Restarting server...');
  if (currentProcess) {
    currentProcess.kill();
  }
  setTimeout(() => startServer(port), 1000);
}

// Handle termination signals
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    if (currentProcess) {
      currentProcess.kill();
    }
    process.exit(0);
  });
});

// Start the server
async function init() {
  try {
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(START_PORT);
    await startServer(port);
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

init(); 