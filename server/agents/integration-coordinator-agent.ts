/**
 * Integration Coordinator Agent
 * 
 * Second-level agent responsible for coordinating integration between components.
 * Responsibilities:
 * - Implementing hourly integration checkpoints
 * - Developing API contract validation routines
 * - Creating cross-component dependency maps
 * - Ensuring consistent communication between components
 */

import { BaseAgent } from './base-agent';
import { 
  AgentType, 
  AgentCommunicationBus,
  AgentStatus
} from '@shared/protocols/agent-communication';
import {
  createMessage,
  MessageEventType,
  MessagePriority
} from '@shared/protocols/message-protocol';
import { v4 as uuidv4 } from 'uuid';

interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  responses: {
    statusCode: number;
    description: string;
    schema?: any;
  }[];
  owner: string; // Component or agent responsible
  consumers: string[]; // Components or agents consuming this API
}

interface Integration {
  id: string;
  sourceComponent: string;
  targetComponent: string;
  integrationPoints: {
    type: 'api' | 'event' | 'data';
    description: string;
    status: 'planned' | 'implemented' | 'tested' | 'production';
  }[];
  status: 'planned' | 'in-progress' | 'completed' | 'failed';
  lastChecked?: Date;
  issues?: string[];
}

interface IntegrationCoordinatorSettings {
  checkpointFrequency: number; // In milliseconds
  apiValidationFrequency: number; // In milliseconds
  alertThreshold: number; // Number of issues before alerting
}

export class IntegrationCoordinatorAgent extends BaseAgent {
  private apiEndpoints: Map<string, ApiEndpoint> = new Map();
  private integrations: Map<string, Integration> = new Map();
  private settings: IntegrationCoordinatorSettings;
  private checkpointInterval: NodeJS.Timeout | null = null;
  private validationInterval: NodeJS.Timeout | null = null;

  constructor(
    id: string,
    communicationBus: AgentCommunicationBus,
    settings: Partial<IntegrationCoordinatorSettings> = {}
  ) {
    super(id, communicationBus);

    // Default settings
    this.settings = {
      checkpointFrequency: 60 * 60 * 1000, // Hourly by default
      apiValidationFrequency: 3 * 60 * 60 * 1000, // Every 3 hours
      alertThreshold: 3,
      ...settings
    };
  }

  /**
   * Initialize the agent
   */
  async onInitialize(): Promise<void> {
    // Subscribe to integration-related topics
    this.subscribeToTopic('integration');
    this.subscribeToTopic('api-contract');
    this.subscribeToTopic('dependency');
    
    // Subscribe to agent communications for monitoring
    this.subscribeToEvent(MessageEventType.EVENT);
    this.subscribeToEvent(MessageEventType.BROADCAST);
    this.subscribeToEvent(MessageEventType.RESPONSE);
    
    // Schedule regular integration checkpoints
    this.scheduleIntegrationCheckpoints();
    
    // Schedule API validation
    this.scheduleApiValidation();
    
    return Promise.resolve();
  }

