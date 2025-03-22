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

// Run de tests
testSalesforceConnection(); 