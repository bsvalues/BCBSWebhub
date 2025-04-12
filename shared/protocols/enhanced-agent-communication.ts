/**
 * Enhanced Agent Communication Protocol
 * 
 * Extends the base agent communication protocol with improved reliability:
 * - Circuit breaker integration
 * - Message delivery monitoring
 * - Delivery confirmations
 * - Priority-based message handling
 */

import {
  AgentMessage,
  MessageEventType,
  createMessage,
  createSuccessResponse,
  createErrorResponse
} from './message-protocol';

import {
  AgentCommunicationBus,
  AgentStatus,
  AgentType,
  Task,
  TaskPriority,
  TaskStatus
} from './agent-communication';

// Re-export base types
export {
  AgentMessage,
  MessageEventType,
  AgentStatus,
  AgentType,
  Task,
  TaskPriority,
  TaskStatus,
  createMessage,
  createSuccessResponse,
  createErrorResponse
};

// Extended agent status with more detailed health information
export enum EnhancedAgentStatus {
  OFFLINE = 'OFFLINE',         // Agent is not running
  INITIALIZING = 'INITIALIZING', // Agent is starting up
  READY = 'READY',             // Agent is ready to process messages/tasks
  BUSY = 'BUSY',               // Agent is processing a message/task
  DEGRADED = 'DEGRADED',       // Agent is running but with limited functionality
  ERROR = 'ERROR',             // Agent has encountered an error
  SHUTTING_DOWN = 'SHUTTING_DOWN', // Agent is in the process of shutting down
  CIRCUIT_OPEN = 'CIRCUIT_OPEN'  // Circuit breaker is open for this agent
}

// Message delivery options
export interface DeliveryOptions {
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;  // Timeout in milliseconds
  retries?: number;  // Number of retry attempts
  retryDelay?: number; // Delay between retries in milliseconds
  requireConfirmation?: boolean; // Whether to wait for delivery confirmation
}

// Message delivery result
export interface DeliveryResult {
  success: boolean;
  messageId: string;
  destination: string;
  sentAt: Date;
  deliveredAt?: Date;
  error?: string;
  retryCount?: number;
}

// Interface for the enhanced communication bus
export interface EnhancedAgentCommunicationBus {
  // Send a message with enhanced delivery options
  sendMessage(
    message: AgentMessage,
    options?: DeliveryOptions
  ): Promise<DeliveryResult>;
  
  // Send a message and wait for a response
  sendMessageWithResponse(
    message: AgentMessage,
    options?: DeliveryOptions
  ): Promise<AgentMessage>;
  
  // Register a message handler for a specific event type
  registerHandler(
    eventType: MessageEventType | string,
    handler: (message: AgentMessage) => Promise<void> | void
  ): void;
  
  // Broadcast a message to all agents or a specific group
  broadcast(
    message: AgentMessage,
    filter?: (agentId: string) => boolean
  ): Promise<DeliveryResult[]>;
  
  // Get the health status of all connected agents
  getAgentsHealth(): Promise<Record<string, any>>;
  
  // Get the circuit breaker status for all agents
  getCircuitBreakersStatus(): Promise<Record<string, any>>;
  
  // Reset a circuit breaker for a specific agent
  resetCircuitBreaker(agentId: string): Promise<boolean>;
  
  // Disconnect from the communication bus
  disconnect(): Promise<void>;
}

