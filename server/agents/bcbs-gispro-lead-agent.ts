import { 
  AgentType, 
  AgentStatus,
  AgentCommunicationBus
} from "@shared/protocols/agent-communication";
import {
  AgentMessage,
  MessageEventType,
  MessagePriority
} from "@shared/protocols/message-protocol";
import { BaseAgent } from "./base-agent";

/**
 * GISPro Lead Agent settings
 */
interface GISProLeadSettings {
  supportedDataFormats: string[];
  spatialAnalysisCapabilities: string[];
  serviceLevels: Record<string, number>;
}

/**
 * BCBS GISPro Lead Agent
 * 
 * Geospatial expertise lead that manages all geospatial data processing,
 * analysis, and visualization components. Ensures integration between
 * GIS systems and assessment workflows.
 */
export class BCBSGISProLeadAgent extends BaseAgent {
  private settings: GISProLeadSettings;
  private spatialDataRegistry: Map<string, any> = new Map();
  private spatialAnalysisRegistry: Map<string, any> = new Map();
  private pendingDataRequests: Map<string, any> = new Map();
  
  /**
   * Constructor
   */
  constructor(
    id: string,
    communicationBus: AgentCommunicationBus,
    settings: GISProLeadSettings
  ) {
    super(
      AgentType.BCBS_GISPRO_LEAD,
      [
        'geospatial_analysis',
        'spatial_data_management',
        'gis_integration',
        'parcel_geometry',
        'property_visualization'
      ],
      communicationBus
    );
    
    this.settings = settings;
    this.id = id;
  }
  
  /**
   * Initialize the agent
   */
  protected async onInitialize(): Promise<void> {
    // Subscribe to relevant topics
    this.subscribeToTopic('geospatial_analysis');
    this.subscribeToTopic('spatial_data_management');
    this.subscribeToTopic('gis_integration');
    
    // Subscribe to directives from master lead
    this.subscribeToEvent(MessageEventType.COMMAND, (message: AgentMessage) => {
      if (message.source === AgentType.BSBC_MASTER_LEAD) {
        this.handleMasterLeadDirective(message);
      }
    });
    
    // Register with specialized spatial agents
    this.registerWithSpatialAgents();
    
    this.logger(`${this.id} initialized with ${this.settings.supportedDataFormats.length} data formats and ${this.settings.spatialAnalysisCapabilities.length} analysis capabilities`);
  }
  
  /**
   * Shutdown the agent
   */
  protected async onShutdown(): Promise<void> {
    // Clean up any resources
    this.spatialDataRegistry.clear();
    this.spatialAnalysisRegistry.clear();
    this.pendingDataRequests.clear();
    
    this.logger(`${this.id} shutdown`);
  }
  
