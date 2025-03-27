const { impactAnalyzer } = require('../services');

// Test user ID
const TEST_USER_ID = 'test-user-1';

async function testImpactAnalyzer() {
    try {
        console.log('\n=== Starting Impact Analyzer Tests ===\n');

        // Test 1: Analyze field usage for Account.Industry
        console.log('Test 1: Analyzing Account.Industry field usage...');
        const industryUsage = await impactAnalyzer.analyzeFieldUsage(
            TEST_USER_ID,
            'Account',
            'Industry'
        );

        console.log('\nResults for Account.Industry:');
        console.log('-----------------------------');
        console.log(`Total Usage: ${industryUsage.summary.totalUsage}`);
        console.log(`Risk Level: ${industryUsage.summary.riskLevel}`);
        
        if (industryUsage.metadataElements.formulas.length > 0) {
            console.log('\nFormula Fields:');
            industryUsage.metadataElements.formulas.forEach(f => {
                console.log(`- ${f.name}`);
            });
        }

        if (industryUsage.metadataElements.validations.length > 0) {
            console.log('\nValidation Rules:');
            industryUsage.metadataElements.validations.forEach(v => {
                console.log(`- ${v.name}`);
            });
        }

        if (industryUsage.metadataElements.lookups.length > 0) {
            console.log('\nLookup Fields:');
            industryUsage.metadataElements.lookups.forEach(l => {
                console.log(`- ${l.field}`);
            });
        }

        // Test 2: Analyze field usage for Contact.Email
        console.log('\nTest 2: Analyzing Contact.Email field usage...');
        const emailUsage = await impactAnalyzer.analyzeFieldUsage(
            TEST_USER_ID,
            'Contact',
            'Email'
        );

        console.log('\nResults for Contact.Email:');
        console.log('-----------------------------');
        console.log(`Total Usage: ${emailUsage.summary.totalUsage}`);
        console.log(`Risk Level: ${emailUsage.summary.riskLevel}`);

        console.log('\n=== Impact Analyzer Tests Completed ===\n');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testImpactAnalyzer();
}

module.exports = {
    testImpactAnalyzer
}; 