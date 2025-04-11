import { BaseAgent, Task } from "./base-agent";
import { PropertyDataValidator } from "../validators/property-validator";
import { DataQualityService } from "../services/data-quality";
import { 
  AgentType, 
  AgentMessage, 
  MessageType, 
  Priority, 
  AgentCommunicationBus
} from "@shared/protocols/agent-communication";
import { db } from "../db";
import { properties } from "@shared/washington-schema";
import { eq } from "drizzle-orm";

// Define the ValidationResult interface locally since it's not exported from washington-schema
interface ValidationResult {
  field: string;
  isValid: boolean;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Define ValidationRequestMessage interface
interface ValidationRequestMessage extends AgentMessage {
  payload: {
    propertyId?: number;
    property?: any;
    validateFields?: string[];
  };
}

/**
 * Data Validation Agent
 * 
 * Specialized agent responsible for validating property data according to
 * Washington State rules and regulations, detecting data quality issues,
 * and making recommendations for data corrections.
 */
export class DataValidationAgent extends BaseAgent {
  private validator: PropertyDataValidator;
  private dataQualityService: DataQualityService;
  
  constructor(communicationBus: AgentCommunicationBus) {
    super(
      AgentType.DATA_VALIDATION, 
      [
        'data_validation',
        'data_quality_analysis',
        'washington_state_compliance',
        'data_recommendation',
        'batch_validation'
      ],
      communicationBus
    );
    
    this.validator = new PropertyDataValidator();
    this.dataQualityService = new DataQualityService();
  }
  
  /**
   * Execute a task assigned to this agent
   */
  protected async executeTask(task: Task): Promise<any> {
    switch (task.type) {
      case 'validate_property':
        return this.validateProperty(task.parameters);
        
      case 'validate_property_batch':
        return this.validatePropertyBatch(task.parameters);
        
      case 'analyze_data_quality':
        return this.analyzeDataQuality(task.parameters);
        
      case 'generate_data_recommendations':
        return this.generateDataRecommendations(task.parameters);
        
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }
  
  /**
   * Handle specialized messages specific to this agent
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    switch (message.messageType) {
      case MessageType.VALIDATION_REQUEST:
        await this.handleValidationRequest(message as ValidationRequestMessage);
        break;
        
      default:
        this.logger(`Unhandled message type ${message.messageType} in DataValidationAgent`);
    }
  }
  
  /**
   * Handle property validation request message
   */
  private async handleValidationRequest(message: ValidationRequestMessage): Promise<void> {
    const { propertyId, property } = message.payload;
    
    try {
      let result;
      
      if (propertyId) {
        // Validate existing property by ID
        result = await this.validateProperty({ propertyId });
      } else if (property) {
        // Validate provided property data
        result = await this.validateProperty({ property });
      } else {
        throw new Error("Either propertyId or property data is required for validation");
      }
      
      // Extract relevant info from validation results
      const isValid = result.isValid;
      const validationResults = result.results;
      const validationSummary = result.summary;
      
      // Send validation response
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.VALIDATION_RESPONSE,
        priority: message.priority,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: {
          propertyId: propertyId || property?.id,
          isValid,
          validationResults,
          validationSummary
        }
      });
    } catch (error) {
      // Send error response
      this.communicationBus.publish(
        AgentCommunicationBus.createErrorResponse(message, error)
      );
    }
  }
  
  /**
   * Validate a property against Washington State rules
   */
  private async validateProperty(params: { propertyId?: number, property?: any }): Promise<any> {
    const { propertyId, property } = params;
    
    // Get property data if only ID was provided
    let propertyData = property;
    if (propertyId && !property) {
      const results = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId));
      
      if (results.length === 0) {
        throw new Error(`Property not found with ID: ${propertyId}`);
      }
      
