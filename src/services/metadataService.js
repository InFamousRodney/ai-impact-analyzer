const axios = require('axios');
const { getValidAccessToken, userTokens } = require('../config/salesforce');
const logger = require('../utils/logger');

class MetadataService {
    constructor() {
        // Separate cache per user
        this.userCaches = new Map();
        this.CACHE_TTL = 1000 * 60 * 60; // 1 hour cache
        this.BATCH_SIZE = 5; // Number of parallel API calls
        this.autoRefreshTimeout = null;
    }

    // Get or create user cache
    _getUserCache(userId) {
        if (!this.userCaches.has(userId)) {
            this.userCaches.set(userId, {
                metadataByObject: new Map(),
                relationships: new Map(),
                isLoading: false,
                lastLoadTime: null,
                refreshPromise: null
            });
        }
        return this.userCaches.get(userId);
    }

    async initialize(userId) {
        const userCache = this._getUserCache(userId);
        
        if (userCache.isLoading) {
            throw new Error('Metadata service is already initializing');
        }

        try {
            userCache.isLoading = true;
            await this._loadAllMetadata(userId);
            userCache.lastLoadTime = Date.now();
            
            // Schedule auto-refresh
            this._scheduleAutoRefresh(userId);
            
            logger.log(`Metadata initialized for user ${userId}`);
        } catch (error) {
            logger.error(`Failed to initialize metadata for user ${userId}`, error);
            throw error;
        } finally {
            userCache.isLoading = false;
        }
    }

    async _loadAllMetadata(userId) {
        const userCache = this._getUserCache(userId);
        
        try {
            // Get access token and instance URL
            const accessToken = await getValidAccessToken(userId);
            const userToken = userTokens.get(userId);
            
            if (!userToken?.instance_url) {
                throw new Error('No instance URL found. Please authenticate first.');
            }

            const apiVersion = process.env.SF_API_VERSION.replace('v', '');
            const baseUrl = `${userToken.instance_url}/services/data/v${apiVersion}`;
            const headers = { 'Authorization': `Bearer ${accessToken}` };

            // 1. Get list of all objects
            logger.log('Fetching global describe from Salesforce');
            const globalDescribe = await axios.get(`${baseUrl}/sobjects`, { headers });
            const objects = globalDescribe.data.sobjects
                .map(obj => obj.name);

            logger.log(`Found ${objects.length} Salesforce objects to process`);

            // 2. Load metadata in parallel batches
            const batches = this._chunkArray(objects, this.BATCH_SIZE);
            let processedCount = 0;
            
            for (const batch of batches) {
                const batchPromises = batch.map(async objectName => {
                    try {
                        const response = await axios.get(
                            `${baseUrl}/sobjects/${objectName}/describe`,
                            { headers }
                        );
                        
                        // Store metadata and extract relationships
                        userCache.metadataByObject.set(objectName, response.data);
                        const relationships = this._extractRelationships(objectName, response.data);
                        userCache.relationships.set(objectName, relationships);
                        
                        processedCount++;
                        logger.logMetadataProgress(objectName, processedCount, objects.length, {
                            fields: response.data.fields.length,
                            relationships: {
                                lookups: relationships.lookups.size,
                                masterDetail: relationships.masterDetail.size,
                                formulaFields: relationships.formulaFields.size,
                                validationRules: relationships.validationRules.size
                            }
                        });

                        // Log detailed relationships
                        logger.logRelationships(objectName, relationships);

                        return { success: true, objectName };
                    } catch (error) {
                        logger.error(`Failed to load metadata for ${objectName}`, error);
                        return { success: false, objectName, error: error.message };
                    }
                });

                const results = await Promise.all(batchPromises);
                const failures = results.filter(r => !r.success);
                if (failures.length > 0) {
                    logger.error(`Failed to load metadata for ${failures.length} objects in batch`, {
                        failedObjects: failures.map(f => f.objectName)
                    });
                }
            }

            logger.log(`Completed metadata load for ${objects.length} objects`, {
                component: 'metadata-service',
                summary: {
                    totalObjects: objects.length,
                    cachedObjects: userCache.metadataByObject.size,
                    relationshipsMapped: userCache.relationships.size
                }
            });

        } catch (error) {
            logger.error('Failed to load metadata', error);
            throw error;
        }
    }

