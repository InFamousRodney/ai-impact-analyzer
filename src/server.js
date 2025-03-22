const express = require('express');
const app = express();
const port = 3000;

// Route voor de OAuth callback
app.get('/oauth/callback', (req, res) => {
    const code = req.query.code;
    console.log('Received code:', code);
    
    // HTML response met de code en een kopieerknop
    res.send(`
        <html>
            <head>
                <title>Authorization Code Received</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 40px auto;
                        padding: 20px;
                    }
                    .code-box {
                        background: #f5f5f5;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 20px 0;
                        word-break: break-all;
                    }
                    .copy-button {
                        background: #0070f3;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    .copy-button:hover {
                        background: #0051b3;
                    }
                </style>
            </head>
            <body>
                <h1>Authorization Code Received</h1>
                <p>Your authorization code is:</p>
                <div class="code-box">${code}</div>
                <button class="copy-button" onclick="navigator.clipboard.writeText('${code}')">Copy Code</button>
                <p>You can now close this window and return to the terminal to enter this code.</p>
                <script>
                    // Automatisch de code kopiëren
                    navigator.clipboard.writeText('${code}').then(() => {
                        alert('Code copied to clipboard!');
                    });
                </script>
            </body>
        </html>
    `);
});

// Start de server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 