const logger = require('../utils/logger');

class ImpactAnalyzer {
    constructor(metadataService) {
        this.metadataService = metadataService;
    }

    /**
     * Analyzes where a field is being used in various metadata elements
     * @param {string} userId - The user ID
     * @param {string} objectName - The Salesforce object name
     * @param {string} fieldName - The field to analyze
     * @returns {Promise<Object>} - Analysis results
     */
    async analyzeFieldUsage(userId, objectName, fieldName) {
        const usage = {
            field: {
                name: fieldName,
                object: objectName
            },
            metadataElements: {
                formulas: [],      // Formula fields using this field
                validations: [],   // Validation rules using this field
                lookups: [],       // Fields referencing this field
                processBuilder: [], // Process Builder flows using this field
                flows: []          // Flow Builder flows using this field
            },
            summary: {
                totalUsage: 0,
                riskLevel: 'LOW'   // LOW, MEDIUM, HIGH
            }
        };

        try {
            // Get all relationships for the object
            const relationships = await this.metadataService.getObjectRelationships(userId, objectName);
            if (!relationships) {
                throw new Error(`No relationships found for object ${objectName}`);
            }

            // Check formula fields
            for (const [formulaField, details] of relationships.formulaFields) {
                if (this._isFieldUsedInFormula(fieldName, details.formula)) {
                    usage.metadataElements.formulas.push({
                        name: formulaField,
                        formula: details.formula
                    });
                }
            }

            // Check validation rules
            for (const [ruleName, details] of relationships.validationRules) {
                if (this._isFieldUsedInFormula(fieldName, details.formula)) {
                    usage.metadataElements.validations.push({
                        name: ruleName,
                        formula: details.formula
                    });
                }
            }

            // Check lookups
            for (const [lookupField, referenceTo] of relationships.lookups) {
                if (referenceTo.includes(fieldName)) {
                    usage.metadataElements.lookups.push({
                        field: lookupField,
                        references: referenceTo
                    });
                }
            }

            // Calculate summary
            usage.summary.totalUsage = this._calculateTotalUsage(usage.metadataElements);
            usage.summary.riskLevel = this._determineRiskLevel(usage.summary.totalUsage);

            // Log the analysis results
            logger.log(`Field usage analysis completed for ${objectName}.${fieldName}`, {
                component: 'impact-analyzer',
                usage: usage.summary,
                elements: {
                    formulas: usage.metadataElements.formulas.length,
                    validations: usage.metadataElements.validations.length,
                    lookups: usage.metadataElements.lookups.length
                }
            });

            return usage;

        } catch (error) {
            logger.error(`Failed to analyze field usage for ${objectName}.${fieldName}`, error);
            throw error;
        }
    }

    /**
     * Checks if a field is used in a formula
     * @private
     */
    _isFieldUsedInFormula(fieldName, formula) {
        if (!formula) return false;
        
        // Check for direct field reference
        const directFieldRegex = new RegExp(`\\b${fieldName}\\b`);
        if (directFieldRegex.test(formula)) return true;

        // Check for relationship field reference (e.g., Account.Name)
        const relationshipRegex = new RegExp(`\\b\\w+\\.${fieldName}\\b`);
        return relationshipRegex.test(formula);
    }

    /**
     * Calculates total usage across all metadata elements
     * @private
     */
    _calculateTotalUsage(metadataElements) {
        return (
            metadataElements.formulas.length +
            metadataElements.validations.length +
            metadataElements.lookups.length +
            metadataElements.processBuilder.length +
            metadataElements.flows.length
        );
    }

    /**
     * Determines risk level based on total usage
     * @private
     */
    _determineRiskLevel(totalUsage) {
        if (totalUsage === 0) return 'LOW';
        if (totalUsage <= 3) return 'MEDIUM';
        return 'HIGH';
    }
}

module.exports = ImpactAnalyzer; 