// Enhanced communication bus implementation
export class EnhancedCommunicationBus implements EnhancedAgentCommunicationBus {
  private baseBus: AgentCommunicationBus;
  private circuitBreakerRegistry: any; // We'll inject this
  private messageHandlers: Map<string, ((message: AgentMessage) => Promise<void> | void)[]> = new Map();
  private pendingResponses: Map<string, { 
    resolve: (message: AgentMessage) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = new Map();

  constructor(baseBus: AgentCommunicationBus, circuitBreakerRegistry: any) {
    this.baseBus = baseBus;
    this.circuitBreakerRegistry = circuitBreakerRegistry;
    
    // Register handler for all messages to provide circuit breaker protection
    this.baseBus.on('message', (message: AgentMessage) => this.handleMessage(message));
    
    console.log('Enhanced communication bus initialized');
  }

  /**
   * Send a message with enhanced delivery options
   */
  public async sendMessage(
    message: AgentMessage,
    options: DeliveryOptions = {}
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    const destination = message.destination;
    const messageId = message.id;
    
    const result: DeliveryResult = {
      success: false,
      messageId,
      destination,
      sentAt: new Date(),
      retryCount: 0
    };
    
    try {
      // Check if circuit breaker exists and is open
      if (this.circuitBreakerRegistry.hasBreaker(destination)) {
        const breaker = this.circuitBreakerRegistry.getBreaker(destination);
        
        // Use circuit breaker to protect the send operation
        await breaker.execute(async () => {
          // Apply timeout if specified
          if (options.timeout) {
            await this.sendWithTimeout(message, options.timeout);
          } else {
            await this.baseBus.sendMessage(message);
          }
        });
      } else {
        // No circuit breaker, just send directly
        if (options.timeout) {
          await this.sendWithTimeout(message, options.timeout);
        } else {
          await this.baseBus.sendMessage(message);
        }
      }
      
      result.success = true;
      result.deliveredAt = new Date();
      return result;
    } catch (error) {
      // Handle retry logic if configured
      if (options.retries && options.retries > 0 && result.retryCount! < options.retries) {
        result.retryCount!++;
        
        console.log(`Retrying message ${messageId} to ${destination} (${result.retryCount}/${options.retries})`);
        
        // Delay before retry if specified
        if (options.retryDelay) {
          await new Promise(resolve => setTimeout(resolve, options.retryDelay));
        }
        
        // Recursive retry
        return this.sendMessage(message, {
          ...options,
          retries: options.retries - 1,
          retryCount: result.retryCount
        });
      }
      
      // No more retries or not configured for retry
      result.success = false;
      result.error = (error as Error).message;
      return result;
    }
  }

  /**
   * Send a message and wait for a response
   */
  public async sendMessageWithResponse(
    message: AgentMessage,
    options: DeliveryOptions = {}
  ): Promise<AgentMessage> {
    // Set default timeout if not specified
    const timeout = options.timeout || 30000; // 30 seconds default
    
    // Create a promise that will be resolved when we receive a response
    const responsePromise = new Promise<AgentMessage>((resolve, reject) => {
      // Set a timeout to reject the promise if no response is received
      const timer = setTimeout(() => {
        if (this.pendingResponses.has(message.id)) {
          this.pendingResponses.delete(message.id);
          reject(new Error(`Timeout waiting for response to message ${message.id}`));
        }
      }, timeout);
      
      // Store the promise resolvers and timeout
      this.pendingResponses.set(message.id, {
        resolve,
        reject,
        timer
      });
    });
    
    // Send the message
    await this.sendMessage(message, options);
    
    // Wait for the response
    return responsePromise;
  }

  /**
   * Register a message handler for a specific event type
   */
  public registerHandler(
    eventType: MessageEventType | string,
    handler: (message: AgentMessage) => Promise<void> | void
  ): void {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    
    this.messageHandlers.get(eventType)!.push(handler);
    console.log(`Registered handler for event type: ${eventType}`);
  }

  /**
   * Broadcast a message to all agents or a specific group
   */
  public async broadcast(
    message: AgentMessage,
    filter?: (agentId: string) => boolean
  ): Promise<DeliveryResult[]> {
    // Implementation would depend on how the base bus handles broadcasts
    // This is a simplified version
    return this.baseBus.broadcast(message);
  }

  /**
   * Get the health status of all connected agents
   */
  public async getAgentsHealth(): Promise<Record<string, any>> {
    // Implementation would depend on how agent health is tracked
    return {}; // Placeholder
  }

  /**
   * Get the circuit breaker status for all agents
   */
  public async getCircuitBreakersStatus(): Promise<Record<string, any>> {
    return this.circuitBreakerRegistry.getAllStats();
  }

  /**
   * Reset a circuit breaker for a specific agent
   */
  public async resetCircuitBreaker(agentId: string): Promise<boolean> {
    return this.circuitBreakerRegistry.resetBreaker(agentId);
  }

  /**
   * Disconnect from the communication bus
   */
  public async disconnect(): Promise<void> {
    // Clean up pending responses
    for (const [id, { timer, reject }] of this.pendingResponses.entries()) {
      clearTimeout(timer);
      reject(new Error('Communication bus disconnected'));
      this.pendingResponses.delete(id);
    }
    
    // Disconnect from base bus
    await this.baseBus.disconnect();
    
    console.log('Enhanced communication bus disconnected');
  }

  /**
   * Handle an incoming message
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    // Check if this is a response to a pending request
    if (message.correlationId && this.pendingResponses.has(message.correlationId)) {
      const { resolve, timer } = this.pendingResponses.get(message.correlationId)!;
      clearTimeout(timer);
      resolve(message);
      this.pendingResponses.delete(message.correlationId);
      return;
    }
    
    // Otherwise, pass to registered handlers
    if (this.messageHandlers.has(message.eventType)) {
      const handlers = this.messageHandlers.get(message.eventType)!;
      
      // Execute all handlers for this event type
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.eventType}:`, error);
        }
      }
    }
  }

  /**
   * Send a message with a timeout
   */
  private async sendWithTimeout(message: AgentMessage, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout sending message to ${message.destination}`));
      }, timeoutMs);
      
      this.baseBus.sendMessage(message)
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}