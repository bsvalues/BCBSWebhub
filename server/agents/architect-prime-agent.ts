/**
 * Architect Prime Agent
 * 
 * Top-level agent responsible for maintaining architectural vision and system integrity.
 * Responsibilities:
 * - System-wide architectural oversight
 * - Creating and updating system diagrams
 * - Sending daily vision statements to all teams
 * - Monitoring architectural compliance
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

interface SystemComponent {
  id: string;
  name: string;
  description: string;
  type: 'service' | 'database' | 'ui' | 'agent' | 'integration' | 'api';
  dependencies: string[]; // IDs of components this depends on
  responsibleAgent?: string; // Agent ID responsible for this component
}

interface ArchitecturalDecision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  alternatives: string[];
  consequences: string[];
  date: Date;
}

interface ArchitectPrimeSettings {
  visionStatementFrequency: number; // In milliseconds
  architecturalComplianceThreshold: number; // 0-1 scale
  systemDiagramFormat: 'mermaid' | 'svg' | 'json';
  maxComponentDepth: number;
}

export class ArchitectPrimeAgent extends BaseAgent {
  private components: Map<string, SystemComponent> = new Map();
  private decisions: Map<string, ArchitecturalDecision> = new Map();
  private settings: ArchitectPrimeSettings;
  private visionStatementInterval: NodeJS.Timeout | null = null;

  constructor(
    id: string,
    communicationBus: AgentCommunicationBus,
    settings: Partial<ArchitectPrimeSettings> = {}
  ) {
    super(id, communicationBus);

    // Default settings
    this.settings = {
      visionStatementFrequency: 24 * 60 * 60 * 1000, // Daily by default
      architecturalComplianceThreshold: 0.8, // 80% compliance required
      systemDiagramFormat: 'mermaid',
      maxComponentDepth: 3,
      ...settings
    };
  }

  /**
   * Initialize the agent
   */
  async onInitialize(): Promise<void> {
    // Subscribe to specific topics for architectural oversight
    this.subscribeToTopic('architecture');
    this.subscribeToTopic('compliance');
    this.subscribeToTopic('component-update');
    
    // Subscribe to agent registrations to track component leads
    this.subscribeToEvent(MessageEventType.AGENT_REGISTRATION);
    
    // Initialize component registry with known core components
    this.initializeCoreComponents();
    
    // Schedule regular vision statement broadcasts
    this.scheduleVisionStatements();
    
    return Promise.resolve();
  }

  /**
   * Handle shutdown
   */
  async onShutdown(): Promise<void> {
    // Clear scheduled tasks
    if (this.visionStatementInterval) {
      clearInterval(this.visionStatementInterval);
    }
    
    return Promise.resolve();
  }

  /**
   * Initialize core system components
   */
  private initializeCoreComponents(): void {
    // Define core components
    const coreComponents: SystemComponent[] = [
      {
        id: 'core-mcp',
        name: 'Master Control Program',
        description: 'Central orchestration service that coordinates all agents',
        type: 'agent',
        dependencies: []
      },
      {
        id: 'data-validation',
        name: 'Data Validation Services',
        description: 'Validates property data against quality standards',
        type: 'service',
        dependencies: ['core-mcp']
      },
      {
        id: 'compliance-service',
        name: 'Compliance Services',
        description: 'Ensures data and processes comply with regulations',
        type: 'service',
        dependencies: ['core-mcp', 'data-validation']
      },
      {
        id: 'valuation-engine',
        name: 'Property Valuation Engine',
        description: 'Calculates property values using multiple methodologies',
        type: 'service',
        dependencies: ['core-mcp', 'data-validation', 'compliance-service']
      },
      {
        id: 'geospatial-services',
        name: 'Geospatial Services',
        description: 'Processes and analyzes geospatial data',
        type: 'service',
        dependencies: ['core-mcp']
      }
    ];
    
    // Register components
    coreComponents.forEach(component => {
      this.components.set(component.id, component);
    });
  }

  /**
   * Schedule regular vision statement broadcasts
   */
  private scheduleVisionStatements(): void {
    // Send initial vision statement
    this.broadcastVisionStatement();
    
    // Schedule regular broadcasts
    this.visionStatementInterval = setInterval(() => {
      this.broadcastVisionStatement();
    }, this.settings.visionStatementFrequency);
  }

  /**
   * Generate and broadcast architectural vision statement
   */
  private broadcastVisionStatement(): void {
    const visionStatement = this.generateVisionStatement();
    
    const message = createMessage(
      this.id,
      'all', // Broadcast to all agents
      MessageEventType.BROADCAST,
      {
        eventType: 'vision-statement',
        content: visionStatement,
        timestamp: new Date().toISOString()
      },
      {
        priority: MessagePriority.HIGH
      }
    );
    
    this.safeSendMessage(message);
  }

  /**
   * Generate a vision statement based on current architectural state
   */
  private generateVisionStatement(): string {
    // In a real implementation, this would generate a context-aware
    // vision statement based on the current state of development
    
    return `
    # Architectural Vision Statement
    
    ## System Purpose
    The Benton County Assessment System provides an integrated platform for property assessment,
    valuation, and tax calculation that ensures compliance with Washington State regulations while
    maximizing accuracy and efficiency.
    
    ## Architectural Principles
    1. **Component-Based Design**: All functionality is organized into loosely-coupled components
    2. **Agent-Based Architecture**: Specialized agents handle specific domains
    3. **Data Quality First**: All processes prioritize data quality and validation
    4. **Regulatory Compliance**: System enforces compliance at every stage
    5. **Continuous Learning**: Agents improve with experience via feedback loops
    
    ## Current Development Focus
    - Completing core agent communication infrastructure
    - Enhancing data validation capabilities
    - Implementing compliance checking
    - Beginning development of valuation methodologies
    `;
  }

  /**
   * Generate a system diagram in the configured format
   */
  generateSystemDiagram(): string {
    if (this.settings.systemDiagramFormat === 'mermaid') {
      return this.generateMermaidDiagram();
    } else {
      return JSON.stringify(Array.from(this.components.values()), null, 2);
    }
  }

  /**
   * Generate a system diagram in Mermaid format
   */
  private generateMermaidDiagram(): string {
    let diagram = 'graph TD;\n';
    
    // Add all components
    this.components.forEach(component => {
      diagram += `  ${component.id}["${component.name} (${component.type})"]\n`;
    });
    
    // Add dependencies
    this.components.forEach(component => {
      component.dependencies.forEach(depId => {
        diagram += `  ${depId} --> ${component.id}\n`;
      });
    });
    
    return diagram;
  }

  /**
   * Register a new component in the system architecture
   */
  registerComponent(component: SystemComponent): string {
    // Generate ID if not provided
    const id = component.id || `component-${uuidv4()}`;
    component.id = id;
    
    // Register component
    this.components.set(id, component);
    
    // Notify about new component
    this.notifyComponentUpdate(component, 'registered');
    
    return id;
  }

  /**
   * Update an existing component
   */
  updateComponent(id: string, updates: Partial<SystemComponent>): boolean {
    const component = this.components.get(id);
    
    if (!component) {
      return false;
    }
    
    // Apply updates
    const updatedComponent = { ...component, ...updates };
    this.components.set(id, updatedComponent);
    
    // Notify about component update
    this.notifyComponentUpdate(updatedComponent, 'updated');
    
    return true;
  }

  /**
   * Notify subscribers about component changes
   */
  private notifyComponentUpdate(component: SystemComponent, action: string): void {
    const message = createMessage(
      this.id,
      'all',
      MessageEventType.EVENT,
      {
        eventType: 'component-update',
        action,
        component
      }
    );
    
    this.safeSendMessage(message);
  }

  /**
   * Record an architectural decision
   */
  recordDecision(decision: Omit<ArchitecturalDecision, 'id' | 'date'>): string {
    const id = uuidv4();
    const fullDecision: ArchitecturalDecision = {
      ...decision,
      id,
      date: new Date()
    };
    
    this.decisions.set(id, fullDecision);
    
    // Notify about new decision
    const message = createMessage(
      this.id,
      'all',
      MessageEventType.EVENT,
      {
        eventType: 'architectural-decision',
        decision: fullDecision
      }
    );
    
    this.safeSendMessage(message);
    
    return id;
  }

  /**
   * Handle specific message types for the Architect Prime
   */
  protected async handleMessage(message: any): Promise<void> {
    // Process messages that need architectural oversight
    if (message.eventType === MessageEventType.AGENT_REGISTRATION) {
      this.handleAgentRegistration(message);
    } else if (message.payload?.eventType === 'architecture-query') {
      this.handleArchitectureQuery(message);
    } else if (message.payload?.eventType === 'compliance-report') {
      this.handleComplianceReport(message);
    } else {
      // Let the base agent handle other messages
      await super.handleMessage(message);
    }
  }

  /**
   * Handle agent registration events
   */
  private handleAgentRegistration(message: any): void {
    const agentId = message.sender;
    const agentType = message.payload?.agentType;
    
    if (agentId && agentType) {
      // Update component registry if this is a component lead
      if (agentType.includes('LEAD')) {
        const componentId = `component-${agentId}`;
        if (this.components.has(componentId)) {
          this.updateComponent(componentId, { responsibleAgent: agentId });
        } else {
          this.registerComponent({
            id: componentId,
            name: `${agentType} Component`,
            description: `Component managed by ${agentId}`,
            type: 'service',
            dependencies: ['core-mcp'],
            responsibleAgent: agentId
          });
        }
      }
      
      // Welcome the new agent
      this.sendWelcomeMessage(agentId, agentType);
    }
  }

  /**
   * Send welcome message to newly registered agents
   */
  private sendWelcomeMessage(agentId: string, agentType: string): void {
    const message = createMessage(
      this.id,
      agentId,
      MessageEventType.COMMAND,
      {
        command: 'welcome',
        content: `Welcome, ${agentId} (${agentType})! You are now part of the BCBS GeoAssessment System architecture.`,
        visionStatement: this.generateVisionStatement().trim()
      }
    );
    
    this.safeSendMessage(message);
  }

  /**
   * Handle architecture query requests
   */
  private handleArchitectureQuery(message: any): void {
    const queryType = message.payload.query;
    const requesterId = message.sender;
    
    let responseData: any = {};
    
    switch (queryType) {
      case 'system-diagram':
        responseData = {
          diagram: this.generateSystemDiagram(),
          format: this.settings.systemDiagramFormat
        };
        break;
      case 'components':
        responseData = {
          components: Array.from(this.components.values())
        };
        break;
      case 'decisions':
        responseData = {
          decisions: Array.from(this.decisions.values())
        };
        break;
      default:
        responseData = {
          error: `Unknown query type: ${queryType}`
        };
    }
    
    // Send response
    const response = createMessage(
      this.id,
      requesterId,
      MessageEventType.RESPONSE,
      responseData,
      {
        correlationId: message.id
      }
    );
    
    this.safeSendMessage(response);
  }

  /**
   * Handle compliance reports
   */
  private handleComplianceReport(message: any): void {
    const report = message.payload;
    const senderId = message.sender;
    
    // In a real implementation, we would analyze the compliance report
    // and take appropriate actions
    
    // For now, just acknowledge receipt
    const response = createMessage(
      this.id,
      senderId,
      MessageEventType.RESPONSE,
      {
        status: 'received',
        message: 'Compliance report received and processed'
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
      componentCount: this.components.size,
      decisionCount: this.decisions.size,
      lastVisionStatement: new Date().toISOString()
    };
  }
}