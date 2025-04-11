/**
 * Base Agent
 * 
 * Defines the foundation for all agent types in the system.
 * Provides common functionality and a standardized interface.
 */

import { 
  AgentCommunicationBus,
  AgentType,
  AgentStatus,
  Task,
  TaskStatus
} from '../../shared/protocols/agent-communication';
import {
  AgentMessage,
  MessageEventType,
  MessagePriority,
  createMessage,
  createSuccessResponse,
  createErrorResponse
} from '../../shared/protocols/message-protocol';
import { logger } from '../utils/logger';

// Base Agent abstract class
export abstract class BaseAgent {
  protected agentId: string;
  protected communicationBus: AgentCommunicationBus;
  protected status: AgentStatus = AgentStatus.INITIALIZING;
  protected settings: Record<string, any>;
  protected isShuttingDown: boolean = false;
  protected messageHandlers: Map<string, (message: AgentMessage) => Promise<void>> = new Map();
  
  constructor(agentId: string, communicationBus: AgentCommunicationBus, settings: Record<string, any> = {}) {
    this.agentId = agentId;
    this.communicationBus = communicationBus;
    this.settings = settings;
    
    // Register with the communication bus
    if (typeof this.communicationBus.registerAgent === 'function') {
      this.communicationBus.registerAgent(this.agentId);
    } else {
      logger.warn(`Agent ${this.agentId}: registerAgent not available on communication bus`);
    }
    
    // Subscribe to messages for this agent
    if (typeof this.communicationBus.subscribeToAgent === 'function') {
      this.communicationBus.subscribeToAgent(this.agentId, this.handleMessage.bind(this));
    } else {
      logger.warn(`Agent ${this.agentId}: subscribeToAgent not available on communication bus`);
    }
    
    // Register message handlers
    this.registerMessageHandlers();
    
    logger.info(`Agent ${this.agentId} created`);
  }
  
