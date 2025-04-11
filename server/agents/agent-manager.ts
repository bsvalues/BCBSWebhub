/**
 * Agent Manager
 * 
 * Manages the lifecycle of agents in the system. 
 * Responsible for starting, stopping, and coordinating agents.
 */

import { BaseAgent } from './base-agent';
import { AgentCommunicationBus, AgentType } from '../../shared/protocols/agent-communication';
import { 
  createMessage, 
  MessageEventType, 
  MessagePriority 
} from '../../shared/protocols/message-protocol';
import { ExperienceReplayBuffer } from '../services/replay-buffer';
import { MasterControlProgram } from './master-control-program';
import { DataValidationAgent } from './data-validation-agent';
import { ComplianceAgent } from './compliance-agent';
import { ArchitectPrimeAgent } from './architect-prime-agent';
import { IntegrationCoordinatorAgent } from './integration-coordinator-agent';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Interface for agent configuration
export interface AgentConfig {
  type: AgentType | string;
  settings: Record<string, any>;
}

// Interface for agent manager configuration
export interface AgentManagerConfig {
  agents: Record<string, AgentConfig>;
}

// Singleton instance of the agent manager
let agentManagerInstance: AgentManager | null = null;

export class AgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private communicationBus: AgentCommunicationBus;
  private replayBuffer: ExperienceReplayBuffer;
  private config: AgentManagerConfig;
  private ready = false;
  
  constructor(communicationBus: AgentCommunicationBus, config: AgentManagerConfig = { agents: {} }) {
    this.communicationBus = communicationBus;
    this.config = config;
    
    // Initialize replay buffer
    this.replayBuffer = new ExperienceReplayBuffer({
      maxSize: 10000, // Store up to 10,000 experiences
      priorityLevels: 3 // Corresponds to HIGH, MEDIUM, LOW priorities
    });
    
    // Register for global messages to track in replay buffer
    this.communicationBus.subscribeToAllMessages(this.handleMessageForReplayBuffer.bind(this));
  }
  
  /**
   * Safely send a message through the communication bus
   * Similar to BaseAgent's safeSendMessage but implemented directly in AgentManager
   */
  private safeSendMessage(message: any): void {
    if (typeof this.communicationBus.sendMessage === 'function') {
      this.communicationBus.sendMessage(message);
    } else {
      logger.warn(`AgentManager: sendMessage not available on communication bus`);
    }
  }
  
  /**
   * Initialize the agent manager
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing Agent Manager');
    
    try {
      // Start core agents
      await this.startMasterControlProgram();
      
      // Start any agents defined in the configuration
      const startupPromises = Object.entries(this.config.agents).map(
        ([agentId, agentConfig]) => this.startAgent(agentId, agentConfig.type, agentConfig.settings)
      );
      
      await Promise.all(startupPromises);
      
      this.ready = true;
      logger.info('Agent Manager successfully initialized');
    } catch (error) {
      logger.error('Failed to initialize Agent Manager:', error);
      throw error;
    }
  }
  
  /**
   * Start the Master Control Program (MCP) agent
   * This is a special agent that orchestrates all other agents
   */
  private async startMasterControlProgram(): Promise<BaseAgent> {
    logger.info('Starting Master Control Program');
    
    const mcpId = 'mcp';
    
    // Check if MCP is already running
    if (this.agents.has(mcpId)) {
      return this.agents.get(mcpId)!;
    }
    
    // Create and initialize the MCP
    const mcp = new MasterControlProgram(
      mcpId,
      this.communicationBus,
      {
        priorityQueue: true,
        maxConcurrentTasks: 10
      }
    );
    
    await mcp.initialize();
    
    // Store reference to the MCP
    this.agents.set(mcpId, mcp);
    
    logger.info('Master Control Program started successfully');
    
    return mcp;
  }
  
  /**
   * Start a Data Validation Agent
   */
  private async startDataValidationAgent(
    agentId: string,
    settings: Record<string, any>
  ): Promise<BaseAgent> {
    logger.info(`Starting Data Validation Agent: ${agentId}`);
    
    const agent = new DataValidationAgent(
      agentId,
      this.communicationBus,
      settings
    );
    
    await agent.initialize();
    
    this.agents.set(agentId, agent);
    
    logger.info(`Data Validation Agent ${agentId} started successfully`);
    
    return agent;
  }
  
  /**
   * Start a Compliance Agent
   */
  private async startComplianceAgent(
    agentId: string,
    settings: Record<string, any>
  ): Promise<BaseAgent> {
    logger.info(`Starting Compliance Agent: ${agentId}`);
    
    const agent = new ComplianceAgent(
      agentId,
      this.communicationBus,
      settings
    );
    
    await agent.initialize();
    
    this.agents.set(agentId, agent);
    
    logger.info(`Compliance Agent ${agentId} started successfully`);
    
    return agent;
  }

  /**
   * Start an Architect Prime Agent
   */
  private async startArchitectPrimeAgent(
    agentId: string,
    settings: Record<string, any>
  ): Promise<BaseAgent> {
    logger.info(`Starting Architect Prime Agent: ${agentId}`);
    
    const agent = new ArchitectPrimeAgent(
      agentId,
      this.communicationBus,
      settings
    );
    
    await agent.initialize();
    
    this.agents.set(agentId, agent);
    
    logger.info(`Architect Prime Agent ${agentId} started successfully`);
    
    return agent;
  }

  /**
   * Start an Integration Coordinator Agent
   */
  private async startIntegrationCoordinatorAgent(
    agentId: string,
    settings: Record<string, any>
  ): Promise<BaseAgent> {
    logger.info(`Starting Integration Coordinator Agent: ${agentId}`);
    
    const agent = new IntegrationCoordinatorAgent(
      agentId,
      this.communicationBus,
      settings
    );
    
    await agent.initialize();
    
    this.agents.set(agentId, agent);
    
    logger.info(`Integration Coordinator Agent ${agentId} started successfully`);
    
    return agent;
  }
  
  /**
   * Start BCBS Master Lead Agent
   */
  private async startBCBSMasterLeadAgent(
    agentId: string,
    settings: Record<string, any>
  ): Promise<BaseAgent> {
    logger.info(`Starting BCBS Master Lead Agent: ${agentId}`);
    
    // Import dynamically to avoid circular dependencies
    const { BCBSMasterLeadAgent } = await import('./bcbs-master-lead-agent');
    
    const agent = new BCBSMasterLeadAgent(
      agentId,
      this.communicationBus,
      settings || {
        domainAreas: ['property-assessment', 'tax-calculation', 'gis-integration', 'compliance'],
        priorityGoals: ['Data accuracy', 'Processing efficiency', 'Regulatory compliance'],
        complianceFrameworks: ['washington-state']
      }
    );
    
    await agent.initialize();
    
    this.agents.set(agentId, agent);
    
    logger.info(`BCBS Master Lead Agent ${agentId} started successfully`);
    
    return agent;
  }
  
  /**
   * Start BCBS GISPro Lead Agent
   */
  private async startBCBSGISProLeadAgent(
    agentId: string,
    settings: Record<string, any>
  ): Promise<BaseAgent> {
    logger.info(`Starting BCBS GISPro Lead Agent: ${agentId}`);
    
    // Import dynamically to avoid circular dependencies
    const { BCBSGISProLeadAgent } = await import('./bcbs-gispro-lead-agent');
    
    const agent = new BCBSGISProLeadAgent(
      agentId,
      this.communicationBus,
      settings || {
        supportedDataFormats: ['shapefile', 'geojson', 'geopackage', 'kml'],
        spatialAnalysisCapabilities: ['proximity', 'overlay', 'buffer', 'interpolation'],
        serviceLevels: {
          'vector_processing': 10,
          'raster_processing': 5,
          'spatial_analytics': 8
        }
      }
    );
    
    await agent.initialize();
    
    this.agents.set(agentId, agent);
    
    logger.info(`BCBS GISPro Lead Agent ${agentId} started successfully`);
    
    return agent;
  }
  
  /**
   * Start BCBS Levy Lead Agent
   */
  private async startBCBSLevyLeadAgent(
    agentId: string,
    settings: Record<string, any>
  ): Promise<BaseAgent> {
    logger.info(`Starting BCBS Levy Lead Agent: ${agentId}`);
    
    // Import dynamically to avoid circular dependencies
    const { BCBSLevyLeadAgent } = await import('./bcbs-levy-lead-agent');
    
    const agent = new BCBSLevyLeadAgent(
      agentId,
      this.communicationBus,
      settings || {
        taxYears: [new Date().getFullYear(), new Date().getFullYear() + 1],
        levyRateSources: ['washington-dor', 'county-treasurer', 'municipal-budget'],
        taxingAuthorities: ['state', 'county', 'city', 'school', 'fire', 'library', 'port'],
        calculationModes: ['standard', 'special-assessment', 'multi-year']
      }
    );
    
    await agent.initialize();
    
    this.agents.set(agentId, agent);
    
    logger.info(`BCBS Levy Lead Agent ${agentId} started successfully`);
    
    return agent;
  }
  
  /**
   * Start an agent of a specific type
   */
  public async startAgent(
    agentId: string = uuidv4(),
    type: AgentType | string,
    settings: Record<string, any> = {}
  ): Promise<BaseAgent | null> {
    // Check if agent with this ID already exists
    if (this.agents.has(agentId)) {
      logger.warn(`Agent with ID ${agentId} already exists`);
      return this.agents.get(agentId)!;
    }
    
    try {
      let agent: BaseAgent | null = null;
      
      // Create the agent based on type
      switch (type) {
        // Strategic Leadership Layer
        case AgentType.ARCHITECT_PRIME:
          agent = await this.startArchitectPrimeAgent(agentId, settings);
          break;
        case AgentType.INTEGRATION_COORDINATOR:
          agent = await this.startIntegrationCoordinatorAgent(agentId, settings);
          break;

        // Core Orchestration
        case AgentType.MCP:
          agent = await this.startMasterControlProgram();
          break;
          
        // Specialized Functional Agents
        case AgentType.DATA_VALIDATION:
          agent = await this.startDataValidationAgent(agentId, settings);
          break;
        case AgentType.COMPLIANCE:
          agent = await this.startComplianceAgent(agentId, settings);
          break;
          
        // Component Leads
        case AgentType.BSBC_MASTER_LEAD:
          agent = await this.startBCBSMasterLeadAgent(agentId, settings);
          break;
        case AgentType.BCBS_GISPRO_LEAD:
          agent = await this.startBCBSGISProLeadAgent(agentId, settings);
          break;
        case AgentType.BCBS_LEVY_LEAD:
          agent = await this.startBCBSLevyLeadAgent(agentId, settings);
          break;
          
        // Add other agent types as they are implemented
        default:
          logger.error(`Unknown agent type: ${type}`);
          return null;
      }
      
      // Notify MCP of new agent (if it's not the MCP itself)
      if (agent && agentId !== 'mcp') {
        const mcp = this.agents.get('mcp');
        if (mcp) {
          const message = createMessage(
            'agent-manager',
            'mcp',
            MessageEventType.EVENT,
            {
              eventName: 'agentStarted',
              agentId,
              agentType: type
            }
          );
          
          this.safeSendMessage(message);
        }
      }
      
      return agent;
    } catch (error) {
      logger.error(`Failed to start agent ${agentId} of type ${type}:`, error);
      return null;
    }
  }
  
  /**
   * Stop an agent
   */
  public async stopAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      logger.warn(`Agent ${agentId} not found, cannot stop`);
      return false;
    }
    
    try {
      // Notify MCP before stopping the agent (unless it's the MCP itself)
      if (agentId !== 'mcp') {
        const mcp = this.agents.get('mcp');
        if (mcp) {
          const message = createMessage(
            'agent-manager',
            'mcp',
            MessageEventType.EVENT,
            {
              eventName: 'agentStopping',
              agentId
            }
          );
          
          this.safeSendMessage(message);
        }
      }
      
      // Shutdown the agent
      await agent.shutdown();
      
      // Remove from agents map
      this.agents.delete(agentId);
      
      // Notify MCP after stopping the agent (unless it's the MCP itself)
      if (agentId !== 'mcp') {
        const mcp = this.agents.get('mcp');
        if (mcp) {
          const message = createMessage(
            'agent-manager',
            'mcp',
            MessageEventType.EVENT,
            {
              eventName: 'agentStopped',
              agentId
            }
          );
          
          this.safeSendMessage(message);
        }
      }
      
      logger.info(`Agent ${agentId} stopped successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to stop agent ${agentId}:`, error);
      return false;
    }
  }
  
  /**
   * Shutdown all agents and the manager
   */
  public async shutdown(): Promise<void> {
    if (!this.ready) {
      logger.info('Agent Manager already shutdown or not initialized');
      return;
    }
    
    logger.info('Shutting down Agent Manager');
    
    try {
      // Stop all agents except MCP first
      const stopPromises: Promise<boolean>[] = [];
      
      for (const [agentId, agent] of this.agents.entries()) {
        if (agentId !== 'mcp') {
          stopPromises.push(this.stopAgent(agentId));
        }
      }
      
      await Promise.all(stopPromises);
      
      // Now stop MCP
      if (this.agents.has('mcp')) {
        await this.stopAgent('mcp');
      }
      
      // Unsubscribe from all messages
      this.communicationBus.unsubscribeFromAllMessages(this.handleMessageForReplayBuffer.bind(this));
      
      this.ready = false;
      logger.info('Agent Manager shutdown complete');
    } catch (error) {
      logger.error('Error during Agent Manager shutdown:', error);
      throw error;
    }
  }
  
  /**
   * Handle messages for the replay buffer
   */
  private handleMessageForReplayBuffer(message: any): void {
    // Add interesting messages to the replay buffer
    // Skip responses and status updates to avoid cluttering the buffer
    if (
      message.eventType !== MessageEventType.RESPONSE &&
      message.eventType !== MessageEventType.STATUS_UPDATE
    ) {
      // Determine priority level (0 is highest)
      const priorityLevel = message.metadata?.priority === MessagePriority.HIGH ? 0 :
                            message.metadata?.priority === MessagePriority.MEDIUM ? 1 : 2;
      
      this.replayBuffer.add(message, priorityLevel);
    }
    
    // For responses, check if they indicate success or failure
    if (message.eventType === MessageEventType.RESPONSE) {
      const isSuccess = message.payload?.status === 'success';
      
      // If this is a response to a message we have in the buffer, update its outcome
      if (message.correlationId) {
        this.replayBuffer.updateOutcome(message.correlationId, isSuccess);
      }
    }
  }
  
  /**
   * Get status information for all agents
   */
  public getAgentStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [agentId, agent] of this.agents.entries()) {
      status[agentId] = {
        id: agentId,
        type: agent.constructor.name,
        status: agent.getStatus()
      };
    }
    
    return status;
  }
  
  /**
   * Get statistics about the replay buffer
   */
  public getReplayBufferStats(): Record<string, any> {
    return {
      size: this.replayBuffer.getSize(),
      successRate: this.replayBuffer.getSuccessRate(),
      priorityDistribution: this.replayBuffer.getPriorityDistribution(),
      recentExperiences: this.replayBuffer.getRecentExperiences(5)
    };
  }
}

/**
 * Get the global AgentManager instance
 */
export function getAgentManager(
  communicationBus: AgentCommunicationBus,
  config?: AgentManagerConfig
): AgentManager {
  if (!agentManagerInstance) {
    agentManagerInstance = new AgentManager(communicationBus, config);
  }
  return agentManagerInstance;
}

/**
 * Reset the global AgentManager instance
 */
export function resetAgentManager(): void {
  if (agentManagerInstance) {
    agentManagerInstance.shutdown().catch(error => {
      logger.error('Error shutting down agent manager during reset:', error);
    });
    agentManagerInstance = null;
  }
}