import { 
  AgentType, 
  AgentMessage, 
  MessageType, 
  Priority,
  AgentCommunicationBus 
} from "@shared/protocols/agent-communication";
import { BaseAgent, Task } from "./base-agent";
import { db } from "../db";
import { properties } from "@shared/washington-schema";
import { eq, and, or, not, gt, lt, between, isNull, sql } from "drizzle-orm";
import { z } from "zod";

// Map of Washington State assessment regulations by category
const WASHINGTON_REGULATIONS = {
  PROPERTY_CLASSIFICATION: [
    {
      id: "WAC-458-53-030",
      name: "Property classification - Land use codes",
      description: "Properties must be classified according to Washington Administrative Code land use codes",
      checkFunction: "validateLandUseCode"
    },
    {
      id: "WAC-458-07-030",
      name: "Property classification - Residential vs Commercial",
      description: "Properties must be correctly classified as residential, commercial, or other approved categories",
      checkFunction: "validatePropertyType"
    }
  ],
  VALUATION_RULES: [
    {
      id: "RCW-84.40.030",
      name: "Valuation of property - Basis",
      description: "Property should be valued at 100% of its true and fair market value",
      checkFunction: "validateMarketValueAlignment"
    },
    {
      id: "RCW-84.40.0301",
      name: "Valuation - Mathematical consistency",
      description: "Total value must equal sum of land value and improvements value",
      checkFunction: "validateValueConsistency"
    }
  ],
  EXEMPTION_RULES: [
    {
      id: "RCW-84.36",
      name: "Exemption eligibility verification",
      description: "Properties claiming exemptions must meet qualification requirements",
      checkFunction: "validateExemptionEligibility"
    },
    {
      id: "RCW-84.36.381",
      name: "Senior/disabled person exemption requirements",
      description: "Senior/disabled exemptions must meet income and occupancy requirements",
      checkFunction: "validateSeniorExemption"
    }
  ],
  ASSESSMENT_CYCLE: [
    {
      id: "RCW-84.41.030",
      name: "Assessment cycle compliance",
      description: "Properties must be revalued on the county's established revaluation cycle",
      checkFunction: "validateAssessmentCycle"
    },
    {
      id: "RCW-84.40.040",
      name: "Listing deadline compliance",
      description: "Property listings must be completed by assessment deadlines",
      checkFunction: "validateListingDeadlines"
    }
  ],
  DOCUMENTATION: [
    {
      id: "RCW-84.48.150",
      name: "Documentation requirements",
      description: "Assessment adjustments must have proper documentation",
      checkFunction: "validateDocumentation"
    }
  ],
  UNIFORMITY: [
    {
      id: "RCW-84.40.020",
      name: "Uniformity requirements",
      description: "Similar properties must be assessed uniformly",
      checkFunction: "validateUniformity"
    }
  ]
};

// Compliance check result
interface ComplianceCheckResult {
  regulationId: string;
  regulationName: string;
  compliant: boolean;
  description: string;
  details?: string;
  severity: 'critical' | 'major' | 'minor';
  remediation?: string;
}

/**
 * Compliance Agent
 * 
 * Specialized agent responsible for ensuring adherence to Washington State
 * regulations for property assessments.
 * 
 * Responsibilities:
 * - Validating property data against Washington State regulations
 * - Checking for regulatory compliance in assessment practices
 * - Flagging compliance issues and providing remediation guidance
 * - Monitoring for changing regulations
 */
export class ComplianceAgent extends BaseAgent {
  private regulationsCache: typeof WASHINGTON_REGULATIONS;
  
  /**
   * Constructor
   */
  constructor(communicationBus: AgentCommunicationBus) {
    super(
      AgentType.COMPLIANCE,
      [
        'regulation_validation',
        'compliance_checking',
        'exemption_verification',
        'uniformity_analysis',
        'documentation_validation'
      ],
      communicationBus
    );
    
    // Initialize regulations cache
    this.regulationsCache = WASHINGTON_REGULATIONS;
  }
  
