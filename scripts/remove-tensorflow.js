const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to node_modules
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

console.log('Checking for TensorFlow dependencies...');

// Find TensorFlow directories
const tensorflowDirs = [
  path.join(nodeModulesPath, '@tensorflow'),
  path.join(nodeModulesPath, '@tensorflow 2')
];

// Remove each directory if it exists
let removed = false;
tensorflowDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Removing ${dir}...`);
    fs.rmSync(dir, { recursive: true, force: true });
    removed = true;
  }
});

if (removed) {
  console.log('TensorFlow directories removed successfully.');
  
  // Update next.config.js to remove TensorFlow-related settings
  const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Remove TensorFlow-related comments and settings
    nextConfig = nextConfig.replace('// Add experimental features for TensorFlow.js\n', '');
    nextConfig = nextConfig.replace("esmExternals: 'loose', // Required for TensorFlow.js", "esmExternals: 'loose'");
    
    // Write updated config
    fs.writeFileSync(nextConfigPath, nextConfig);
    console.log('Updated next.config.js to remove TensorFlow references.');
  }
  
  console.log('\nTensorFlow dependencies have been removed.');
  console.log('You may want to run "npm prune" to clean up any remaining unused dependencies.');
} else {
  console.log('No TensorFlow directories found in node_modules.');
} 