require('dotenv').config();
const { initializeApp } = require('./core/app');
const { setupServices } = require('./services');

async function main() {
    try {
        // Initialize core application
        await initializeApp();
        
        // Setup external services
        await setupServices();
        
        console.log('AI Impact Analyzer initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

main();