  /**
   * Initialize the Compliance Agent
   */
  public async initialize(): Promise<void> {
    // Initialize base functionality
    await super.initialize();
    
    // TODO: Implement fetching of latest regulations from a source of truth
    
    this.logger("Compliance Agent initialized");
  }
  
  /**
   * Execute a task
   */
  protected async executeTask(task: Task): Promise<any> {
    switch (task.type) {
      case 'check_property_compliance':
        return this.checkPropertyCompliance(task.parameters);
        
      case 'check_regulation_compliance':
        return this.checkRegulationCompliance(task.parameters);
        
      case 'validate_exemption':
        return this.validateExemption(task.parameters);
        
      case 'check_uniformity':
        return this.checkUniformity(task.parameters);
        
      case 'check_documentation':
        return this.checkDocumentation(task.parameters);
        
      case 'get_regulation_details':
        return this.getRegulationDetails(task.parameters);
        
      case 'generate_compliance_report':
        return this.generateComplianceReport(task.parameters);
        
      default:
        throw new Error(`Unsupported ComplianceAgent task type: ${task.type}`);
    }
  }
  
  /**
   * Check a property for compliance with all applicable regulations
   */
  private async checkPropertyCompliance(params: any): Promise<any> {
    try {
      const { propertyId, assessmentYear, categories } = params;
      
      // Validate parameters
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      
      // Fetch property data
      const property = await this.getProperty(propertyId);
      if (!property) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }
      
      const results: ComplianceCheckResult[] = [];
      
      // Determine which categories to check
      const categoriesToCheck = categories && categories.length > 0 
        ? categories 
        : Object.keys(this.regulationsCache);
      
      // Run compliance checks for selected categories
      for (const category of categoriesToCheck) {
        if (this.regulationsCache[category]) {
          for (const regulation of this.regulationsCache[category]) {
            const checkFunction = regulation.checkFunction;
            
            // Check if the function exists on this agent
            if (typeof this[checkFunction] === 'function') {
              try {
                const checkResult = await this[checkFunction](property, assessmentYear);
                results.push({
                  regulationId: regulation.id,
                  regulationName: regulation.name,
                  ...checkResult
                });
              } catch (error) {
                this.logger(`Error running compliance check ${regulation.id}: ${error.message}`);
                
                // Include the error as a failed check
                results.push({
                  regulationId: regulation.id,
                  regulationName: regulation.name,
                  compliant: false,
                  description: regulation.description,
                  details: `Error running compliance check: ${error.message}`,
                  severity: 'critical',
                  remediation: 'Contact technical support to resolve this issue'
                });
              }
            } else {
              this.logger(`Compliance check function "${checkFunction}" not implemented`);
              
              // Include as a "not implemented" check
              results.push({
                regulationId: regulation.id,
                regulationName: regulation.name,
                compliant: false,
                description: regulation.description,
                details: 'Compliance check not implemented yet',
                severity: 'minor',
                remediation: 'This check will be implemented in a future update'
              });
            }
          }
        }
      }
      
      // Summarize results
      const totalChecks = results.length;
      const compliantChecks = results.filter(r => r.compliant).length;
      const criticalIssues = results.filter(r => !r.compliant && r.severity === 'critical').length;
      const majorIssues = results.filter(r => !r.compliant && r.severity === 'major').length;
      const minorIssues = results.filter(r => !r.compliant && r.severity === 'minor').length;
      
      return {
        propertyId,
        assessmentYear: assessmentYear || property.assessmentYear,
        summary: {
          totalChecks,
          compliantChecks,
          nonCompliantChecks: totalChecks - compliantChecks,
          complianceScore: totalChecks > 0 ? Math.round((compliantChecks / totalChecks) * 100) : 0,
          criticalIssues,
          majorIssues,
          minorIssues
        },
        results
      };
    } catch (error) {
      this.logger(`Error in checkPropertyCompliance: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check compliance with a specific regulation category
   */
  private async checkRegulationCompliance(params: any): Promise<any> {
    try {
      const { category, propertyIds, assessmentYear } = params;
      
      // Validate parameters
      if (!category) {
        throw new Error('Regulation category is required');
      }
      
      if (!this.regulationsCache[category]) {
        throw new Error(`Unknown regulation category: ${category}`);
      }
      
      const results = {};
      
      // If propertyIds is provided, check specific properties
      if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
        for (const propertyId of propertyIds) {
          try {
            // Get property data
            const property = await this.getProperty(propertyId);
            if (!property) {
              results[propertyId] = {
                error: `Property with ID ${propertyId} not found`
              };
              continue;
            }
            
            // Run checks for this category
            const propertyResults = [];
            for (const regulation of this.regulationsCache[category]) {
              const checkFunction = regulation.checkFunction;
              
              if (typeof this[checkFunction] === 'function') {
                try {
                  const checkResult = await this[checkFunction](property, assessmentYear);
                  propertyResults.push({
                    regulationId: regulation.id,
                    regulationName: regulation.name,
                    ...checkResult
                  });
                } catch (error) {
                  this.logger(`Error running compliance check ${regulation.id} for property ${propertyId}: ${error.message}`);
                  propertyResults.push({
                    regulationId: regulation.id,
                    regulationName: regulation.name,
                    compliant: false,
                    description: regulation.description,
                    details: `Error running compliance check: ${error.message}`,
                    severity: 'critical',
                    remediation: 'Contact technical support to resolve this issue'
                  });
                }
              } else {
                propertyResults.push({
                  regulationId: regulation.id,
                  regulationName: regulation.name,
                  compliant: false,
                  description: regulation.description,
                  details: 'Compliance check not implemented yet',
                  severity: 'minor',
                  remediation: 'This check will be implemented in a future update'
                });
              }
            }
            
            results[propertyId] = propertyResults;
          } catch (error) {
            results[propertyId] = {
              error: `Error checking compliance: ${error.message}`
            };
          }
        }
      } else {
        // Without specific propertyIds, return regulation details
        results['regulations'] = this.regulationsCache[category].map(reg => ({
          id: reg.id,
          name: reg.name,
          description: reg.description
        }));
      }
      
      return {
        category,
        assessmentYear,
        results
      };
    } catch (error) {
      this.logger(`Error in checkRegulationCompliance: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Validate an exemption claim
   */
  private async validateExemption(params: any): Promise<any> {
    try {
      const { propertyId, exemptionType, exemptionData } = params;
      
      // Validate parameters
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      
      if (!exemptionType) {
        throw new Error('Exemption type is required');
      }
      
      // Get property data
      const property = await this.getProperty(propertyId);
      if (!property) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }
      
      let validationResult;
      
      // Check exemption type and call appropriate validation function
      switch (exemptionType.toLowerCase()) {
        case 'senior':
        case 'senior_disabled':
          validationResult = await this.validateSeniorExemption(property, exemptionData);
          break;
          
        case 'nonprofit':
        case 'charitable':
          validationResult = {
            compliant: false,
            description: "Nonprofit/charitable organization exemption",
            details: "Validation not yet implemented for nonprofit exemptions",
            severity: 'minor',
            remediation: "This validation will be implemented in a future update"
          };
          break;
          
        case 'agriculture':
        case 'farm':
          validationResult = {
            compliant: false,
            description: "Agricultural/farm land exemption",
            details: "Validation not yet implemented for agricultural exemptions",
            severity: 'minor',
            remediation: "This validation will be implemented in a future update"
          };
          break;
          
        default:
          validationResult = {
            compliant: false,
            description: `${exemptionType} exemption`,
            details: `Unknown exemption type: ${exemptionType}`,
            severity: 'major',
            remediation: "Verify the exemption type is correct and supported"
          };
      }
      
      return {
        propertyId,
        exemptionType,
        ...validationResult
      };
    } catch (error) {
      this.logger(`Error in validateExemption: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check assessment uniformity
   */
  private async checkUniformity(params: any): Promise<any> {
    try {
      const { 
        taxingDistrict, 
        propertyType, 
        neighborhood,
        assessmentYear,
        propertyId,
        radius,
        sampleSize
      } = params;
      
      // We need either a specific property or a taxing district
      if (!propertyId && !taxingDistrict) {
        throw new Error('Either propertyId or taxingDistrict is required');
      }
      
      // If property ID is provided, check uniformity around that property
      if (propertyId) {
        // Get property data
        const property = await this.getProperty(propertyId);
        if (!property) {
          throw new Error(`Property with ID ${propertyId} not found`);
        }
        
        // TODO: Implement uniformity check around a specific property
        // This would involve:
        // 1. Finding comparable properties
        // 2. Calculating assessment ratios (assessed value / market value)
        // 3. Computing coefficient of dispersion
        // 4. Detecting any bias in assessments
        
        return {
          propertyId,
          assessmentYear: assessmentYear || property.assessmentYear,
          message: "Property-specific uniformity check not yet fully implemented",
          uniformityChecks: [
            {
              check: "assessment_ratio",
              compliant: true,
              description: "Assessment ratio check",
              details: "Placeholder for assessment ratio analysis",
              severity: 'minor'
            },
            {
              check: "coefficient_of_dispersion",
              compliant: true,
              description: "Coefficient of Dispersion check",
              details: "Placeholder for COD analysis",
              severity: 'minor'
            }
          ]
        };
      } else {
        // Check uniformity across a district
        // TODO: Implement district-wide uniformity check
        
        return {
          taxingDistrict,
          propertyType,
          assessmentYear,
          message: "District-wide uniformity check not yet fully implemented",
          uniformityChecks: [
            {
              check: "assessment_ratio_distribution",
              compliant: true,
              description: "Assessment ratio distribution",
              details: "Placeholder for district-wide assessment ratio analysis",
              severity: 'minor'
            },
            {
              check: "price_related_differential",
              compliant: true,
              description: "Price Related Differential",
              details: "Placeholder for PRD analysis",
              severity: 'minor'
            }
          ]
        };
      }
    } catch (error) {
      this.logger(`Error in checkUniformity: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check documentation compliance
   */
  private async checkDocumentation(params: any): Promise<any> {
    try {
      const { propertyId, adjustmentId, documentType } = params;
      
      // Validate parameters
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      
      // Get property data
      const property = await this.getProperty(propertyId);
      if (!property) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }
      
      // TODO: Implement documentation check
      // This would involve:
      // 1. Checking if required documentation exists
      // 2. Validating documentation content
      // 3. Ensuring documentation meets legal requirements
      
      return {
        propertyId,
        message: "Documentation compliance check not yet fully implemented",
        documentationChecks: [
          {
            documentType: documentType || "all",
            compliant: false,
            description: "Documentation completeness check",
            details: "This check will validate that all required documentation is present",
            severity: 'minor',
            remediation: "This check will be implemented in a future update"
          }
        ]
      };
    } catch (error) {
      this.logger(`Error in checkDocumentation: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get details about specific regulations
   */
  private async getRegulationDetails(params: any): Promise<any> {
    try {
      const { regulationId, category } = params;
      
      // If regulationId is provided, return details for that regulation
      if (regulationId) {
        // Search through all categories
        for (const cat of Object.keys(this.regulationsCache)) {
          const regulation = this.regulationsCache[cat].find(r => r.id === regulationId);
          if (regulation) {
            return {
              id: regulation.id,
              name: regulation.name,
              description: regulation.description,
              category: cat
            };
          }
        }
        
        throw new Error(`Regulation with ID ${regulationId} not found`);
      }
      
      // If category is provided, return all regulations in that category
      if (category) {
        if (!this.regulationsCache[category]) {
          throw new Error(`Unknown regulation category: ${category}`);
        }
        
        return {
          category,
          regulations: this.regulationsCache[category].map(reg => ({
            id: reg.id,
            name: reg.name,
            description: reg.description
          }))
        };
      }
      
      // If neither regulationId nor category is provided, return all categories
      return {
        categories: Object.keys(this.regulationsCache).map(cat => ({
          name: cat,
          regulationCount: this.regulationsCache[cat].length
        }))
      };
    } catch (error) {
      this.logger(`Error in getRegulationDetails: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Generate a comprehensive compliance report
   */
  private async generateComplianceReport(params: any): Promise<any> {
    try {
      const { 
        taxingDistrict, 
        propertyType, 
        assessmentYear,
        propertyIds,
        categories,
        sampleSize
      } = params;
      
      // Validate parameters
      if (!assessmentYear) {
        throw new Error('Assessment year is required');
      }
      
      // Define sample of properties to check
      let propertiesToCheck = [];
      
      // If specific property IDs are provided, use those
      if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
        propertiesToCheck = propertyIds;
      } else {
        // Otherwise, select properties based on criteria
        
        // TODO: Implement property selection based on criteria
        // For now, return a placeholder response
        
        return {
          assessmentYear,
          taxingDistrict,
          propertyType,
          message: "Comprehensive compliance report generation not yet fully implemented",
          summary: {
            totalPropertiesChecked: 0,
            overallComplianceScore: 0,
            criticalIssuesCount: 0,
            majorIssuesCount: 0,
            minorIssuesCount: 0,
            topIssues: []
          },
          categories: Object.keys(this.regulationsCache).map(cat => ({
            name: cat,
            complianceScore: 0,
            checks: this.regulationsCache[cat].length,
            issues: 0
          }))
        };
      }
      
      // If we have specific properties to check, do that
      const results = [];
      for (const propId of propertiesToCheck) {
        try {
          const propertyResult = await this.checkPropertyCompliance({
            propertyId: propId,
            assessmentYear,
            categories
          });
          
          results.push({
            propertyId: propId,
            summary: propertyResult.summary,
            issues: propertyResult.results.filter(r => !r.compliant)
          });
        } catch (error) {
          results.push({
            propertyId: propId,
            error: error.message
          });
        }
      }
      
      // Aggregate results
      const totalProperties = results.length;
      const validResults = results.filter(r => !r.error);
      
      // Calculate overall statistics
      let totalChecks = 0;
      let totalCompliantChecks = 0;
      let totalCriticalIssues = 0;
      let totalMajorIssues = 0;
      let totalMinorIssues = 0;
      
      validResults.forEach(r => {
        totalChecks += r.summary.totalChecks;
        totalCompliantChecks += r.summary.compliantChecks;
        totalCriticalIssues += r.summary.criticalIssues;
        totalMajorIssues += r.summary.majorIssues;
        totalMinorIssues += r.summary.minorIssues;
      });
      
      // Overall compliance score
      const overallComplianceScore = totalChecks > 0 
        ? Math.round((totalCompliantChecks / totalChecks) * 100) 
        : 0;
      
      // Find most common issues
      const issueMap = {};
      validResults.forEach(r => {
        r.issues.forEach(issue => {
          if (!issueMap[issue.regulationId]) {
            issueMap[issue.regulationId] = {
              regulationId: issue.regulationId,
              regulationName: issue.regulationName,
              description: issue.description,
              severity: issue.severity,
              count: 0
            };
          }
          issueMap[issue.regulationId].count++;
        });
      });
      
      // Convert to array and sort by count
      const topIssues = Object.values(issueMap)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);
      
      return {
        assessmentYear,
        taxingDistrict,
        propertyType,
        summary: {
          totalPropertiesChecked: totalProperties,
          propertiesWithErrors: results.filter(r => r.error).length,
          overallComplianceScore,
          criticalIssuesCount: totalCriticalIssues,
          majorIssuesCount: totalMajorIssues,
          minorIssuesCount: totalMinorIssues,
          topIssues
        },
        propertyResults: results
      };
    } catch (error) {
      this.logger(`Error in generateComplianceReport: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Handle specialized messages
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    switch (message.messageType) {
      // Add specialized message handlers if needed
      default:
        await super.handleSpecializedMessage(message);
    }
  }
  
  /**
   * Helper: Get property data by ID
   */
  private async getProperty(propertyId: number): Promise<any> {
    try {
      const propertyData = await db.select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);
      
      return propertyData.length > 0 ? propertyData[0] : null;
    } catch (error) {
      this.logger(`Error fetching property ${propertyId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Validation: Check land use code compliance
   */
  private async validateLandUseCode(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // Check if land use code is valid for Washington State
    const validLandUseCodes = ['R', 'C', 'I', 'A', 'F', 'O', 'E', 'T', 'M'];
    
    const landUseCode = property.landUseCode?.charAt(0)?.toUpperCase();
    const isValidCode = validLandUseCodes.includes(landUseCode);
    
    if (!property.landUseCode) {
      return {
        compliant: false,
        description: "Property must have a valid Washington land use code",
        details: "Land use code is missing",
        severity: 'major',
        remediation: "Assign a valid land use code based on property characteristics"
      };
    }
    
    if (!isValidCode) {
      return {
        compliant: false,
        description: "Property must have a valid Washington land use code",
        details: `Invalid land use code: ${property.landUseCode}`,
        severity: 'major',
        remediation: "Update to a valid Washington State land use code"
      };
    }
    
    return {
      compliant: true,
      description: "Property must have a valid Washington land use code",
      details: `Valid land use code: ${property.landUseCode}`,
      severity: 'minor'
    };
  }
  
  /**
   * Validation: Check property type compliance
   */
  private async validatePropertyType(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // Check if property type is appropriate for its characteristics
    
    const propertyType = property.propertyType;
    const landUseCode = property.landUseCode;
    const buildingType = property.buildingType;
    const improvedValue = parseFloat(property.improvementValue || '0');
    
    if (!propertyType) {
      return {
        compliant: false,
        description: "Property must have a valid property type",
        details: "Property type is missing",
        severity: 'major',
        remediation: "Assign a valid property type based on land use and improvements"
      };
    }
    
    // Example validation logic - can be enhanced with more comprehensive rules
    let isConsistent = true;
    let inconsistencyReason = '';
    
    // Check for residential consistency
    if (propertyType === 'residential') {
      if (landUseCode && !landUseCode.startsWith('R')) {
        isConsistent = false;
        inconsistencyReason = `Residential property has non-residential land use code: ${landUseCode}`;
      }
    }
    
    // Check for commercial consistency
    if (propertyType === 'commercial') {
      if (landUseCode && !landUseCode.startsWith('C')) {
        isConsistent = false;
        inconsistencyReason = `Commercial property has non-commercial land use code: ${landUseCode}`;
      }
    }
    
    // Check for industrial consistency
    if (propertyType === 'industrial') {
      if (landUseCode && !landUseCode.startsWith('I')) {
        isConsistent = false;
        inconsistencyReason = `Industrial property has non-industrial land use code: ${landUseCode}`;
      }
    }
    
    if (!isConsistent) {
      return {
        compliant: false,
        description: "Property type must be consistent with land use and characteristics",
        details: inconsistencyReason,
        severity: 'major',
        remediation: "Review property characteristics and update property type or land use code"
      };
    }
    
    return {
      compliant: true,
      description: "Property type must be consistent with land use and characteristics",
      details: `Property type (${propertyType}) is consistent with land use code and characteristics`,
      severity: 'minor'
    };
  }
  
  /**
   * Validation: Check market value alignment
   */
  private async validateMarketValueAlignment(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // This is a placeholder - would require market data to fully implement
    return {
      compliant: true,
      description: "Property should be valued at 100% of its true and fair market value",
      details: "Market value alignment check not yet fully implemented",
      severity: 'minor'
    };
  }
  
  /**
   * Validation: Check value consistency
   */
  private async validateValueConsistency(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    const landValue = parseFloat(property.landValue || '0');
    const improvementValue = parseFloat(property.improvementValue || '0');
    const totalValue = parseFloat(property.totalValue || '0');
    
    const calculatedTotal = landValue + improvementValue;
    const tolerance = 1; // $1 tolerance for floating point rounding issues
    
    const isConsistent = Math.abs(calculatedTotal - totalValue) <= tolerance;
    
    if (!isConsistent) {
      return {
        compliant: false,
        description: "Total value must equal sum of land value and improvements value",
        details: `Total value (${totalValue}) does not equal land value (${landValue}) + improvement value (${improvementValue}) = ${calculatedTotal}`,
        severity: 'critical',
        remediation: "Recalculate and correct the total value to match the sum of land and improvement values"
      };
    }
    
    return {
      compliant: true,
      description: "Total value must equal sum of land value and improvements value",
      details: `Total value (${totalValue}) equals land value (${landValue}) + improvement value (${improvementValue})`,
      severity: 'critical'
    };
  }
  
  /**
   * Validation: Check exemption eligibility
   */
  private async validateExemptionEligibility(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // This is a placeholder - would require exemption data to fully implement
    if (!property.exemptions || property.exemptions.length === 0) {
      return {
        compliant: true,
        description: "Properties claiming exemptions must meet qualification requirements",
        details: "No exemptions claimed on this property",
        severity: 'minor'
      };
    }
    
    return {
      compliant: false,
      description: "Properties claiming exemptions must meet qualification requirements",
      details: "Exemption eligibility check not yet fully implemented",
      severity: 'major',
      remediation: "Manually verify all exemption qualifications"
    };
  }
  
  /**
   * Validation: Check senior exemption requirements
   */
  private async validateSeniorExemption(property: any, exemptionData?: any): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // This would require senior exemption specific data
    
    // If no exemption data and no claimed exemptions, return early
    if ((!exemptionData || Object.keys(exemptionData).length === 0) && 
        (!property.exemptions || property.exemptions.length === 0)) {
      return {
        compliant: true,
        description: "Senior/disabled exemptions must meet income and occupancy requirements",
        details: "No senior/disabled exemption claimed on this property",
        severity: 'minor'
      };
    }
    
    // This is a placeholder - real implementation would check:
    // - Age requirements (61+)
    // - Income limits
    // - Occupancy requirements (primary residence)
    // - Application timing
    
    return {
      compliant: false,
      description: "Senior/disabled exemptions must meet income and occupancy requirements",
      details: "Senior exemption validation not yet fully implemented",
      severity: 'major',
      remediation: "Manually verify senior/disabled exemption eligibility"
    };
  }
  
  /**
   * Validation: Check assessment cycle compliance
   */
  private async validateAssessmentCycle(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // This is a placeholder - would require county cycle information
    
    const currentYear = new Date().getFullYear();
    const lastAssessmentYear = property.assessmentYear || currentYear;
    
    // Benton County uses a 4-year assessment cycle
    const assessmentCycleYears = 4;
    const yearsSinceAssessment = currentYear - lastAssessmentYear;
    
    if (yearsSinceAssessment > assessmentCycleYears) {
      return {
        compliant: false,
        description: "Properties must be revalued on the county's established revaluation cycle",
        details: `Property was last assessed ${yearsSinceAssessment} years ago, exceeding the ${assessmentCycleYears}-year cycle`,
        severity: 'major',
        remediation: "Schedule property for revaluation immediately"
      };
    }
    
    return {
      compliant: true,
      description: "Properties must be revalued on the county's established revaluation cycle",
      details: `Property was assessed within the required ${assessmentCycleYears}-year cycle (last: ${lastAssessmentYear})`,
      severity: 'major'
    };
  }
  
  /**
   * Validation: Check listing deadline compliance
   */
  private async validateListingDeadlines(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // This is a placeholder - would require listing timing data
    return {
      compliant: true,
      description: "Property listings must be completed by assessment deadlines",
      details: "Listing deadline compliance check not yet fully implemented",
      severity: 'minor'
    };
  }
  
  /**
   * Validation: Check documentation compliance
   */
  private async validateDocumentation(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // This is a placeholder - would require documentation records
    return {
      compliant: true,
      description: "Assessment adjustments must have proper documentation",
      details: "Documentation validation not yet fully implemented",
      severity: 'minor'
    };
  }
  
  /**
   * Validation: Check assessment uniformity
   */
  private async validateUniformity(property: any, assessmentYear?: number): Promise<Omit<ComplianceCheckResult, 'regulationId' | 'regulationName'>> {
    // This is a placeholder - would require comparable property data
    return {
      compliant: true,
      description: "Similar properties must be assessed uniformly",
      details: "Uniformity validation not yet fully implemented",
      severity: 'minor'
    };
  }
}

// Export singleton instance
export const complianceAgent = new ComplianceAgent(new AgentCommunicationBus());