// Laad config zoals clientId, redirectUri en loginUrl uit je .env
const { config } = require('./config');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Basis URL voor Salesforce OAuth
const AUTH_ENDPOINT = '/services/oauth2/authorize';
const TOKEN_ENDPOINT = '/services/oauth2/token';

// Token storage file path
const TOKEN_STORAGE_PATH = path.join(__dirname, '../../.tokens.json');

// Load tokens from file
function loadTokens() {
    try {
        if (fs.existsSync(TOKEN_STORAGE_PATH)) {
            const data = fs.readFileSync(TOKEN_STORAGE_PATH, 'utf8');
            return new Map(Object.entries(JSON.parse(data)));
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
    }
    return new Map();
}

// Save tokens to file
function saveTokens(tokens) {
    try {
        const data = JSON.stringify(Object.fromEntries(tokens));
        fs.writeFileSync(TOKEN_STORAGE_PATH, data, 'utf8');
    } catch (error) {
        console.error('Error saving tokens:', error);
    }
}

// Token storage per gebruiker
const userTokens = loadTokens();

// PKCE code verifier storage per gebruiker
const userCodeVerifiers = new Map();

// Custom error classes voor verschillende soorten fouten
class SalesforceAuthError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.name = 'SalesforceAuthError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}

class SalesforceTokenError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.name = 'SalesforceTokenError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}

// Helper functie om API errors te analyseren
function analyzeApiError(error) {
    if (!error.response) {
        // Netwerk error
        return new SalesforceAuthError(
            'Network error while connecting to Salesforce',
            0,
            'NETWORK_ERROR'
        );
    }

    const { status, data } = error.response;
    
    // 4xx errors (client errors)
    if (status >= 400 && status < 500) {
        switch (status) {
            case 400:
                return new SalesforceAuthError(
                    'Invalid request parameters',
                    status,
                    data.error || 'INVALID_REQUEST'
                );
            case 401:
                return new SalesforceAuthError(
                    'Authentication failed',
                    status,
                    data.error || 'AUTH_FAILED'
                );
            case 403:
                return new SalesforceAuthError(
                    'Insufficient permissions',
                    status,
                    data.error || 'INSUFFICIENT_PERMISSIONS'
                );
            default:
                return new SalesforceAuthError(
                    data.error_description || 'Client error occurred',
                    status,
                    data.error || 'CLIENT_ERROR'
                );
        }
    }
    
    // 5xx errors (server errors)
    if (status >= 500) {
        return new SalesforceAuthError(
            'Salesforce server error occurred',
            status,
            data.error || 'SERVER_ERROR'
        );
    }

    // Onbekende errors
    return new SalesforceAuthError(
        'Unknown error occurred',
        status,
        data.error || 'UNKNOWN_ERROR'
    );
}

// Helper functie om PKCE code verifier te genereren
function generateCodeVerifier() {
    // Genereer 32 bytes (256 bits) voor hoge entropie
    const buffer = crypto.randomBytes(32);
    
    // Converteer naar base64url (RFC 7636)
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')  // Vervang + door -
        .replace(/\//g, '_')  // Vervang / door _
        .replace(/=/g, '');   // Verwijder padding =
}

// Helper functie om PKCE code challenge te genereren
function generateCodeChallenge(verifier) {
    // Gebruik SHA-256 voor de hash
    const hash = crypto.createHash('sha256');
    
    // Update hash met de code verifier
    hash.update(verifier);
    
    // Genereer base64url hash
    return hash
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Helper functie om te valideren of een code verifier voldoet aan de specificaties
function validateCodeVerifier(verifier) {
    // Check minimale lengte (43-128 tekens volgens RFC 7636)
    if (verifier.length < 43 || verifier.length > 128) {
        throw new SalesforceAuthError(
            'Code verifier length must be between 43 and 128 characters',
            400,
            'INVALID_CODE_VERIFIER_LENGTH'
        );
    }

    // Check of het alleen toegestane karakters bevat
    if (!/^[A-Za-z0-9\-._~]+$/.test(verifier)) {
        throw new SalesforceAuthError(
            'Code verifier contains invalid characters',
            400,
            'INVALID_CODE_VERIFIER_CHARS'
        );
    }

    return true;
}

// Hoofdfunctie om de OAuth flow te starten
function getAuthUrl(userId) {
    const codeVerifier = generateCodeVerifier();
    
    // Valideer de gegenereerde code verifier
    validateCodeVerifier(codeVerifier);
    
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Sla code verifier op voor deze gebruiker
    userCodeVerifiers.set(userId, codeVerifier);
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: 'api refresh_token'
    });

    return `${config.loginUrl}${AUTH_ENDPOINT}?${params.toString()}`;
}

// Token exchange functie
async function exchangeCodeForTokens(code, userId) {
    try {
        const codeVerifier = userCodeVerifiers.get(userId);
        if (!codeVerifier) {
            throw new SalesforceAuthError(
                'No code verifier found for this user. Please start the OAuth flow again.',
                400,
                'MISSING_CODE_VERIFIER'
            );
        }

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            code_verifier: codeVerifier
        });

        const response = await axios.post(`${config.loginUrl}${TOKEN_ENDPOINT}`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        userTokens.set(userId, {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            instance_url: response.data.instance_url,
            expires_at: Date.now() + (response.data.expires_in * 1000)
        });

        // Save tokens after updating
        saveTokens(userTokens);

        userCodeVerifiers.delete(userId);
        return userTokens.get(userId);
    } catch (error) {
        throw analyzeApiError(error);
    }
}

