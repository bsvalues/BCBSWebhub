import { PropertyDataValidator } from "../validators/property-validator";
import { DataQualityService } from "../services/data-quality";
import { BaseAgent, Task } from "./base-agent";
import { 
  AgentType, 
  AgentMessage, 
  MessageType, 
  Priority,
  StatusCode, 
  AgentCommunicationBus, 
  DataValidationMessage
} from "@shared/protocols/agent-communication";
import { InsertProperty, Property } from "@shared/washington-schema";

/**
 * Data Validation Agent
 * 
 * Specialized agent responsible for validating property data according to
 * Washington State requirements and maintaining data quality metrics.
 */
export class DataValidationAgent extends BaseAgent {
  private validator: PropertyDataValidator;
  private dataQualityService: DataQualityService;
  
  constructor(communicationBus: AgentCommunicationBus) {
    super(
      AgentType.DATA_VALIDATION, 
      [
        'property_validation',
        'parcel_number_validation',
        'data_quality_assessment',
        'exemption_validation',
        'value_calculation_validation',
        'washington_state_compliance'
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
        return this.validateProperty(task.parameters.property);
        
      case 'analyze_data_quality':
        return this.analyzeDataQuality();
        
      case 'generate_data_recommendations':
        return this.generateDataRecommendations();
        
      case 'validate_property_batch':
        return this.validatePropertyBatch(task.parameters.properties);
        
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }
  
  /**
   * Handle specialized messages specific to this agent
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    switch (message.messageType) {
      case MessageType.DATA_VALIDATION_REQUEST:
        await this.handleDataValidationRequest(message as DataValidationMessage);
        break;
        
      default:
        this.logger(`Unhandled message type ${message.messageType} in DataValidationAgent`);
    }
  }
  
  /**
   * Handle data validation request message
   */
  private async handleDataValidationRequest(message: DataValidationMessage): Promise<void> {
    const { dataId, dataType, data, validationRules, strictMode } = message.payload;
    
    let validationResult;
    
    try {
      // Validate based on data type
      switch (dataType) {
        case 'property':
          validationResult = await this.validateProperty(data, strictMode);
          break;
          
        case 'property_batch':
          validationResult = await this.validatePropertyBatch(data, strictMode);
          break;
          
        case 'parcel_number':
          validationResult = this.validateParcelNumber(data);
          break;
          
        default:
          throw new Error(`Unsupported data type for validation: ${dataType}`);
      }
      
      // Send validation response
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.DATA_VALIDATION_RESPONSE,
        priority: message.priority,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: {
          dataId,
          dataType,
          isValid: validationResult.isValid,
          validationResults: validationResult.results,
          summary: validationResult.summary
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
  private async validateProperty(
    property: Partial<Property>, 
    strictMode: boolean = false
  ): Promise<{
    isValid: boolean;
    results: any[];
    summary: any;
  }> {
    this.logger(`Validating property: ${property.parcelNumber || 'unknown'}`);
    
    // Use property validator for WA-specific rules
    const validationResults = this.validator.validateProperty(property);
    const summary = this.validator.getValidationSummary(validationResults);
    
    // If using strict mode, check with Zod validation as well
    let zodValidation;
    if (strictMode) {
      zodValidation = this.validator.validatePropertyWithZod(property);
      
      if (!zodValidation.isValid && zodValidation.errors) {
        // Convert Zod errors to standard format
        const zodErrors = zodValidation.errors.map(error => ({
          field: error.path.join('.'),
          isValid: false,
          rule: 'ZOD_VALIDATION',
          message: error.message,
          severity: 'error'
        }));
        
        // Add Zod errors to validation results
        validationResults.push(...zodErrors);
        
        // Update summary
        summary.errorCount += zodErrors.length;
        summary.errorFields = [...new Set([...summary.errorFields, ...zodErrors.map(e => e.field)])];
      }
    }
    
    return {
      isValid: summary.isValid,
      results: validationResults,
      summary: {
        ...summary,
        strictModeUsed: strictMode,
        zodValidationPassed: strictMode ? zodValidation?.isValid : undefined
      }
    };
  }
  
  /**
   * Validate a batch of properties
   */
  private async validatePropertyBatch(
    properties: Partial<Property>[],
    strictMode: boolean = false
  ): Promise<{
    totalProperties: number;
    validProperties: number;
    invalidProperties: number;
    results: any[];
    errorSummary: Record<string, number>;
  }> {
    this.logger(`Validating property batch with ${properties.length} properties`);
    
    const results = await Promise.all(
      properties.map(async property => ({
        property: {
          id: property.id,
          parcelNumber: property.parcelNumber
        },
        validation: await this.validateProperty(property, strictMode)
      }))
    );
    
    // Calculate summary
    const validProperties = results.filter(r => r.validation.isValid).length;
    const invalidProperties = results.filter(r => !r.validation.isValid).length;
    
    // Count errors by field
    const errorSummary: Record<string, number> = {};
    results
      .filter(r => !r.validation.isValid)
      .forEach(r => {
        r.validation.summary.errorFields.forEach((field: string) => {
          errorSummary[field] = (errorSummary[field] || 0) + 1;
        });
      });
    
    return {
      totalProperties: properties.length,
      validProperties,
      invalidProperties,
      results,
      errorSummary
    };
  }
  
  /**
   * Validate a parcel number
   */
  private validateParcelNumber(parcelNumber: string): {
    isValid: boolean;
    result: any;
  } {
    const validation = this.validator.validateProperty({ parcelNumber });
    const parcelValidation = validation.find(v => v.field === 'parcelNumber');
    
    return {
      isValid: parcelValidation?.isValid || false,
      result: parcelValidation
    };
  }
  
  /**
   * Analyze data quality across all properties
   */
  private async analyzeDataQuality(): Promise<any> {
    this.logger('Analyzing data quality');
    
    // Use data quality service to get comprehensive metrics
    const metrics = await this.dataQualityService.calculateDataQualityMetrics();
    
    return {
      metrics,
      timestamp: new Date(),
      agentVersion: '1.0',
      validatorVersion: this.validator.rulesVersion
    };
  }
  
  /**
   * Generate data quality recommendations
   */
  private async generateDataRecommendations(): Promise<any> {
    this.logger('Generating data recommendations');
    
    // Get data quality metrics
    const metrics = await this.dataQualityService.calculateDataQualityMetrics();
    
    // Generate recommendations based on metrics
    const recommendations = this.dataQualityService.generateRecommendations(metrics);
    
    // Get historical trend data
    const historicalMetrics = await this.dataQualityService.getHistoricalMetrics(30);
    
    return {
      recommendations,
      currentScore: metrics.overallScore,
      historicalTrend: historicalMetrics.map(m => ({
        date: m.date,
        score: m.score
      })),
      criticalIssueCount: metrics.criticalIssueCount,
      improvementAreas: Object.entries(metrics.completeness)
        .filter(([_, value]) => value < 0.9)
        .map(([field]) => field)
    };
  }
}