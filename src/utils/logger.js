const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Log file paths
const LOG_FILE = path.join(logsDir, 'metadata-service.log');
const ERROR_LOG_FILE = path.join(logsDir, 'errors.log');

class Logger {
    constructor() {
        // Create or append to log files
        fs.writeFileSync(LOG_FILE, '', { flag: 'a' });
        fs.writeFileSync(ERROR_LOG_FILE, '', { flag: 'a' });
    }

    _writeToFile(logFile, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...data
        };

        fs.appendFileSync(
            logFile,
            JSON.stringify(logEntry) + '\n'
        );
    }

    log(message, data = {}) {
        const logData = {
            type: 'log',
            message,
            ...data
        };

        // Write to console
        console.log(message);
        
        // Write to file
        this._writeToFile(LOG_FILE, logData);
    }

    error(message, error = null) {
        const logData = {
            type: 'error',
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                ...error
            } : null
        };

        // Write to console
        console.error(message);
        if (error) {
            console.error(error);
        }

        // Write to file
        this._writeToFile(ERROR_LOG_FILE, logData);
    }

    // Specifieke loggers voor de metadata service
    logMetadataProgress(objectName, current, total, additionalData = {}) {
        this.log(`Processing ${objectName} (${current}/${total})`, {
            component: 'metadata-service',
            progress: {
                object: objectName,
                current,
                total,
                percentage: ((current / total) * 100).toFixed(1)
            },
            ...additionalData
        });
    }

    logRelationships(objectName, relationships) {
        this.log(`Found relationships for ${objectName}`, {
            component: 'metadata-service',
            object: objectName,
            relationships: {
                lookups: Array.from(relationships.lookups.entries()),
                masterDetail: Array.from(relationships.masterDetail.entries()),
                formulaFields: Array.from(relationships.formulaFields.entries()),
                validationRules: Array.from(relationships.validationRules.entries())
            }
        });
    }
}

// Export singleton instance
module.exports = new Logger(); 