/**
 * Agent Communication Bus
 * 
 * Provides a centralized publish-subscribe system for inter-agent communication
 * with standardized message formats, event-driven architecture, and support
 * for direct messaging and broadcasting.
 */

import {
  AgentMessage,
  MessageEventType,
  createErrorResponse,
  isMessageExpired
} from './message-protocol';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Define common agent types here to avoid circular dependencies
export enum AgentType {
  // Strategic Leadership Layer
  ARCHITECT_PRIME = 'ARCHITECT_PRIME',     // Top-level architectural vision
  INTEGRATION_COORDINATOR = 'INTEGRATION_COORDINATOR', // Second-level integration management
  
  // Component Leads
  BSBC_MASTER_LEAD = 'BSBC_MASTER_LEAD',   // Core system architecture lead
  BCBS_GISPRO_LEAD = 'BCBS_GISPRO_LEAD',   // Geospatial expertise lead
  BCBS_LEVY_LEAD = 'BCBS_LEVY_LEAD',       // Tax calculation lead
  BCBS_COST_APP_LEAD = 'BCBS_COST_APP_LEAD', // Valuation methodology lead
  BCBS_GEO_ASSESSMENT_LEAD = 'BCBS_GEO_ASSESSMENT_LEAD', // Integration patterns lead
  
  // Core Orchestration and Task Management
  MCP = 'MCP',                      // Master Control Program - orchestrator
  
  // Specialized Functional Agents
  DATA_VALIDATION = 'DATA_VALIDATION', // Data Validation Agent
  VALUATION = 'VALUATION',          // Valuation Agent
  COMPLIANCE = 'COMPLIANCE',        // Compliance Agent
  USER_INTERACTION = 'USER_INTERACTION', // User Interaction Agent
  NOTIFICATION = 'NOTIFICATION',    // Notification Agent
  
  // Additional specialized agents
  DATA_QUALITY = 'DATA_QUALITY',    // Data Quality Agent
  COMPLIANCE_AGENT = 'COMPLIANCE_AGENT', // Compliance Validation Agent 
  VALUATION_AGENT = 'VALUATION_AGENT', // Specialized Valuation Agent
  
  // Assessment Calculation Agents
  PROPERTY_ATTRIBUTE = 'PROPERTY_ATTRIBUTE', // Property attribute processing
  LOCATION_FACTOR = 'LOCATION_FACTOR',       // Location factor analysis
  MARKET_ANALYSIS = 'MARKET_ANALYSIS',       // Market data analysis
  
  // Geospatial Integration Agents
  VECTOR_PROCESSING = 'VECTOR_PROCESSING',   // Vector data processing
  RASTER_PROCESSING = 'RASTER_PROCESSING',   // Raster data processing
  SPATIAL_ANALYTICS = 'SPATIAL_ANALYTICS'    // Spatial analytics and visualization
}

// Task status enum
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// Agent status 
export enum AgentStatus {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  BUSY = 'BUSY',
  PAUSED = 'PAUSED',
  SHUTTING_DOWN = 'SHUTTING_DOWN',
  ERROR = 'ERROR'
}

