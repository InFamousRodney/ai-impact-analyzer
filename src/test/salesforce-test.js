require('dotenv').config();
const { getAuthUrl, exchangeCodeForTokens, getValidAccessToken, isTokenExpired } = require('../config/salesforce');

// Test gebruiker ID (in een echte app zou dit een echte user ID zijn)
const TEST_USER_ID = 'test-user-1';

async function testSalesforceConnection() {
    try {
        // Test 1: Genereer auth URL
        console.log('1. Generating authorization URL...');
        const authUrl = getAuthUrl(TEST_USER_ID);
        console.log('Authorization URL:', authUrl);
        console.log('\n2. Open deze URL in je browser om in te loggen bij Salesforce');
        console.log('3. Na inloggen word je doorgestuurd naar de callback URL met een code');
        console.log('4. Kopieer de code uit de URL en voer deze in:');

        // Wacht op gebruikersinput voor de code
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        readline.question('Voer de code in: ', async (code) => {
            try {
                // Test 2: Exchange code voor tokens
                console.log('\nExchanging code for tokens...');
                const tokens = await exchangeCodeForTokens(code, TEST_USER_ID);
                console.log('Tokens received successfully!');
                console.log('Instance URL:', tokens.instance_url);

                // Test 3: Get valid access token
                console.log('\nGetting valid access token...');
                const accessToken = await getValidAccessToken(TEST_USER_ID);
                console.log('Access token received successfully!');
                console.log('Access token:', accessToken.substring(0, 10) + '...'); // Log alleen de eerste 10 karakters voor veiligheid

                // Test 4: Check token expiration
                console.log('\nChecking token expiration...');
                const expired = isTokenExpired(TEST_USER_ID);
                console.log('Token expired:', expired);

            } catch (error) {
                console.error('\nError during testing:', error.message);
                if (error.statusCode) {
                    console.error('Status code:', error.statusCode);
                    console.error('Error code:', error.errorCode);
                }
            } finally {
                readline.close();
            }
        });

    } catch (error) {
        console.error('Error during testing:', error.message);
    }
}

async function testOAuthFlow() {
    try {
        // 1. Start OAuth flow
        console.log('1. Start OAuth flow...');
        const authUrl = getAuthUrl(TEST_USER_ID);
        console.log('\nOpen deze URL in je browser:');
        console.log(authUrl);
        
        // 2. Wacht op handmatige input van de code
        console.log('\n2. Na inloggen krijg je een code. Plak die hier en druk op Enter:');
        
        // Gebruik readline voor input
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Wacht op de code via een Promise
        const code = await new Promise(resolve => readline.question('Code: ', resolve));
        readline.close();

        // 3. Wissel de code in voor tokens
        console.log('\n3. Code wordt omgewisseld voor tokens...');
        const tokens = await exchangeCodeForTokens(code, TEST_USER_ID);
        
        console.log('\nGelukt! Tokens ontvangen:');
        console.log('- Access Token:', tokens.access_token.substring(0, 10) + '...');
        console.log('- Instance URL:', tokens.instance_url);
        console.log('- Verloopt op:', new Date(tokens.expires_at).toLocaleString());

    } catch (error) {
        console.error('\nError tijdens OAuth flow:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        }
    }
}

// Run alleen de OAuth flow test
testOAuthFlow(); 
// testSalesforceConnection();  // Uitgecommentaard om verwarring te voorkomen 