  /**
   * Execute a task
   */
  protected async executeTask(task: any): Promise<any> {
    switch (task.type) {
      case 'process_spatial_data':
        return this.processSpatialData(task.parameters);
        
      case 'perform_spatial_analysis':
        return this.performSpatialAnalysis(task.parameters);
        
      case 'generate_parcel_visualization':
        return this.generateParcelVisualization(task.parameters);
        
      case 'integrate_external_gis':
        return this.integrateExternalGIS(task.parameters);
        
      case 'validate_spatial_geometry':
        return this.validateSpatialGeometry(task.parameters);
        
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }
  
  /**
   * Register with spatial processing agents
   */
  private async registerWithSpatialAgents(): Promise<void> {
    const registrationMessage: AgentMessage = {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.id,
      destination: 'all',
      eventType: MessageEventType.REGISTRATION,
      payload: {
        agentType: AgentType.BCBS_GISPRO_LEAD,
        capabilities: [
          'geospatial_analysis',
          'spatial_data_management',
          'gis_integration',
          'parcel_geometry',
          'property_visualization'
        ],
        dataFormats: this.settings.supportedDataFormats,
        analysisCapabilities: this.settings.spatialAnalysisCapabilities
      },
      priority: MessagePriority.HIGH,
      requiresResponse: true
    };
    
    this.sendMessage(registrationMessage);
    
    // Register directly with vector and raster processors
    this.registerWithSpecificAgent(AgentType.VECTOR_PROCESSING);
    this.registerWithSpecificAgent(AgentType.RASTER_PROCESSING);
    this.registerWithSpecificAgent(AgentType.SPATIAL_ANALYTICS);
  }
  
  /**
   * Register with a specific agent
   */
  private async registerWithSpecificAgent(agentType: AgentType): Promise<void> {
    const registrationMessage: AgentMessage = {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.id,
      destination: agentType,
      eventType: MessageEventType.REGISTRATION,
      payload: {
        agentType: AgentType.BCBS_GISPRO_LEAD,
        capabilities: [
          'geospatial_analysis',
          'spatial_data_management',
          'gis_integration',
          'parcel_geometry',
          'property_visualization'
        ],
        relationship: 'supervisor',
        serviceLevels: this.settings.serviceLevels
      },
      priority: MessagePriority.HIGH,
      requiresResponse: true
    };
    
    this.sendMessage(registrationMessage);
  }
  
  /**
   * Handle a directive from the master lead
   */
  private async handleMasterLeadDirective(message: AgentMessage): Promise<void> {
    const { commandType, command, ...params } = message.payload;
    
    // Get appropriate command type
    const effectiveCommand = commandType || command;
    
    this.logger(`Received master lead directive: ${effectiveCommand}`);
    
    // Process the directive based on type
    switch (effectiveCommand) {
      case 'update_architecture':
        await this.handleArchitectureUpdate(params);
        break;
        
      case 'update_priority':
        await this.handlePriorityUpdate(params);
        break;
        
      case 'implement_integration_pattern':
        await this.handleIntegrationPattern(params);
        break;
        
      case 'register_with_master_lead':
        await this.handleMasterLeadRegistration(params);
        break;
        
      default:
        this.logger(`Unknown command type: ${effectiveCommand}`);
    }
    
    // Acknowledge receipt of directive
    this.sendResponseMessage(message, {
      status: 'success',
      message: `Command ${effectiveCommand} acknowledged and being processed`
    });
  }
  
  /**
   * Handle architecture update directive
   */
  private async handleArchitectureUpdate(params: any): Promise<void> {
    const { revisionId, changes } = params;
    
    // Apply relevant changes to our components
    let spatialChanges = changes.filter((change: any) => 
      change.domain === 'spatial' || 
      change.component === 'gis' || 
      change.affects?.includes('geospatial')
    );
    
    if (spatialChanges.length === 0) {
      this.logger(`No relevant changes in revision ${revisionId} for GIS components`);
      return;
    }
    
    // Propagate to spatial processing agents
    await this.propagateChangesToSpatialAgents(revisionId, spatialChanges);
    
    this.logger(`Applied architectural changes from revision ${revisionId}`);
  }
  
  /**
   * Propagate changes to spatial agents
   */
  private async propagateChangesToSpatialAgents(revisionId: string, changes: any[]): Promise<void> {
    // Create a map of changes by agent type
    const changesByAgent = new Map<AgentType, any[]>();
    
    // Sort changes by target agent
    for (const change of changes) {
      if (change.component === 'vector_processing') {
        if (!changesByAgent.has(AgentType.VECTOR_PROCESSING)) {
          changesByAgent.set(AgentType.VECTOR_PROCESSING, []);
        }
        changesByAgent.get(AgentType.VECTOR_PROCESSING)?.push(change);
      }
      else if (change.component === 'raster_processing') {
        if (!changesByAgent.has(AgentType.RASTER_PROCESSING)) {
          changesByAgent.set(AgentType.RASTER_PROCESSING, []);
        }
        changesByAgent.get(AgentType.RASTER_PROCESSING)?.push(change);
      }
      else if (change.component === 'spatial_analytics') {
        if (!changesByAgent.has(AgentType.SPATIAL_ANALYTICS)) {
          changesByAgent.set(AgentType.SPATIAL_ANALYTICS, []);
        }
        changesByAgent.get(AgentType.SPATIAL_ANALYTICS)?.push(change);
      }
    }
    
    // Send changes to each agent
    for (const [agentType, agentChanges] of changesByAgent.entries()) {
      const updateMessage: AgentMessage = {
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.id,
        destination: agentType,
        eventType: MessageEventType.COMMAND,
        payload: {
          commandType: 'apply_architecture_changes',
          revisionId,
          changes: agentChanges
        },
        priority: MessagePriority.HIGH,
        requiresResponse: true
      };
      
      this.sendMessage(updateMessage);
    }
  }
  
  /**
   * Handle priority update directive
   */
  private async handlePriorityUpdate(params: any): Promise<void> {
    const { newPriority, reason, effectiveFrom } = params;
    
    // Update our service levels based on priority
    if (newPriority === 'high') {
      Object.keys(this.settings.serviceLevels).forEach(service => {
        this.settings.serviceLevels[service] *= 1.5; // Increase service levels
      });
    } else if (newPriority === 'low') {
      Object.keys(this.settings.serviceLevels).forEach(service => {
        this.settings.serviceLevels[service] *= 0.75; // Decrease service levels
      });
    }
    
    // Propagate priority updates to spatial agents
    await this.propagatePriorityToSpatialAgents(newPriority, reason, effectiveFrom);
    
    this.logger(`Updated priority to ${newPriority} effective from ${effectiveFrom}`);
  }
  
  /**
   * Propagate priority updates to spatial agents
   */
  private async propagatePriorityToSpatialAgents(
    priority: string,
    reason: string,
    effectiveFrom: Date
  ): Promise<void> {
    const spatialAgents = [
      AgentType.VECTOR_PROCESSING,
      AgentType.RASTER_PROCESSING,
      AgentType.SPATIAL_ANALYTICS
    ];
    
    for (const agentType of spatialAgents) {
      const priorityMessage: AgentMessage = {
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.id,
        destination: agentType,
        eventType: MessageEventType.COMMAND,
        payload: {
          commandType: 'update_priority',
          newPriority: priority,
          reason,
          effectiveFrom
        },
        priority: MessagePriority.MEDIUM,
        requiresResponse: true
      };
      
      this.sendMessage(priorityMessage);
    }
  }
  
  /**
   * Handle integration pattern directive
   */
  private async handleIntegrationPattern(params: any): Promise<void> {
    const { patternId, patternType, specifications, deadline } = params;
    
    if (patternType.includes('spatial') || patternType.includes('gis')) {
      // Apply the pattern to GIS subsystems
      await this.implementSpatialIntegrationPattern(patternId, specifications);
      
      this.logger(`Implemented spatial integration pattern ${patternId}`);
    } else {
      this.logger(`Integration pattern ${patternId} of type ${patternType} is not applicable to GIS components`);
    }
  }
  
  /**
   * Implement a spatial integration pattern
   */
  private async implementSpatialIntegrationPattern(patternId: string, specifications: any): Promise<void> {
    // Determine which spatial agents need to be involved
    const relevantAgents = this.determineRelevantSpatialAgents(specifications);
    
    // Send implementation messages to each agent
    for (const agentType of relevantAgents) {
      const implementMessage: AgentMessage = {
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.id,
        destination: agentType,
        eventType: MessageEventType.COMMAND,
        payload: {
          commandType: 'implement_integration_pattern',
          patternId,
          specifications: this.filterSpecificationsForAgent(specifications, agentType)
        },
        priority: MessagePriority.HIGH,
        requiresResponse: true
      };
      
      this.sendMessage(implementMessage);
    }
  }
  
  /**
   * Determine which spatial agents are relevant for a given specification
   */
  private determineRelevantSpatialAgents(specifications: any): AgentType[] {
    const relevantAgents: AgentType[] = [];
    
    if (specifications.dataTypes?.includes('vector') || 
        specifications.operations?.some((op: string) => op.includes('vector'))) {
      relevantAgents.push(AgentType.VECTOR_PROCESSING);
    }
    
    if (specifications.dataTypes?.includes('raster') || 
        specifications.operations?.some((op: string) => op.includes('raster'))) {
      relevantAgents.push(AgentType.RASTER_PROCESSING);
    }
    
    if (specifications.analytics || 
        specifications.visualization ||
        specifications.operations?.some((op: string) => op.includes('analysis'))) {
      relevantAgents.push(AgentType.SPATIAL_ANALYTICS);
    }
    
    return relevantAgents;
  }
  
  /**
   * Filter specifications for a specific agent
   */
  private filterSpecificationsForAgent(specifications: any, agentType: AgentType): any {
    const filteredSpec = { ...specifications };
    
    // Remove irrelevant operations based on agent type
    if (filteredSpec.operations) {
      if (agentType === AgentType.VECTOR_PROCESSING) {
        filteredSpec.operations = filteredSpec.operations.filter(
          (op: string) => op.includes('vector') || !op.includes('raster')
        );
      }
      
      if (agentType === AgentType.RASTER_PROCESSING) {
        filteredSpec.operations = filteredSpec.operations.filter(
          (op: string) => op.includes('raster') || !op.includes('vector')
        );
      }
      
      if (agentType === AgentType.SPATIAL_ANALYTICS) {
        filteredSpec.operations = filteredSpec.operations.filter(
          (op: string) => op.includes('analysis') || op.includes('visualization')
        );
      }
    }
    
    return filteredSpec;
  }
  
  /**
   * Handle registration with the master lead
   */
  private async handleMasterLeadRegistration(params: any): Promise<void> {
    const { masterLeadId, domainAreas, priorityGoals } = params;
    
    this.logger(`Registered with Master Lead ${masterLeadId}`);
    
    // Store relationship with master lead for future communications
    const masterLeadKey = `master_lead_${masterLeadId}`;
    
    // Update our service configuration based on domain areas and priority goals
    if (priorityGoals && priorityGoals.includes('geospatial_accuracy')) {
      // Increase service levels for spatial accuracy
      this.settings.serviceLevels['vector_validation'] = 
        (this.settings.serviceLevels['vector_validation'] || 1) * 1.5;
    }
    
    if (priorityGoals && priorityGoals.includes('data_integration')) {
      // Improve data format support
      const additionalFormats = ['geopackage', 'netcdf', 'las'];
      for (const format of additionalFormats) {
        if (!this.settings.supportedDataFormats.includes(format)) {
          this.settings.supportedDataFormats.push(format);
        }
      }
    }
    
    // Acknowledge registration by reporting capabilities back to master lead
    const capabilitiesMessage: AgentMessage = {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.id,
      destination: masterLeadId,
      eventType: MessageEventType.NOTIFICATION,
      payload: {
        notificationType: 'capabilities_report',
        capabilities: {
          supportedDataFormats: this.settings.supportedDataFormats,
          spatialAnalysisCapabilities: this.settings.spatialAnalysisCapabilities,
          serviceLevels: this.settings.serviceLevels
        }
      },
      priority: MessagePriority.MEDIUM,
      requiresResponse: false
    };
    
    this.sendMessage(capabilitiesMessage);
  }
  
  /**
   * Process spatial data task
   */
  private async processSpatialData(params: any): Promise<any> {
    const { dataType, sourceId, format, options } = params;
    
    this.logger(`Processing spatial data of type ${dataType} from source ${sourceId}`);
    
    let processingAgent;
    if (dataType === 'vector') {
      processingAgent = AgentType.VECTOR_PROCESSING;
    } else if (dataType === 'raster') {
      processingAgent = AgentType.RASTER_PROCESSING;
    } else {
      throw new Error(`Unsupported spatial data type: ${dataType}`);
    }
    
    // Forward the processing request to the appropriate agent
    const processingMessage: AgentMessage = {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.id,
      destination: processingAgent,
      eventType: MessageEventType.TASK,
      payload: {
        taskType: 'process_data',
        sourceId,
        format,
        options,
        requestedBy: this.id
      },
      priority: MessagePriority.HIGH,
      requiresResponse: true
    };
    
    // Track pending request
    this.pendingDataRequests.set(processingMessage.messageId, {
      requestTime: new Date(),
      requestType: 'process',
      sourceId,
      dataType
    });
    
    try {
      const response = await this.sendMessageAndWaitForResponse(processingMessage);
      
      // Remove from pending requests
      this.pendingDataRequests.delete(processingMessage.messageId);
      
      // Register processed data
      if (response.payload.status === 'success') {
        this.spatialDataRegistry.set(response.payload.processedDataId, {
          dataType,
          sourceId,
          processedAt: new Date(),
          metadata: response.payload.metadata
        });
      }
      
      return response.payload;
    } catch (error) {
      // Remove from pending requests
      this.pendingDataRequests.delete(processingMessage.messageId);
      
      return {
        status: 'error',
        message: `Failed to process spatial data: ${error}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Perform spatial analysis task
   */
  private async performSpatialAnalysis(params: any): Promise<any> {
    const { analysisType, dataIds, options } = params;
    
    this.logger(`Performing spatial analysis of type ${analysisType}`);
    
    // Forward the analysis request to the spatial analytics agent
    const analysisMessage: AgentMessage = {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.id,
      destination: AgentType.SPATIAL_ANALYTICS,
      eventType: MessageEventType.TASK,
      payload: {
        taskType: 'perform_analysis',
        analysisType,
        dataIds,
        options,
        requestedBy: this.id
      },
      priority: MessagePriority.HIGH,
      requiresResponse: true
    };
    
    // Track pending request
    this.pendingDataRequests.set(analysisMessage.messageId, {
      requestTime: new Date(),
      requestType: 'analysis',
      analysisType
    });
    
    try {
      const response = await this.sendMessageAndWaitForResponse(analysisMessage);
      
      // Remove from pending requests
      this.pendingDataRequests.delete(analysisMessage.messageId);
      
      // Register analysis result
      if (response.payload.status === 'success') {
        this.spatialAnalysisRegistry.set(response.payload.analysisId, {
          analysisType,
          performedAt: new Date(),
          dataIds,
          metadata: response.payload.metadata
        });
      }
      
      return response.payload;
    } catch (error) {
      // Remove from pending requests
      this.pendingDataRequests.delete(analysisMessage.messageId);
      
      return {
        status: 'error',
        message: `Failed to perform spatial analysis: ${error}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Generate parcel visualization task
   */
  private async generateParcelVisualization(params: any): Promise<any> {
    const { parcelId, visualizationType, options } = params;
    
    this.logger(`Generating ${visualizationType} visualization for parcel ${parcelId}`);
    
    // Forward the visualization request to the spatial analytics agent
    const visualizationMessage: AgentMessage = {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.id,
      destination: AgentType.SPATIAL_ANALYTICS,
      eventType: MessageEventType.TASK,
      payload: {
        taskType: 'generate_visualization',
        parcelId,
        visualizationType,
        options,
        requestedBy: this.id
      },
      priority: MessagePriority.MEDIUM,
      requiresResponse: true
    };
    
    try {
      const response = await this.sendMessageAndWaitForResponse(visualizationMessage);
      return response.payload;
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to generate parcel visualization: ${error}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Integrate external GIS task
   */
  private async integrateExternalGIS(params: any): Promise<any> {
    const { systemId, connectionDetails, dataLayers } = params;
    
    this.logger(`Integrating external GIS system ${systemId}`);
    
    // Implementation would depend on the specific external GIS system
    // and would typically involve coordination with multiple spatial agents
    
    return {
      status: 'success',
      integrationId: AgentCommunicationBus.createMessageId(),
      systemId,
      integratedLayers: dataLayers.length,
      timestamp: new Date()
    };
  }
  
  /**
   * Validate spatial geometry task
   */
  private async validateSpatialGeometry(params: any): Promise<any> {
    const { geometryData, validationRules } = params;
    
    this.logger(`Validating spatial geometry against ${validationRules.length} rules`);
    
    // Forward the validation request to the vector processing agent
    const validationMessage: AgentMessage = {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.id,
      destination: AgentType.VECTOR_PROCESSING,
      eventType: MessageEventType.TASK,
      payload: {
        taskType: 'validate_geometry',
        geometryData,
        validationRules,
        requestedBy: this.id
      },
      priority: MessagePriority.HIGH,
      requiresResponse: true
    };
    
    try {
      const response = await this.sendMessageAndWaitForResponse(validationMessage);
      return response.payload;
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to validate spatial geometry: ${error}`,
        timestamp: new Date()
      };
    }
  }
}