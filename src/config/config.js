require('dotenv').config();

// 1. Configuratie object met alle benodigde variabelen
const config = {
    clientId: process.env.SF_CLIENT_ID,
    clientSecret: process.env.SF_CLIENT_SECRET,
    redirectUri: process.env.SF_REDIRECT_URI,
    loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
    apiVersion: process.env.SF_API_VERSION || 'v57.0'
};

// 2. Validatie functie die controleert of alle benodigde variabelen aanwezig zijn
function validateConfig() {
    const missing = [];

    if (!config.clientId) missing.push('SF_CLIENT_ID');
    if (!config.clientSecret) missing.push('SF_CLIENT_SECRET');
    if (!config.redirectUri) missing.push('SF_REDIRECT_URI');
    if (!config.loginUrl) missing.push('SF_LOGIN_URL');

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// 3. Exporteer de configuratie
module.exports = {
    config,
    validateConfig  
};