// Task interface
export interface Task {
  id: string;
  type: string;
  parameters: Record<string, any>;
  status: TaskStatus;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

// Define the message handler callback type
export type MessageHandler = (message: AgentMessage) => Promise<void>;

// Define the response holder interface
interface ResponseHolder {
  resolve: (response: AgentMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

// The main agent communication bus class
export class AgentCommunicationBus {
  // Track registered agents
  public registeredAgents: Set<string> = new Set();
  
  // Keep track of pending response promises
  public responseRegistry: Map<string, ResponseHolder> = new Map();
  
  // Event emitter for agent-specific messages
  private agentEmitter: EventEmitter = new EventEmitter();
  
  // Event emitter for topic-based messages
  private topicEmitter: EventEmitter = new EventEmitter();
  
  // Default response timeout
  private defaultResponseTimeoutMs: number = 30000;
  
  // Constructor with optional configuration
  constructor(options: { defaultResponseTimeoutMs?: number } = {}) {
    // Set the default response timeout if provided
    if (options.defaultResponseTimeoutMs) {
      this.defaultResponseTimeoutMs = options.defaultResponseTimeoutMs;
    }
    
    // Set maximum number of listeners to avoid warnings
    this.agentEmitter.setMaxListeners(100);
    this.topicEmitter.setMaxListeners(100);
  }
  
  /**
   * Register an agent with the communication bus
   */
  public registerAgent(agentId: string): void {
    if (this.registeredAgents.has(agentId)) {
      console.warn(`Agent ${agentId} is already registered`);
      return;
    }
    
    this.registeredAgents.add(agentId);
    console.log(`Agent ${agentId} registered with communication bus`);
  }
  
  /**
   * Unregister an agent from the communication bus
   */
  public unregisterAgent(agentId: string): void {
    if (!this.registeredAgents.has(agentId)) {
      console.warn(`Agent ${agentId} is not registered`);
      return;
    }
    
    this.registeredAgents.delete(agentId);
    console.log(`Agent ${agentId} unregistered from communication bus`);
  }
  
  /**
   * Subscribe to messages for a specific agent
   */
  public subscribeToAgent(
    agentId: string, 
    handler: MessageHandler
  ): void {
    this.agentEmitter.on(agentId, handler);
  }
  
  /**
   * Unsubscribe from messages for a specific agent
   */
  public unsubscribeFromAgent(
    agentId: string, 
    handler: MessageHandler
  ): void {
    this.agentEmitter.off(agentId, handler);
  }
  
  /**
   * Subscribe to a topic
   */
  public subscribeToTopic(
    topic: string, 
    handler: MessageHandler
  ): void {
    this.topicEmitter.on(topic, handler);
  }
  
  /**
   * Unsubscribe from a topic
   */
  public unsubscribeFromTopic(
    topic: string, 
    handler: MessageHandler
  ): void {
    this.topicEmitter.off(topic, handler);
  }
  
  /**
   * Send a message
   * This handles routing to the correct destination
   */
  public sendMessage(message: AgentMessage): void {
    // Check if message has expired
    if (isMessageExpired(message)) {
      console.warn(`Message ${message.messageId} has expired and will not be delivered`);
      return;
    }
    
    // Handle broadcasts to all agents
    if (message.destination === 'broadcast') {
      // Emit to all registered agents
      for (const agentId of this.registeredAgents) {
        if (agentId !== message.source) {
          this.agentEmitter.emit(agentId, message);
        }
      }
      return;
    }
    
    // Check if this is a response to a message
    if (message.eventType === MessageEventType.RESPONSE && message.correlationId) {
      const responseHolder = this.responseRegistry.get(message.correlationId);
      
      if (responseHolder) {
        // Clear the timeout
        clearTimeout(responseHolder.timeout);
        
        // Remove from the registry
        this.responseRegistry.delete(message.correlationId);
        
        // Resolve the promise
        responseHolder.resolve(message);
        return;
      }
    }
    
    // Handle case where destination is not registered
    if (!this.registeredAgents.has(message.destination) && message.destination !== 'broadcast') {
      console.warn(`Agent ${message.destination} is not registered, message will not be delivered`);
      
      // If the message requires a response, send an error response
      if (message.requiresResponse) {
        const errorResponse = createErrorResponse(
          message,
          'destination_not_found',
          `Agent ${message.destination} is not registered`
        );
        
        // Send the error response back to the source
        this.sendMessage(errorResponse);
      }
      
      return;
    }
    
    // Emit the message to the destination agent
    this.agentEmitter.emit(message.destination, message);
  }
  
  /**
   * Send a message and wait for a response
   */
  public sendMessageWithResponse(
    message: AgentMessage, 
    timeoutMs: number = this.defaultResponseTimeoutMs
  ): Promise<AgentMessage> {
    // Make sure the message requires a response
    const messageWithResponse = {
      ...message,
      requiresResponse: true
    };
    
    return new Promise<AgentMessage>((resolve, reject) => {
      // Create a timeout to reject the promise if no response is received
      const timeout = setTimeout(() => {
        // Remove from the registry
        this.responseRegistry.delete(messageWithResponse.messageId);
        
        // Reject the promise
        reject(new Error(`No response received for message ${messageWithResponse.messageId} within ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Add to the registry
      this.responseRegistry.set(messageWithResponse.messageId, {
        resolve,
        reject,
        timeout
      });
      
      // Send the message
      this.sendMessage(messageWithResponse);
    });
  }
  
  /**
   * Publish a message to a topic
   */
  public publishToTopic(topic: string, message: AgentMessage): void {
    this.topicEmitter.emit(topic, message);
  }
  
  /**
   * Create a unique message ID
   */
  public static createMessageId(): string {
    return uuidv4();
  }
  
  /**
   * Create an error response for a message
   */
  public static createErrorResponse(
    originalMessage: AgentMessage, 
    error: Error | string
  ): AgentMessage {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    return createErrorResponse(
      originalMessage,
      'error',
      errorMessage
    );
  }
}