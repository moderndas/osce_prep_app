const { loadModels, areModelsLoaded } = require('../utils/modelLoader');

async function testModelLoading() {
  try {
    console.log('Starting model loading test...');
    
    // Attempt to load models
    await loadModels();
    
    // Verify models are loaded
    if (areModelsLoaded()) {
      console.log('✅ Model loading test passed successfully');
    } else {
      console.error('❌ Model loading test failed: Models not loaded');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Model loading test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testModelLoading(); 