const metadataService = require('./metadataService');
const ImpactAnalyzer = require('./impactAnalyzer');

async function setupServices() {
    // Initialize services
    const impactAnalyzer = new ImpactAnalyzer(metadataService);
    
    // Export services
    module.exports = {
        metadataService,
        impactAnalyzer
    };

    console.log('Services initialized successfully');
}

module.exports = {
    setupServices
}; 