      propertyData = results[0];
    }
    
    if (!propertyData) {
      throw new Error("No property data provided for validation");
    }
    
    // Validate the property
    const validationResults = this.validator.validateProperty(propertyData);
    
    // Count validation results by severity
    const errorCount = validationResults.filter(r => r.severity === "error").length;
    const warningCount = validationResults.filter(r => r.severity === "warning").length;
    const infoCount = validationResults.filter(r => r.severity === "info").length;
    
    // Check if there are any blocking errors
    const isValid = errorCount === 0;
    
    // Group validation results by field
    const fieldMap = new Map<string, ValidationResult[]>();
    validationResults.forEach(result => {
      if (!fieldMap.has(result.field)) {
        fieldMap.set(result.field, []);
      }
      fieldMap.get(result.field)!.push(result);
    });
    
    // Create validation summary
    const fieldResults = Array.from(fieldMap.entries()).map(([field, results]) => {
      // Check if field has errors
      const hasErrors = results.some(r => r.severity === "error");
      
      return {
        field,
        isValid: !hasErrors,
        rule: results.map(r => r.rule).join(", "),
        message: results.map(r => r.message).join("; "),
        severity: hasErrors ? "error" : results.some(r => r.severity === "warning") ? "warning" : "info"
      };
    });
    
    // Get list of fields with errors
    const fieldsWithErrors = new Set<string>();
    for (const [field, results] of fieldMap.entries()) {
      if (results.some(r => r.severity === "error")) {
        fieldsWithErrors.add(field);
      }
    }
    
    return {
      isValid,
      results: validationResults,
      summary: {
        propertyId: propertyData.id,
        parcelNumber: propertyData.parcelNumber,
        isValid,
        errorCount,
        warningCount,
        infoCount,
        totalIssues: validationResults.length,
        fieldResults,
        fieldsWithErrors: Array.from(fieldsWithErrors),
        timestamp: new Date()
      }
    };
  }
  
  /**
   * Validate multiple properties in a batch
   */
  private async validatePropertyBatch(params: { propertyIds?: number[], properties?: any[] }): Promise<any> {
    const { propertyIds, properties } = params;
    
    if (!propertyIds && !properties) {
      throw new Error("Either propertyIds or properties array is required for batch validation");
    }
    
    let propertiesToValidate: any[] = [];
    
    // If property IDs provided, fetch them from the database
    if (propertyIds && propertyIds.length > 0) {
      // TODO: Replace with a more efficient query when Drizzle supports IN operator
      for (const id of propertyIds) {
        const results = await db
          .select()
          .from(properties)
          .where(eq(properties.id, id));
        
        if (results.length > 0) {
          propertiesToValidate.push(results[0]);
        }
      }
    } else if (properties && properties.length > 0) {
      propertiesToValidate = properties;
    }
    
    // Validate each property
    const validationResults = await Promise.all(
      propertiesToValidate.map(async (property) => {
        try {
          const result = await this.validateProperty({ property });
          return {
            propertyId: property.id,
            parcelNumber: property.parcelNumber,
            success: true,
            isValid: result.isValid,
            summary: result.summary,
            details: result.results
          };
        } catch (error) {
          return {
            propertyId: property.id,
            parcelNumber: property.parcelNumber,
            success: false,
            error: error.message
          };
        }
      })
    );
    
    // Count total properties, valid properties, and invalid properties
    const totalProperties = validationResults.length;
    const validProperties = validationResults.filter(r => r.success && r.isValid).length;
    const invalidProperties = validationResults.filter(r => r.success && !r.isValid).length;
    const failedValidations = validationResults.filter(r => !r.success).length;
    
    // Group validation errors by type
    const errorSummary: Record<string, number> = {};
    validationResults
      .filter(r => r.success && r.details)
      .forEach(result => {
        result.details
          .filter(d => d.severity === "error")
          .forEach(detail => {
            const errorKey = `${detail.field}.${detail.rule}`;
            errorSummary[errorKey] = (errorSummary[errorKey] || 0) + 1;
          });
      });
    
    return {
      totalProperties,
      validProperties,
      invalidProperties,
      failedValidations,
      results: validationResults,
      errorSummary,
      timestamp: new Date()
    };
  }
  
  /**
   * Analyze data quality for properties
   */
  private async analyzeDataQuality(params: any): Promise<any> {
    const options = {
      limit: params?.limit || 100,
      offset: params?.offset || 0,
      includeMetrics: params?.includeMetrics !== false,
      includeFieldAnalysis: params?.includeFieldAnalysis !== false,
      thresholds: params?.thresholds
    };
    
    // Use data quality service
    const qualityAnalysis = await this.dataQualityService.analyzeDataQuality(options);
    
    return {
      ...qualityAnalysis,
      timestamp: new Date()
    };
  }
  
  /**
   * Generate data improvement recommendations
   */
  private async generateDataRecommendations(params: any): Promise<any> {
    const propertyId = params?.propertyId;
    const analysisType = params?.analysisType || 'all';
    
    // Quick data quality check 
    const qualityAnalysis = await this.dataQualityService.analyzeDataQuality({
      limit: propertyId ? 1 : 100,
      propertyId
    });
    
    // Recommendations are already included in the quality analysis response
    return {
      recommendations: qualityAnalysis.recommendations,
      analysisType,
      propertyId,
      qualityScore: qualityAnalysis.overallScore,
      timestamp: new Date()
    };
  }
}