const express = require('express');
const { getAuthUrl, exchangeCodeForTokens } = require('./config/salesforce');
const { validateConfig } = require('./config/config');
const app = express();
const port = process.env.PORT || 3000;

// Validate configuration before starting
try {
    validateConfig();
    console.log('Configuration validated successfully');
} catch (error) {
    console.error('Configuration error:', error.message);
    process.exit(1);
}

// Test user ID (zelfde als in de tests)
const TEST_USER_ID = 'test-user-1';

// Route om de OAuth flow te starten
app.get('/oauth/start', (req, res) => {
    try {
        const authUrl = getAuthUrl(TEST_USER_ID);
        console.log('Redirecting to Salesforce login:', authUrl);
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error starting OAuth flow:', error);
        res.status(500).send('Error starting OAuth flow: ' + error.message);
    }
});

// Route voor de OAuth callback
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    console.log('Received code:', code);
    
    try {
        // Exchange de code voor tokens
        const tokens = await exchangeCodeForTokens(code, TEST_USER_ID);
        console.log('Tokens received successfully!');
        console.log('Access Token:', tokens.access_token.substring(0, 10) + '...');
        console.log('Instance URL:', tokens.instance_url);
        
        // HTML response met success message
        res.send(`
            <html>
                <head>
                    <title>Authorization Successful</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 800px;
                            margin: 40px auto;
                            padding: 20px;
                            text-align: center;
                        }
                        .success-box {
                            background: #e6ffe6;
                            padding: 20px;
                            border-radius: 5px;
                            margin: 20px 0;
                            border: 1px solid #99ff99;
                        }
                        .details {
                            background: #f5f5f5;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                            text-align: left;
                        }
                    </style>
                </head>
                <body>
                    <div class="success-box">
                        <h1>✅ Authorization Successful!</h1>
                        <p>Your Salesforce connection has been established successfully.</p>
                    </div>
                    <div class="details">
                        <h2>Connection Details:</h2>
                        <p><strong>Instance URL:</strong> ${tokens.instance_url}</p>
                        <p><strong>Access Token:</strong> ${tokens.access_token.substring(0, 10)}...</p>
                        <p><strong>Expires In:</strong> ${Math.round((tokens.expires_at - Date.now()) / 1000 / 60)} minutes</p>
                    </div>
                    <p>You can now close this window and return to the terminal.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).send(`
            <html>
                <head>
                    <title>Authorization Failed</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 800px;
                            margin: 40px auto;
                            padding: 20px;
                            text-align: center;
                        }
                        .error-box {
                            background: #ffe6e6;
                            padding: 20px;
                            border-radius: 5px;
                            margin: 20px 0;
                            border: 1px solid #ff9999;
                        }
                        .error-details {
                            background: #f5f5f5;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                            text-align: left;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-box">
                        <h1>❌ Authorization Failed</h1>
                        <p>There was an error establishing the Salesforce connection.</p>
                    </div>
                    <div class="error-details">
                        <h2>Error Details:</h2>
                        <p><strong>Error:</strong> ${error.message}</p>
                        ${error.errorCode ? `<p><strong>Error Code:</strong> ${error.errorCode}</p>` : ''}
                        ${error.statusCode ? `<p><strong>Status Code:</strong> ${error.statusCode}</p>` : ''}
                    </div>
                    <p>Please try again or contact support if the problem persists.</p>
                </body>
            </html>
        `);
    }
});

// Start de server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`\nTo start OAuth flow, visit:`);
    console.log(`http://localhost:${port}/oauth/start`);
}); 