  /**
   * Register message handlers for different message types
   */
  protected registerMessageHandlers(): void {
    this.messageHandlers.set(MessageEventType.COMMAND, this.handleCommand.bind(this));
    this.messageHandlers.set(MessageEventType.QUERY, this.handleQuery.bind(this));
    this.messageHandlers.set(MessageEventType.EVENT, this.handleEvent.bind(this));
    this.messageHandlers.set(MessageEventType.ASSISTANCE_REQUESTED, this.handleAssistanceRequest.bind(this));
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing agent ${this.agentId}`);
    
    try {
      // Call the agent-specific initialization method
      await this.onInitialize();
      
      // Update status
      this.status = AgentStatus.READY;
      
      // Broadcast status update
      this.broadcastStatus();
      
      logger.info(`Agent ${this.agentId} initialized successfully`);
    } catch (error) {
      this.status = AgentStatus.ERROR;
      logger.error(`Failed to initialize agent ${this.agentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Shutdown the agent
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    logger.info(`Shutting down agent ${this.agentId}`);
    this.isShuttingDown = true;
    this.status = AgentStatus.SHUTTING_DOWN;
    
    try {
      // Call the agent-specific shutdown method
      await this.onShutdown();
      
      // Unsubscribe from the communication bus
      if (typeof this.communicationBus.unsubscribeFromAgent === 'function') {
        this.communicationBus.unsubscribeFromAgent(this.agentId, this.handleMessage.bind(this));
      } else {
        logger.warn(`Agent ${this.agentId}: unsubscribeFromAgent not available on communication bus`);
      }
      
      // Unregister from the communication bus
      if (typeof this.communicationBus.unregisterAgent === 'function') {
        this.communicationBus.unregisterAgent(this.agentId);
      } else {
        logger.warn(`Agent ${this.agentId}: unregisterAgent not available on communication bus`);
      }
      
      logger.info(`Agent ${this.agentId} shut down successfully`);
    } catch (error) {
      logger.error(`Error during shutdown of agent ${this.agentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle an incoming message
   */
  protected async handleMessage(message: AgentMessage): Promise<void> {
    logger.debug(`Agent ${this.agentId} received message: ${message.messageId} of type ${message.eventType}`);
    
    // Don't process new messages if shutting down
    if (this.isShuttingDown) {
      const errorResponse = createErrorResponse(
        message,
        'agent_shutting_down',
        `Agent ${this.agentId} is shutting down and cannot process new messages`
      );
      this.safeSendMessage(errorResponse);
      return;
    }
    
    try {
      // Route to the appropriate handler based on event type
      const handler = this.messageHandlers.get(message.eventType);
      
      if (handler) {
        await handler(message);
      } else {
        logger.warn(`No handler registered for message type ${message.eventType}`);
        
        // Only send error response if it's not already a response
        if (message.eventType !== MessageEventType.RESPONSE) {
          const errorResponse = createErrorResponse(
            message,
            'unknown_message_type',
            `Agent ${this.agentId} does not handle messages of type ${message.eventType}`
          );
          this.safeSendMessage(errorResponse);
        }
      }
    } catch (error) {
      logger.error(`Error handling message ${message.messageId} in agent ${this.agentId}:`, error);
      
      // Send error response if not already a response
      if (message.eventType !== MessageEventType.RESPONSE) {
        const errorResponse = createErrorResponse(
          message,
          'message_handling_error',
          `Error processing message: ${(error as Error).message}`
        );
        this.safeSendMessage(errorResponse);
      }
    }
  }
  
  /**
   * Handle a command message
   */
  protected async handleCommand(message: AgentMessage): Promise<void> {
    const command = message.payload.commandName;
    logger.debug(`Agent ${this.agentId} handling command: ${command}`);
    
    // Set status to busy while processing the command
    this.status = AgentStatus.BUSY;
    this.broadcastStatus();
    
    try {
      // Default implementation just responds with an error
      const errorResponse = createErrorResponse(
        message,
        'command_not_supported',
        `Command ${command} is not supported by agent ${this.agentId}`
      );
      this.safeSendMessage(errorResponse);
    } finally {
      // Reset status
      this.status = AgentStatus.READY;
      this.broadcastStatus();
    }
  }
  
  /**
   * Handle a query message
   */
  protected async handleQuery(message: AgentMessage): Promise<void> {
    const queryType = message.payload.queryType;
    logger.debug(`Agent ${this.agentId} handling query: ${queryType}`);
    
    // Set status to busy while processing the query
    this.status = AgentStatus.BUSY;
    this.broadcastStatus();
    
    try {
      // Default implementation just responds with an error
      const errorResponse = createErrorResponse(
        message,
        'query_not_supported',
        `Query ${queryType} is not supported by agent ${this.agentId}`
      );
      this.safeSendMessage(errorResponse);
    } finally {
      // Reset status
      this.status = AgentStatus.READY;
      this.broadcastStatus();
    }
  }
  
  /**
   * Handle an event message
   */
  protected async handleEvent(message: AgentMessage): Promise<void> {
    const eventName = message.payload.eventName;
    logger.debug(`Agent ${this.agentId} handling event: ${eventName}`);
    
    // Default implementation does nothing, no response required for events
    // Subclasses should override this method if they need to react to events
  }
  
  /**
   * Handle a response message
   */
  protected async handleResponse(message: AgentMessage): Promise<void> {
    logger.debug(`Agent ${this.agentId} received response to message ${message.correlationId}`);
    
    // Default implementation does nothing
    // The communication bus takes care of routing responses to their requesters
    // Subclasses can override this if they need custom response handling
  }
  
  /**
   * Handle a status update message
   */
  protected async handleStatusUpdate(message: AgentMessage): Promise<void> {
    logger.debug(`Agent ${this.agentId} received status update: ${message.payload.status}`);
    
    // Default implementation does nothing
    // Subclasses can override this if they need to react to status updates
  }
  
  /**
   * Handle an assistance request message
   */
  protected async handleAssistanceRequest(message: AgentMessage): Promise<void> {
    const issueType = message.payload.issueType;
    const description = message.payload.description;
    
    logger.debug(`Agent ${this.agentId} received assistance request: ${issueType}`);
    
    // Default implementation just responds with an error
    const errorResponse = createErrorResponse(
      message,
      'assistance_not_provided',
      `Agent ${this.agentId} cannot provide assistance for ${issueType}`
    );
    this.safeSendMessage(errorResponse);
  }
  
  /**
   * Safely send a message through the communication bus
   */
  protected safeSendMessage(message: AgentMessage): void {
    if (typeof this.communicationBus.sendMessage === 'function') {
      this.communicationBus.sendMessage(message);
    } else {
      logger.warn(`Agent ${this.agentId}: sendMessage not available on communication bus`);
    }
  }
  
  /**
   * Send a message to another agent
   */
  protected async sendMessage(
    targetAgentId: string,
    eventType: MessageEventType,
    payload: any,
    priority: MessagePriority = MessagePriority.MEDIUM
  ): Promise<AgentMessage> {
    const message = createMessage(
      this.agentId,
      targetAgentId,
      eventType,
      payload,
      { priority }
    );
    
    try {
      if (typeof this.communicationBus.sendMessageWithResponse === 'function') {
        const response = await this.communicationBus.sendMessageWithResponse(message);
        return response;
      } else {
        logger.warn(`Agent ${this.agentId}: sendMessageWithResponse not available on communication bus`);
        throw new Error('Communication bus does not support sendMessageWithResponse');
      }
    } catch (error) {
      logger.error(`Error sending message to ${targetAgentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Broadcast a status update
   */
  protected broadcastStatus(): void {
    const statusMessage = createMessage(
      this.agentId,
      'broadcast',
      MessageEventType.STATUS_UPDATE,
      {
        status: this.status,
        metrics: this.getStatusMetrics()
      }
    );
    
    this.safeSendMessage(statusMessage);
  }
  
  /**
   * Get status metrics for this agent
   */
  protected getStatusMetrics(): Record<string, any> {
    // Base implementation just returns basic info
    // Subclasses should override to provide more detailed metrics
    return {
      status: this.status,
      uptime: process.uptime()
    };
  }
  
  /**
   * Get the current status of the agent
   */
  public getStatus(): AgentStatus {
    return this.status;
  }
  
  /**
   * Agent-specific initialization logic
   * Subclasses must implement this method
   */
  protected abstract onInitialize(): Promise<void>;
  
  /**
   * Agent-specific shutdown logic
   * Subclasses must implement this method
   */
  protected abstract onShutdown(): Promise<void>;
}