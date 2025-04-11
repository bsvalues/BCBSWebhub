import { PropertyComparableService } from "../services/property-comparables";
import { AnomalyDetectionService } from "../services/anomaly-detection";
import { BaseAgent } from "./base-agent";
import { 
  AgentType, 
  AgentStatus,
  AgentCommunicationBus,
  Task
} from "@shared/protocols/agent-communication";
import {
  AgentMessage,
  MessageEventType,
  MessagePriority,
  createMessage,
  createSuccessResponse,
  createErrorResponse,
  ValuationRequestMessage,
  ValuationResponsePayload,
  ComparableRequestPayload,
  AnomalyDetectionRequestPayload
} from "@shared/protocols/message-protocol";
import { Property } from "@shared/washington-schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { properties as propertiesTable } from "@shared/washington-schema";
import { logger } from '../utils/logger';

/**
 * Valuation Agent
 * 
 * Specialized agent responsible for calculating property values according to
 * Washington State assessment guidelines, finding comparable properties,
 * and detecting valuation anomalies.
 */
export class ValuationAgent extends BaseAgent {
  private comparableService: PropertyComparableService;
  private anomalyDetector: AnomalyDetectionService;
  
  constructor(agentId: string, communicationBus: AgentCommunicationBus, settings: Record<string, any> = {}) {
    super(agentId, communicationBus, settings);
    
    this.comparableService = new PropertyComparableService();
    this.anomalyDetector = new AnomalyDetectionService();
  }
  
  /**
   * Agent-specific initialization logic
   */
  protected async onInitialize(): Promise<void> {
    // Register this agent's capabilities with the MCP
    await this.sendMessage(
      AgentType.MCP,
      MessageEventType.COMMAND,
      {
        commandName: 'registerCapabilities',
        capabilities: [
          'property_valuation',
          'comparable_analysis',
          'anomaly_detection',
          'trend_analysis',
          'assessment_calculation',
          'washington_state_compliance'
        ]
      }
    );
    
    // Initialize services if needed
    // Currently no special initialization needed
  }
  
  /**
   * Agent-specific shutdown logic
   */
  protected async onShutdown(): Promise<void> {
    // Notify MCP that this agent is shutting down
    try {
      await this.sendMessage(
        AgentType.MCP,
        MessageEventType.STATUS_UPDATE,
        {
          status: AgentStatus.SHUTTING_DOWN,
          metrics: this.getStatusMetrics()
        }
      );
    } catch (error) {
      // If MCP is not available, just log the shutdown
      // No need to rethrow since we're shutting down anyway
    }
  }
  
