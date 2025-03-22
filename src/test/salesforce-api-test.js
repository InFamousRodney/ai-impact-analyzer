require('dotenv').config();
const { getValidAccessToken, userTokens } = require('../config/salesforce');
const axios = require('axios');

// Test gebruiker ID (zelfde als in de auth test)
const TEST_USER_ID = 'test-user-1';

async function testSalesforceApi() {
    try {
        // 1. Haal een geldig access token op
        console.log('1. Getting valid access token...');
        const accessToken = await getValidAccessToken(TEST_USER_ID);
        console.log('Access token received successfully!');

        // Haal instance URL op
        const userToken = userTokens.get(TEST_USER_ID);
        if (!userToken || !userToken.instance_url) {
            throw new Error('No instance URL found. Please authenticate first.');
        }

        const apiVersion = process.env.SF_API_VERSION.replace('v', '');
        const baseUrl = `${userToken.instance_url}/services/data/v${apiVersion}`;
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };

        // 2. Haal metadata en records op voor elk object
        const objects = ['Account', 'Lead', 'Contact', 'Opportunity'];
        
        for (const objectName of objects) {
            console.log(`\n${'-'.repeat(50)}`);
            console.log(`\nFetching ${objectName} metadata and records...`);
            
            // Haal metadata op
            const metadataResponse = await axios.get(`${baseUrl}/sobjects/${objectName}/describe`, { headers });
            
            // Filter de belangrijke velden
            const importantFields = metadataResponse.data.fields
                .filter(field => {
                    const name = field.name.toLowerCase();
                    return name.includes('id') || 
                           name.includes('name') || 
                           name.includes('owner') ||
                           name.includes('type') ||
                           name.includes('status') ||
                           name.includes('email') ||
                           name.includes('phone') ||
                           name.includes('company') ||
                           name.includes('title') ||
                           name.includes('stage') ||
                           name.includes('amount');
                })
                .slice(0, 5);

            // Toon metadata
            console.log(`\n${objectName} fields:`);
            importantFields.forEach(field => {
                const isRequired = field.nillable ? '' : ' (Required)';
                const isCustom = field.custom ? ' (Custom)' : '';
                console.log(`- ${field.name} (${field.label})${isRequired}${isCustom}`);
                if (field.picklistValues && field.picklistValues.length > 0) {
                    console.log('  Possible values:', field.picklistValues.map(v => v.label).join(', '));
                }
            });

            // Bouw SOQL query voor deze velden
            const fieldNames = importantFields.map(f => f.name).join(',');
            const query = `SELECT ${fieldNames} FROM ${objectName} LIMIT 5`;
            
            // Haal records op
            const recordsResponse = await axios.get(
                `${baseUrl}/query?q=${encodeURIComponent(query)}`,
                { headers }
            );

            // Toon records
            console.log(`\n${objectName} records:`);
            if (recordsResponse.data.records.length === 0) {
                console.log('No records found');
            } else {
                recordsResponse.data.records.forEach((record, index) => {
                    console.log(`\nRecord ${index + 1}:`);
                    importantFields.forEach(field => {
                        const value = record[field.name];
                        if (value !== null && value !== undefined) {
                            console.log(`  ${field.label}: ${value}`);
                        }
                    });
                });
            }
        }

    } catch (error) {
        console.error('\nError during API testing:', error.message);
        if (error.response) {
            console.error('Status code:', error.response.status);
            console.error('Error details:', error.response.data);
        }
    }
}

// Run de tests
testSalesforceApi(); 