// Refresh token functie
async function refreshAccessToken(userId) {
    try {
        const userToken = userTokens.get(userId);
        if (!userToken) {
            throw new SalesforceTokenError(
                'No tokens found for this user. Please authenticate first.',
                401,
                'MISSING_TOKENS'
            );
        }

        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: userToken.refresh_token
        });

        const response = await axios.post(`${config.loginUrl}${TOKEN_ENDPOINT}`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        userTokens.set(userId, {
            ...userToken,
            access_token: response.data.access_token,
            expires_at: Date.now() + (response.data.expires_in * 1000)
        });

        // Save tokens after updating
        saveTokens(userTokens);

        return userTokens.get(userId).access_token;
    } catch (error) {
        throw analyzeApiError(error);
    }
}

// Helper functie om te checken of we tokens hebben
function hasTokens(userId) {
    const userToken = userTokens.get(userId);
    return !!userToken?.access_token && !!userToken?.refresh_token;
}

// Helper functie om te controleren of een token verlopen is
function isTokenExpired(userId) {
    const userToken = userTokens.get(userId);
    if (!userToken) return true;
    
    // Voeg een veiligheidsmarge toe van 5 minuten
    const safetyMargin = 5 * 60 * 1000; // 5 minuten in milliseconds
    return Date.now() >= (userToken.expires_at - safetyMargin);
}

// Functie om een geldig access token te krijgen
async function getValidAccessToken(userId) {
    try {
        const userToken = userTokens.get(userId);
        if (!userToken) {
            throw new SalesforceTokenError(
                'No tokens found for this user. Please authenticate first.',
                401,
                'MISSING_TOKENS'
            );
        }

        if (isTokenExpired(userId)) {
            console.log('Access token expired, refreshing...');
            await refreshAccessToken(userId);
        }

        return userTokens.get(userId).access_token;
    } catch (error) {
        if (error instanceof SalesforceTokenError) {
            throw error;
        }
        throw analyzeApiError(error);
    }
}

// Exporteer de functies
module.exports = {
    getAuthUrl,
    exchangeCodeForTokens,
    getValidAccessToken,
    isTokenExpired,
    refreshAccessToken,
    hasTokens,
    userTokens
};