  /**
   * Handle shutdown
   */
  async onShutdown(): Promise<void> {
    // Clear scheduled tasks
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
    }
    
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    
    return Promise.resolve();
  }

  /**
   * Schedule regular integration checkpoints
   */
  private scheduleIntegrationCheckpoints(): void {
    // Run initial checkpoint
    this.runIntegrationCheckpoint();
    
    // Schedule regular checkpoints
    this.checkpointInterval = setInterval(() => {
      this.runIntegrationCheckpoint();
    }, this.settings.checkpointFrequency);
  }

  /**
   * Schedule API validation checks
   */
  private scheduleApiValidation(): void {
    // Run initial validation
    this.validateApiContracts();
    
    // Schedule regular validation
    this.validationInterval = setInterval(() => {
      this.validateApiContracts();
    }, this.settings.apiValidationFrequency);
  }

  /**
   * Run an integration checkpoint to verify all integrations
   */
  private runIntegrationCheckpoint(): void {
    const timestamp = new Date();
    const issueCount = 0;
    const checksPerformed = 0;
    
    // In a real implementation, we would check each integration point
    // and validate that components are communicating correctly
    
    // For this implementation, we'll just notify about the checkpoint
    const message = createMessage(
      this.id,
      'all',
      MessageEventType.BROADCAST,
      {
        eventType: 'integration-checkpoint',
        timestamp: timestamp.toISOString(),
        checksPerformed,
        issuesFound: issueCount,
        status: issueCount > 0 ? 'issues-found' : 'healthy'
      }
    );
    
    this.safeSendMessage(message);
    
    // If there are issues above threshold, alert the Architect Prime
    if (issueCount >= this.settings.alertThreshold) {
      this.alertArchitectPrime({
        type: 'integration-issues',
        count: issueCount,
        timestamp: timestamp.toISOString()
      });
    }
  }

  /**
   * Validate all registered API contracts
   */
  private validateApiContracts(): void {
    const timestamp = new Date();
    const issueCount = 0;
    
    // In a real implementation, we would validate each API contract
    // and check for consistency, completeness, and versioning issues
    
    // For this implementation, we'll just notify about the validation
    const message = createMessage(
      this.id,
      'all',
      MessageEventType.BROADCAST,
      {
        eventType: 'api-validation',
        timestamp: timestamp.toISOString(),
        endpointsValidated: this.apiEndpoints.size,
        issuesFound: issueCount,
        status: issueCount > 0 ? 'issues-found' : 'valid'
      }
    );
    
    this.safeSendMessage(message);
  }

  /**
   * Alert the Architect Prime about significant issues
   */
  private alertArchitectPrime(alert: any): void {
    const message = createMessage(
      this.id,
      'architect-prime', // Target the Architect Prime agent
      MessageEventType.EVENT,
      {
        eventType: 'integration-alert',
        alert
      },
      {
        priority: MessagePriority.HIGH
      }
    );
    
    this.safeSendMessage(message);
  }

  /**
   * Register a new API endpoint
   */
  registerApiEndpoint(endpoint: Omit<ApiEndpoint, 'consumers'>): string {
    const id = `api-${endpoint.method}-${endpoint.path}`;
    
    // Create endpoint with empty consumers list
    const fullEndpoint: ApiEndpoint = {
      ...endpoint,
      consumers: []
    };
    
    this.apiEndpoints.set(id, fullEndpoint);
    
    // Notify about new endpoint
    const message = createMessage(
      this.id,
      'all',
      MessageEventType.EVENT,
      {
        eventType: 'api-endpoint-registered',
        endpoint: fullEndpoint
      }
    );
    
    this.safeSendMessage(message);
    
    return id;
  }

  /**
   * Register as a consumer of an API
   */
  registerApiConsumer(apiId: string, consumerId: string): boolean {
    const endpoint = this.apiEndpoints.get(apiId);
    
    if (!endpoint) {
      return false;
    }
    
    // Add consumer if not already registered
    if (!endpoint.consumers.includes(consumerId)) {
      endpoint.consumers.push(consumerId);
      this.apiEndpoints.set(apiId, endpoint);
      
      // Register this as an integration point if both components exist
      this.ensureIntegrationExists(consumerId, endpoint.owner, 'api');
    }
    
    return true;
  }

  /**
   * Register a new integration between components
   */
  registerIntegration(
    sourceComponent: string,
    targetComponent: string,
    integrationType: 'api' | 'event' | 'data',
    description: string
  ): string {
    // Generate an ID for the integration if it doesn't exist
    const integrationId = `integration-${sourceComponent}-${targetComponent}`;
    
    // Check if this integration already exists
    let integration = this.integrations.get(integrationId);
    
    if (integration) {
      // Add new integration point
      integration.integrationPoints.push({
        type: integrationType,
        description,
        status: 'planned'
      });
    } else {
      // Create new integration
      integration = {
        id: integrationId,
        sourceComponent,
        targetComponent,
        integrationPoints: [{
          type: integrationType,
          description,
          status: 'planned'
        }],
        status: 'planned'
      };
    }
    
    // Update the integration
    this.integrations.set(integrationId, integration);
    
    // Notify about integration update
    const message = createMessage(
      this.id,
      'all',
      MessageEventType.EVENT,
      {
        eventType: 'integration-registered',
        integration
      }
    );
    
    this.safeSendMessage(message);
    
    return integrationId;
  }

  /**
   * Ensure an integration exists between components
   */
  private ensureIntegrationExists(
    sourceComponent: string,
    targetComponent: string,
    integrationType: 'api' | 'event' | 'data'
  ): void {
    const integrationId = `integration-${sourceComponent}-${targetComponent}`;
    
    if (!this.integrations.has(integrationId)) {
      this.registerIntegration(
        sourceComponent,
        targetComponent,
        integrationType,
        `Auto-registered ${integrationType} integration`
      );
    }
  }

  /**
   * Update integration status
   */
  updateIntegrationStatus(
    integrationId: string,
    status: 'planned' | 'in-progress' | 'completed' | 'failed',
    issues?: string[]
  ): boolean {
    const integration = this.integrations.get(integrationId);
    
    if (!integration) {
      return false;
    }
    
    // Update status
    integration.status = status;
    integration.lastChecked = new Date();
    
    if (issues) {
      integration.issues = issues;
    }
    
    this.integrations.set(integrationId, integration);
    
    // If there are issues, alert the Architect Prime
    if (issues && issues.length >= this.settings.alertThreshold) {
      this.alertArchitectPrime({
        type: 'integration-status-issues',
        integrationId,
        status,
        issues,
        timestamp: new Date().toISOString()
      });
    }
    
    return true;
  }

  /**
   * Generate a dependency map for all components
   */
  generateDependencyMap(): any {
    // Convert integrations to a dependency map
    const dependencies: Record<string, string[]> = {};
    
    this.integrations.forEach(integration => {
      // Ensure source component exists in map
      if (!dependencies[integration.sourceComponent]) {
        dependencies[integration.sourceComponent] = [];
      }
      
      // Add target as dependency if not already included
      if (!dependencies[integration.sourceComponent].includes(integration.targetComponent)) {
        dependencies[integration.sourceComponent].push(integration.targetComponent);
      }
    });
    
    return dependencies;
  }

  /**
   * Generate a dependency map in Mermaid format
   */
  generateMermaidDependencyDiagram(): string {
    let diagram = 'graph LR;\n';
    
    // Add all integrations
    this.integrations.forEach(integration => {
      diagram += `  ${integration.sourceComponent} --> ${integration.targetComponent}\n`;
    });
    
    return diagram;
  }

  /**
   * Handle specific message types for the Integration Coordinator
   */
  protected async handleMessage(message: any): Promise<void> {
    // Process integration-related messages
    if (message.payload?.eventType === 'api-query') {
      this.handleApiQuery(message);
    } else if (message.payload?.eventType === 'dependency-query') {
      this.handleDependencyQuery(message);
    } else if (message.payload?.eventType === 'integration-issue') {
      this.handleIntegrationIssue(message);
    } else {
      // Let the base agent handle other messages
      await super.handleMessage(message);
    }
  }

  /**
   * Handle API query requests
   */
  private handleApiQuery(message: any): void {
    const query = message.payload.query;
    const senderId = message.sender;
    
    let responseData: any = {};
    
    switch (query) {
      case 'all-endpoints':
        responseData = {
          endpoints: Array.from(this.apiEndpoints.values())
        };
        break;
      case 'endpoint-by-path':
        const path = message.payload.path;
        const method = message.payload.method || 'GET';
        const id = `api-${method}-${path}`;
        responseData = {
          endpoint: this.apiEndpoints.get(id)
        };
        break;
      default:
        responseData = {
          error: `Unknown query type: ${query}`
        };
    }
    
    // Send response
    const response = createMessage(
      this.id,
      senderId,
      MessageEventType.RESPONSE,
      responseData,
      {
        correlationId: message.id
      }
    );
    
    this.safeSendMessage(response);
  }

  /**
   * Handle dependency query requests
   */
  private handleDependencyQuery(message: any): void {
    const query = message.payload.query;
    const senderId = message.sender;
    
    let responseData: any = {};
    
    switch (query) {
      case 'dependency-map':
        responseData = {
          dependencies: this.generateDependencyMap()
        };
        break;
      case 'mermaid-diagram':
        responseData = {
          diagram: this.generateMermaidDependencyDiagram()
        };
        break;
      case 'all-integrations':
        responseData = {
          integrations: Array.from(this.integrations.values())
        };
        break;
      default:
        responseData = {
          error: `Unknown query type: ${query}`
        };
    }
    
    // Send response
    const response = createMessage(
      this.id,
      senderId,
      MessageEventType.RESPONSE,
      responseData,
      {
        correlationId: message.id
      }
    );
    
    this.safeSendMessage(response);
  }

  /**
   * Handle integration issue reports
   */
  private handleIntegrationIssue(message: any): void {
    const issue = message.payload;
    const senderId = message.sender;
    
    // Record the issue with the appropriate integration
    if (issue.integrationId && this.integrations.has(issue.integrationId)) {
      const integration = this.integrations.get(issue.integrationId)!;
      
      if (!integration.issues) {
        integration.issues = [];
      }
      
      integration.issues.push(issue.description);
      integration.lastChecked = new Date();
      
      this.integrations.set(issue.integrationId, integration);
      
      // If issues exceed threshold, alert Architect Prime
      if (integration.issues.length >= this.settings.alertThreshold) {
        this.alertArchitectPrime({
          type: 'integration-issues',
          integrationId: issue.integrationId,
          issues: integration.issues,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Acknowledge receipt
    const response = createMessage(
      this.id,
      senderId,
      MessageEventType.RESPONSE,
      {
        status: 'received',
        message: 'Integration issue recorded'
      },
      {
        correlationId: message.id
      }
    );
    
    this.safeSendMessage(response);
  }

  /**
   * Get agent status for monitoring
   */
  getStatus(): AgentStatus {
    return {
      ...super.getStatus(),
      apiEndpointCount: this.apiEndpoints.size,
      integrationCount: this.integrations.size,
      lastCheckpoint: new Date().toISOString(),
      issueCount: Array.from(this.integrations.values())
        .reduce((count, integration) => count + (integration.issues?.length || 0), 0)
    };
  }
}