  /**
   * Execute a task assigned to this agent
   */
  protected async executeTask(task: Task): Promise<any> {
    switch (task.type) {
      case 'calculate_property_value':
        return this.calculatePropertyValue(task.parameters);
        
      case 'find_comparable_properties':
        return this.findComparableProperties(task.parameters);
        
      case 'detect_valuation_anomalies':
        return this.detectValuationAnomalies(task.parameters);
        
      case 'analyze_property_trend':
        return this.analyzePropertyTrend(task.parameters);
        
      case 'batch_valuation':
        return this.batchValuation(task.parameters);
        
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }
  
  /**
   * Handle specialized messages specific to this agent
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    switch (message.eventType) {
      case MessageEventType.VALUATION_REQUEST:
        await this.handleValuationRequest(message as ValuationRequestMessage);
        break;
        
      case MessageEventType.COMPARABLE_REQUEST:
        await this.handleComparableRequest(message);
        break;
        
      case MessageEventType.ANOMALY_DETECTION_REQUEST:
        await this.handleAnomalyDetectionRequest(message);
        break;
        
      default:
        logger.debug(`Unhandled message type ${message.eventType} in ValuationAgent`);
    }
  }
  
  /**
   * Handle valuation request message
   */
  private async handleValuationRequest(message: ValuationRequestMessage): Promise<void> {
    const { propertyId, parcelNumber, valuationDate, valuationContext } = message.payload;
    
    try {
      // Retrieve property by ID or parcel number
      let property: Property | undefined;
      
      if (propertyId) {
        const results = await db
          .select()
          .from(propertiesTable)
          .where(eq(propertiesTable.id, propertyId));
        property = results[0];
      } else if (parcelNumber) {
        const results = await db
          .select()
          .from(propertiesTable)
          .where(eq(propertiesTable.parcelNumber, parcelNumber));
        property = results[0];
      }
      
      if (!property) {
        throw new Error(`Property not found with ID ${propertyId} or parcel number ${parcelNumber}`);
      }
      
      // Calculate property value
      const valuationResult = await this.calculatePropertyValue({
        property,
        valuationDate: valuationDate || new Date(),
        context: valuationContext
      });
      
      // Send valuation response
      const responsePayload = {
        propertyId: property.id,
        parcelNumber: property.parcelNumber,
        valuationDate: valuationDate || new Date(),
        assessmentYear: valuationContext?.assessmentYear || new Date().getFullYear(),
        valuationResult
      };
      
      const response = createSuccessResponse(message, responsePayload);
      this.safeSendMessage(response);
    } catch (error) {
      // Send error response
      const errorResponse = createErrorResponse(message, 'valuation_error', (error as Error).message);
      this.safeSendMessage(errorResponse);
    }
  }
  
  /**
   * Handle comparable properties request message
   */
  private async handleComparableRequest(message: AgentMessage): Promise<void> {
    const { propertyId, options } = message.payload;
    
    try {
      const result = await this.findComparableProperties({
        propertyId,
        ...options
      });
      
      // Send comparable response
      const responsePayload = {
        propertyId,
        result
      };
      
      const response = createSuccessResponse(message, responsePayload);
      this.safeSendMessage(response);
    } catch (error) {
      // Send error response
      const errorResponse = createErrorResponse(message, 'comparable_error', (error as Error).message);
      this.safeSendMessage(errorResponse);
    }
  }
  
  /**
   * Handle anomaly detection request message
   */
  private async handleAnomalyDetectionRequest(message: AgentMessage): Promise<void> {
    const { options } = message.payload;
    
    try {
      const anomalies = await this.detectValuationAnomalies(options);
      
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.ANOMALY_DETECTION_RESPONSE,
        priority: message.priority,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: {
          anomalies,
          count: anomalies.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.communicationBus.publish(
        AgentCommunicationBus.createErrorResponse(message, error)
      );
    }
  }
  
  /**
   * Calculate property value based on Washington State assessment guidelines
   */
  private async calculatePropertyValue(params: {
    property: Property;
    valuationDate: Date;
    context?: any;
  }): Promise<any> {
    const { property, valuationDate, context } = params;
    this.logger(`Calculating value for property ${property.parcelNumber}`);
    
    // Default valuation is based on existing values
    let landValue = Number(property.landValue);
    let improvementValue = Number(property.improvementValue);
    let totalValue = Number(property.totalValue);
    
    // Additional context and valuation methods can be applied here
    const useComparables = context?.useComparables !== false;
    const useHistoricalTrends = context?.useHistoricalTrends !== false;
    const detectAnomalies = context?.detectAnomalies !== false;
    
    // Value adjustments
    let valueAdjustments = [];
    let comparableAnalysis = null;
    let anomalyDetection = null;
    let confidenceScore = 0.95; // Default high confidence
    
    // If requested, use comparable properties to refine valuation
    if (useComparables) {
      try {
        const comparableResult = await this.comparableService.findComparableProperties({
          propertyId: property.id,
          maxResults: 5
        });
        
        // Analyze comparables
        comparableAnalysis = this.comparableService.analyzeComparables(comparableResult);
        
        // If comparable analysis found a significantly different value range,
        // adjust the valuation with a weighted approach
        if (comparableAnalysis && Math.abs(comparableAnalysis.medianValue - totalValue) > totalValue * 0.1) {
          const original = totalValue;
          const comparable = comparableAnalysis.medianValue;
          
          // Weight original value at 70%, comparable-based at 30%
          totalValue = (original * 0.7) + (comparable * 0.3);
          
          // Distribute adjustment proportionally to land and improvement values
          const adjustmentFactor = totalValue / original;
          landValue = landValue * adjustmentFactor;
          improvementValue = improvementValue * adjustmentFactor;
          
          valueAdjustments.push({
            reason: 'comparable_properties',
            description: 'Value adjusted based on comparable properties',
            originalValue: original,
            adjustedValue: totalValue,
            adjustmentAmount: totalValue - original,
            adjustmentPercentage: ((totalValue / original) - 1) * 100
          });
          
          // Lower confidence due to adjustment
          confidenceScore = 0.85;
        }
      } catch (error) {
        this.logger(`Error in comparable analysis for property ${property.id}:`, error);
      }
    }
    
    // If requested, detect if this value is an anomaly
    if (detectAnomalies) {
      try {
        const anomalyOptions = {
          taxingDistrict: property.taxingDistrict,
          propertyType: property.propertyType,
          assessmentYear: property.assessmentYear,
          zScoreThreshold: 2.0
        };
        
        const anomalies = await this.anomalyDetector.detectValueAnomalies(anomalyOptions);
        
        // Find this property in anomaly results
        anomalyDetection = anomalies.find(a => a.propertyId === property.id);
        
        if (anomalyDetection) {
          // If it's an anomaly, reduce confidence score
          confidenceScore = 0.7;
          
          // Add to adjustments list
          valueAdjustments.push({
            reason: 'anomaly_detection',
            description: `Property value is anomalous with z-score ${anomalyDetection.zScore.toFixed(2)}`,
            factors: anomalyDetection.factors
          });
        }
      } catch (error) {
        this.logger(`Error in anomaly detection for property ${property.id}:`, error);
      }
    }
    
    // Return full valuation result
    return {
      propertyId: property.id,
      parcelNumber: property.parcelNumber,
      assessmentYear: context?.assessmentYear || new Date().getFullYear(),
      valuationDate,
      
      // Values
      landValue,
      improvementValue,
      totalValue,
      priorValue: Number(property.totalValue),
      
      // Value change
      changeAmount: totalValue - Number(property.totalValue),
      changePercentage: ((totalValue / Number(property.totalValue)) - 1) * 100,
      
      // Per unit metrics
      valueMetrics: property.acres ? {
        valuePerAcre: totalValue / Number(property.acres),
        landValuePerAcre: landValue / Number(property.acres),
        improvementPercentage: (improvementValue / totalValue) * 100
      } : undefined,
      
      // Analysis and adjustments
      valueAdjustments,
      comparableAnalysis,
      anomalyDetection,
      confidenceScore,
      
      // Metadata
      valuationMethod: 'washington_state_assessment',
      valuationVersion: '2025.1',
      agentVersion: '1.0'
    };
  }
  
  /**
   * Find comparable properties for a given property
   */
  private async findComparableProperties(params: any): Promise<any> {
    const { propertyId } = params;
    this.logger(`Finding comparable properties for property ${propertyId}`);
    
    // Use property comparables service
    const comparableResult = await this.comparableService.findComparableProperties({
      propertyId,
      maxResults: params.maxResults ||
        params.count || 10,
      maxAgeDifference: params.maxAgeDifference || 10,
      maxSizeDifference: params.maxSizeDifference || 20,
      maxValueDifference: params.maxValueDifference || 30,
      sameNeighborhood: params.sameNeighborhood !== false,
      sameTaxingDistrict: params.sameTaxingDistrict !== false,
      maxDistanceMiles: params.maxDistanceMiles || 5
    });
    
    // Get value analysis for the comparables
    const analysis = this.comparableService.analyzeComparables(comparableResult);
    
    // Add value metrics to each comparable
    const comparablesWithMetrics = comparableResult.comparables.map(comparable => {
      const metrics = this.comparableService.calculateValueMetrics(comparable);
      return {
        ...comparable,
        metrics
      };
    });
    
    // Add value metrics to reference property
    const referenceMetrics = this.comparableService.calculateValueMetrics(comparableResult.reference);
    
    return {
      reference: {
        ...comparableResult.reference,
        metrics: referenceMetrics
      },
      comparables: comparablesWithMetrics,
      analysis,
      count: comparablesWithMetrics.length,
      timestamp: new Date()
    };
  }
  
  /**
   * Detect anomalies in property valuations
   */
  private async detectValuationAnomalies(options: any): Promise<any> {
    this.logger('Detecting valuation anomalies');
    
    // Use anomaly detection service
    const anomalies = await this.anomalyDetector.detectValueAnomalies({
      taxingDistrict: options.taxingDistrict,
      propertyType: options.propertyType,
      assessmentYear: options.assessmentYear || new Date().getFullYear(),
      zScoreThreshold: options.zScoreThreshold || 2.0,
      percentageThreshold: options.percentageThreshold || 25,
      analysisMetric: options.analysisMetric || 'total_value'
    });
    
    return {
      anomalies,
      count: anomalies.length,
      summary: {
        highConfidence: anomalies.filter(a => a.confidence === 'high').length,
        mediumConfidence: anomalies.filter(a => a.confidence === 'medium').length,
        lowConfidence: anomalies.filter(a => a.confidence === 'low').length,
        averageDeviation: anomalies.reduce((sum, a) => sum + Math.abs(a.deviationPercentage), 0) / 
          (anomalies.length || 1)
      },
      timestamp: new Date()
    };
  }
  
  /**
   * Analyze historical value trends for a specific property
   */
  private async analyzePropertyTrend(params: any): Promise<any> {
    const { propertyId, yearRange } = params;
    this.logger(`Analyzing value trend for property ${propertyId}`);
    
    // Use anomaly detection service for trend analysis
    const trendAnalysis = await this.anomalyDetector.analyzePropertyValueTrend(
      propertyId,
      yearRange || 5
    );
    
    return {
      ...trendAnalysis,
      propertyId,
      timestamp: new Date()
    };
  }
  
  /**
   * Perform batch valuation for multiple properties
   */
  private async batchValuation(params: any): Promise<any> {
    const { properties, valuationDate, context } = params;
    this.logger(`Performing batch valuation for ${properties.length} properties`);
    
    // Value each property
    const valuations = await Promise.all(
      properties.map(async (propertyInfo: any) => {
        try {
          // Get full property data if only ID is provided
          let property: Property;
          if (typeof propertyInfo === 'number' || (propertyInfo && !propertyInfo.parcelNumber)) {
            const propertyId = typeof propertyInfo === 'number' ? propertyInfo : propertyInfo.id;
            const results = await db
              .select()
              .from(propertiesTable)
              .where(eq(propertiesTable.id, propertyId));
            
            if (results.length === 0) {
              throw new Error(`Property not found with ID: ${propertyId}`);
            }
            
            property = results[0];
          } else {
            property = propertyInfo as Property;
          }
          
          // Calculate value
          const valuation = await this.calculatePropertyValue({
            property,
            valuationDate: valuationDate || new Date(),
            context
          });
          
          return {
            propertyId: property.id,
            parcelNumber: property.parcelNumber,
            success: true,
            valuation
          };
        } catch (error) {
          return {
            propertyId: typeof propertyInfo === 'number' ? propertyInfo : propertyInfo.id,
            parcelNumber: propertyInfo.parcelNumber,
            success: false,
            error: error.message
          };
        }
      })
    );
    
    // Calculate summary statistics
    const successCount = valuations.filter(v => v.success).length;
    const failureCount = valuations.length - successCount;
    
    return {
      valuations,
      summary: {
        totalProperties: valuations.length,
        successCount,
        failureCount,
        successPercentage: (successCount / valuations.length) * 100
      },
      timestamp: new Date()
    };
  }
}