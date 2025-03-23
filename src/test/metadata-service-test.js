require('dotenv').config();
const metadataService = require('../services/metadataService');

// Test user ID (same as in other tests)
const TEST_USER_ID = 'test-user-1';

// Test specific objects we want to examine
const TEST_OBJECTS = ['Account', 'Contact', 'Opportunity'];

async function testMetadataService() {
    try {
        console.log('\n=== Starting Metadata Service Tests ===\n');

        // Test 1: Initialize metadata
        console.log('Test 1: Initializing metadata...');
        await metadataService.initialize(TEST_USER_ID);
        console.log('✓ Metadata initialized successfully\n');

        // Test 2: Get all objects
        console.log('Test 2: Retrieving all objects...');
        const allObjects = await metadataService.getAllObjects(TEST_USER_ID);
        console.log(`✓ Retrieved ${allObjects.length} objects\n`);

        // Test 3: Examine specific objects and their relationships
        console.log('Test 3: Analyzing object relationships...');
        for (const objectName of TEST_OBJECTS) {
            console.log(`\n=== Analyzing ${objectName} ===`);
            
            // Get object metadata and relationships
            const metadata = await metadataService.getObjectMetadata(TEST_USER_ID, objectName);
            const relationships = await metadataService.getObjectRelationships(TEST_USER_ID, objectName);
            
            // Basic Info
            console.log(`\nBasic Information:`);
            console.log(`- Total Fields: ${metadata.fields.length}`);
            console.log(`- API Name: ${metadata.name}`);
            console.log(`- Label: ${metadata.label}`);
            
            // Relationship Analysis
            console.log('\nRelationship Analysis:');
            
            // Lookup Fields
            if (relationships.lookups.size > 0) {
                console.log('\n1. Lookup Relationships:');
                for (const [fieldName, referenceTo] of relationships.lookups) {
                    console.log(`   • ${fieldName} → ${referenceTo.join(', ')}`);
                }
            }

            // Master-Detail Fields
            if (relationships.masterDetail.size > 0) {
                console.log('\n2. Master-Detail Relationships:');
                for (const [fieldName, referenceTo] of relationships.masterDetail) {
                    console.log(`   • ${fieldName} → ${referenceTo.join(', ')}`);
                }
            }

            // Formula Fields
            if (relationships.formulaFields.size > 0) {
                console.log('\n3. Formula Fields:');
                for (const [fieldName, details] of relationships.formulaFields) {
                    console.log(`   • ${fieldName}:`);
                    console.log(`     Formula: ${details.formula.substring(0, 100)}...`);
                    if (details.dependencies.length > 0) {
                        console.log('     Dependencies:');
                        details.dependencies.forEach(dep => {
                            console.log(`       - ${dep.type}: ${dep.field}`);
                        });
                    }
                }
            }

            // Validation Rules
            if (relationships.validationRules.size > 0) {
                console.log('\n4. Validation Rules:');
                for (const [ruleName, details] of relationships.validationRules) {
                    console.log(`   • ${ruleName}:`);
                    console.log(`     Formula: ${details.formula.substring(0, 100)}...`);
                    if (details.dependencies.length > 0) {
                        console.log('     Field Dependencies:');
                        details.dependencies.forEach(dep => {
                            console.log(`       - ${dep.type}: ${dep.field}`);
                        });
                    }
                }
            }

            console.log('\n' + '='.repeat(50));
        }

        // Test 4: Cache expiry and auto-refresh
        console.log('\nTest 4: Testing cache management...');
        // Force cache to expire by manipulating lastLoadTime
        const userCache = metadataService._getUserCache(TEST_USER_ID);
        userCache.lastLoadTime = Date.now() - (metadataService.CACHE_TTL + 1000);
        
        // This should trigger a refresh
        console.log('Accessing data after cache expiry...');
        await metadataService.getAllObjects(TEST_USER_ID);
        console.log('✓ Cache refreshed successfully\n');

        console.log('=== All Tests Completed Successfully ===\n');

    } catch (error) {
        console.error('\nTest failed:', error);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error details:', error.response.data);
        }
    }
}

// Run the tests
testMetadataService(); 