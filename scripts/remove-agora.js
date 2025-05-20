const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to node_modules and package.json
const rootPath = path.join(__dirname, '..');
const nodeModulesPath = path.join(rootPath, 'node_modules');
const packageJsonPath = path.join(rootPath, 'package.json');

console.log('Checking for Agora RTC dependencies...');

// Step 1: Remove from node_modules
const agoraDirs = [
  path.join(nodeModulesPath, 'agora-rtc-sdk'),
  path.join(nodeModulesPath, 'agora-rtc-sdk-ng'),
  path.join(nodeModulesPath, 'agora-rtm-sdk'),
  path.join(nodeModulesPath, '@agora-js'),
  // Include any other Agora-related packages that might be present
];

// Remove each directory if it exists
let removedDirs = false;
agoraDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Removing ${dir}...`);
    fs.rmSync(dir, { recursive: true, force: true });
    removedDirs = true;
  }
});

// Step 2: Remove from package.json
let removedFromPackageJson = false;
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // List of Agora-related packages to remove
  const agoraPackages = [
    'agora-rtc-sdk',
    'agora-rtc-sdk-ng',
    'agora-rtm-sdk',
    '@agora-js/agora-rtc-sdk',
    '@agora-js/agora-rtc-sdk-ng',
    '@agora-js/agora-rtm-sdk'
    // Add other Agora packages if needed
  ];
  
  // Remove packages from dependencies
  if (packageJson.dependencies) {
    for (const pkg of agoraPackages) {
      if (packageJson.dependencies[pkg]) {
        console.log(`Removing ${pkg} from package.json dependencies`);
        delete packageJson.dependencies[pkg];
        removedFromPackageJson = true;
      }
    }
  }
  
  // Remove packages from devDependencies
  if (packageJson.devDependencies) {
    for (const pkg of agoraPackages) {
      if (packageJson.devDependencies[pkg]) {
        console.log(`Removing ${pkg} from package.json devDependencies`);
        delete packageJson.devDependencies[pkg];
        removedFromPackageJson = true;
      }
    }
  }
  
  // Write updated package.json if changes were made
  if (removedFromPackageJson) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json to remove Agora dependencies');
  }
}

// Step 3: Look for Agora-related code files
console.log('\nLooking for Agora-related files in the codebase...');
try {
  const grepResult = execSync('grep -r "agora\\|rtc\\|@agora-js" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" ' + rootPath).toString();
  if (grepResult) {
    console.log('The following files may contain references to Agora:');
    console.log(grepResult);
    console.log('\nYou may want to review these files and remove any Agora-related code.');
  }
} catch (error) {
  // grep returns non-zero exit code if no matches found
  console.log('No Agora-related code found in the project files.');
}

if (removedDirs || removedFromPackageJson) {
  console.log('\nAgora RTC dependencies have been removed.');
  console.log('Running npm prune to clean up remaining dependencies...');
  try {
    execSync('npm prune', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error running npm prune:', error.message);
  }
} else {
  console.log('No Agora RTC dependencies found to remove.');
} 