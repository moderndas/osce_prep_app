const { execSync } = require('child_process');
const net = require('net');
const path = require('path');

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
}

async function startDev() {
  try {
    const port = await findAvailablePort(3000);
    console.log(`Starting development server on port ${port}`);
    
    // Set environment variables for NextAuth
    process.env.PORT = port;
    process.env.NEXTAUTH_URL = `http://localhost:${port}`;
    process.env.NEXT_PUBLIC_VERCEL_URL = `localhost:${port}`;
    
    // Properly escape the path
    const nextBin = `"${path.resolve(__dirname, '../node_modules/.bin/next')}"`;
    execSync(`${nextBin} dev -p ${port}`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXTAUTH_URL: `http://localhost:${port}`,
        NEXT_PUBLIC_VERCEL_URL: `localhost:${port}`
      }
    });
  } catch (error) {
    console.error('Failed to start development server:', error);
    process.exit(1);
  }
}

startDev(); 