    _extractRelationships(objectName, metadata) {
        try {
            const relationships = {
                fields: new Map(),
                lookups: new Map(),
                masterDetail: new Map(),
                formulaFields: new Map(),
                validationRules: new Map(),
                workflows: new Map()
            };

            // Process fields
            metadata.fields?.forEach(field => {
                try {
                    // Store field metadata
                    const fieldMeta = {
                        type: field.type,
                        referenceTo: field.referenceTo,
                        relationshipName: field.relationshipName,
                        formula: field.calculatedFormula,
                        dependencies: this._extractFieldDependencies(field)
                    };
                    relationships.fields.set(field.name, fieldMeta);

                    // Handle lookups
                    if (field.type === 'reference' && field.referenceTo) {
                        relationships.lookups.set(field.name, field.referenceTo);
                    }

                    // Handle master-detail
                    if (field.type === 'reference' && field.relationshipName) {
                        const isMasterDetail = field.relationshipOrder === 0;
                        if (isMasterDetail) {
                            relationships.masterDetail.set(field.name, field.referenceTo);
                        }
                    }

                    // Handle formula fields
                    if (field.calculatedFormula) {
                        relationships.formulaFields.set(field.name, {
                            formula: field.calculatedFormula,
                            dependencies: this._parseFormulaExpression(field.calculatedFormula)
                        });
                    }
                } catch (error) {
                    logger.error(`Error processing field ${field.name}`, error);
                }
            });

            // Store validation rules
            metadata.validationRules?.forEach(rule => {
                try {
                    relationships.validationRules.set(rule.name, {
                        formula: rule.errorConditionFormula,
                        dependencies: this._parseFormulaExpression(rule.errorConditionFormula)
                    });
                } catch (error) {
                    logger.error(`Error processing validation rule ${rule.name}`, error);
                }
            });

            return relationships;
        } catch (error) {
            logger.error(`Error extracting relationships for ${objectName}`, error);
            return null;
        }
    }

    // Helper method to extract field dependencies
    _extractFieldDependencies(field) {
        const dependencies = [];

        // Add reference field dependencies
        if (field.referenceTo) {
            dependencies.push(...field.referenceTo.map(ref => ({
                type: 'reference',
                object: ref
            })));
        }

        // Add formula dependencies if present
        if (field.calculatedFormula) {
            dependencies.push(...this._parseFormulaExpression(field.calculatedFormula));
        }

        return dependencies;
    }

    // Placeholder for formula parsing - to be enhanced later
    _parseFormulaExpression(formula) {
        if (!formula) return [];
        
        const dependencies = [];
        // Basic regex to find potential field references
        // This is a simplified version - would need more robust parsing in production
        const fieldRegex = /\b[a-zA-Z_]+__c\b|\b[a-zA-Z_]+\.[a-zA-Z_]+\b/g;
        const matches = formula.match(fieldRegex) || [];
        
        matches.forEach(match => {
            if (match.includes('.')) {
                const [object, field] = match.split('.');
                dependencies.push({
                    type: 'cross_object',
                    object,
                    field
                });
            } else {
                dependencies.push({
                    type: 'field',
                    field: match
                });
            }
        });

        return dependencies;
    }

    // Auto-refresh mechanism
    _scheduleAutoRefresh(userId) {
        const userCache = this._getUserCache(userId);
        const timeUntilExpiry = this.CACHE_TTL - (Date.now() - userCache.lastLoadTime);
        
        if (this.autoRefreshTimeout) {
            clearTimeout(this.autoRefreshTimeout);
        }

        this.autoRefreshTimeout = setTimeout(async () => {
            logger.log(`Auto-refreshing metadata for user ${userId}`);
            try {
                await this.initialize(userId);
            } catch (error) {
                logger.error(`Auto-refresh failed for user ${userId}`, error);
            }
        }, Math.max(0, timeUntilExpiry));
    }

    // Helper method to chunk array for batch processing
    _chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // Public methods with improved error handling
    async getObjectMetadata(userId, objectName) {
        await this._ensureValidCache(userId);
        const userCache = this._getUserCache(userId);
        return userCache.metadataByObject.get(objectName);
    }

    async getObjectRelationships(userId, objectName) {
        await this._ensureValidCache(userId);
        const userCache = this._getUserCache(userId);
        return userCache.relationships.get(objectName);
    }

    async getAllObjects(userId) {
        await this._ensureValidCache(userId);
        const userCache = this._getUserCache(userId);
        return Array.from(userCache.metadataByObject.keys());
    }

    async getFieldMetadata(userId, objectName, fieldName) {
        await this._ensureValidCache(userId);
        const userCache = this._getUserCache(userId);
        const objectMetadata = userCache.metadataByObject.get(objectName);
        if (!objectMetadata) return null;
        
        return objectMetadata.fields.find(f => f.name === fieldName);
    }

    // Ensure cache is valid, refresh if needed
    async _ensureValidCache(userId) {
        const userCache = this._getUserCache(userId);
        
        if (!userCache.lastLoadTime) {
            logger.log(`Initializing metadata for user ${userId}`);
            await this.initialize(userId);
            return;
        }

        const cacheAge = Date.now() - userCache.lastLoadTime;
        if (cacheAge >= this.CACHE_TTL) {
            logger.log(`Refreshing expired metadata for user ${userId}`);
            await this.initialize(userId);
        }
    }
}

// Export singleton instance
module.exports = new MetadataService(); 