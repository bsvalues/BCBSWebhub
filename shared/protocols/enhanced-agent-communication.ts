/**
 * Enhanced Agent Communication
 * 
 * Provides enhanced communication capabilities with circuit-breaker
 * pattern integration and resilience features.
 */

import { 
  AgentCommunicationBus,
  AgentMessage,
  MessageEventType
} from './agent-communication';

import {
  EnhancedMessageEventType,
  createHealthCheckMessage,
  createHealthResponseMessage,
  createCircuitBreakerStatusMessage
} from './enhanced-message-protocol';

import { CircuitBreakerRegistry } from '../../server/utils/circuit-breaker-registry';
import { log } from '../../server/vite';

/**
 * Result of sending a message through the enhanced bus
 */
export interface MessageSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  circuitOpen?: boolean;
}

/**
 * Enhanced communication bus that integrates circuit breaker pattern
 */
export class EnhancedCommunicationBus {
  private baseBus: AgentCommunicationBus;
  private circuitBreakerRegistry: CircuitBreakerRegistry;
  private messageHandlers: Map<string, Function[]> = new Map();
  private metrics: {
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    startTime: Date;
  } = {
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    startTime: new Date()
  };

  constructor(
    baseBus: AgentCommunicationBus,
    circuitBreakerRegistry: CircuitBreakerRegistry
  ) {
    this.baseBus = baseBus;
    this.circuitBreakerRegistry = circuitBreakerRegistry;

    // Set up listener for all messages on the base bus
    this.baseBus.on('message', (message: AgentMessage) => {
      this.handleIncomingMessage(message);
    });

    log('Enhanced communication bus initialized', 'enhanced-bus');
  }

  /**
   * Send a message with circuit breaker protection
   */
  public async sendMessage(message: AgentMessage): Promise<MessageSendResult> {
    // Get destination agent ID or service
    const destination = message.destination;

    // Check if circuit breaker exists and is open for this destination
    const breaker = this.circuitBreakerRegistry.getBreaker(destination);
    if (breaker.isOpen()) {
      log(`Circuit open for ${destination}, message rejected`, 'enhanced-bus');
      return {
        success: false,
        messageId: message.messageId,
        error: `Circuit breaker for ${destination} is open`,
        circuitOpen: true
      };
    }

    try {
      // Execute sendMessage through the circuit breaker
      await breaker.execute(async () => {
        await this.baseBus.sendMessage(message);
      });

      // Update metrics
      this.metrics.messagesSent++;

      return {
        success: true,
        messageId: message.messageId
      };
    } catch (error) {
      // Update metrics
      this.metrics.errors++;

      // Log the error
      log(`Error sending message to ${destination}: ${error}`, 'enhanced-bus');

      // If the circuit is now open due to this error, broadcast a notification
      if (breaker.isOpen()) {
        log(`Circuit opened for ${destination} due to failures`, 'enhanced-bus');
        
        // Get stats for this breaker
        const stats = this.circuitBreakerRegistry.getStats(destination);
        
        // Broadcast circuit breaker status message
        this.broadcastCircuitBreakerStatus(
          destination,
          'OPEN',
          stats.failures,
          `Circuit opened after ${stats.failures} consecutive failures`
        );
      }

      return {
        success: false,
        messageId: message.messageId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Broadcast a message to all agents
   */
  public async broadcast(message: AgentMessage): Promise<MessageSendResult[]> {
    try {
      await this.baseBus.broadcast(message);
      this.metrics.messagesSent++;
      
      return [{ success: true, messageId: message.messageId }];
    } catch (error) {
      this.metrics.errors++;
      
      log(`Error broadcasting message: ${error}`, 'enhanced-bus');
      
      return [{
        success: false,
        messageId: message.messageId,
        error: error instanceof Error ? error.message : String(error)
      }];
    }
  }

  /**
   * Register a message handler with the bus
   */
  public on(event: string, handler: Function): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }

    this.messageHandlers.get(event)!.push(handler);
  }

  /**
   * Remove a message handler
   */
  public off(event: string, handler: Function): void {
    if (this.messageHandlers.has(event)) {
      const handlers = this.messageHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Send a health check to a specific agent
   */
  public async sendHealthCheck(
    sourceAgentId: string,
    targetAgentId: string,
    requestMetrics: boolean = false
  ): Promise<MessageSendResult> {
    const message = createHealthCheckMessage(
      sourceAgentId,
      targetAgentId,
      'basic',
      requestMetrics
    );

    return this.sendMessage(message);
  }

  /**
   * Get bus metrics
   */
  public getMetrics(): any {
    return {
      ...this.metrics,
      uptime: Math.round((new Date().getTime() - this.metrics.startTime.getTime()) / 1000)
    };
  }

  /**
   * Reset circuit breaker for a specific destination
   */
  public resetCircuitBreaker(destination: string): boolean {
    return this.circuitBreakerRegistry.resetBreaker(destination);
  }

  /**
   * Disconnect and clean up
   */
  public async disconnect(): Promise<void> {
    // Remove our listener from the base bus
    // (if the base bus supports removing listeners)
    
    // Disconnect the base bus
    await this.baseBus.disconnect();
    
    // Clear all local handlers
    this.messageHandlers.clear();
    
    log('Enhanced communication bus disconnected', 'enhanced-bus');
  }

  /**
   * Handle incoming messages from the base bus
   */
  private handleIncomingMessage(message: AgentMessage): void {
    // Update metrics
    this.metrics.messagesReceived++;

    // Handle enhanced message types
    if (message.eventType === EnhancedMessageEventType.CIRCUIT_BREAKER_OPEN ||
        message.eventType === EnhancedMessageEventType.CIRCUIT_BREAKER_HALF_OPEN ||
        message.eventType === EnhancedMessageEventType.CIRCUIT_BREAKER_CLOSED) {
      this.handleCircuitBreakerStatusMessage(message);
    }

    // Emit event to all registered handlers
    this.emit('message', message);

    // Also emit specific event for the message type
    this.emit(message.eventType, message);
  }

  /**
   * Handle a circuit breaker status change message
   */
  private handleCircuitBreakerStatusMessage(message: AgentMessage): void {
    const { state, target } = message.payload;
    
    log(`Received circuit breaker status message: ${state} for ${target}`, 'enhanced-bus');
    
    // No action needed here, just logging for now
    // In a more sophisticated implementation, we might update our local view of circuit states
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(event: string, ...args: any[]): void {
    if (this.messageHandlers.has(event)) {
      for (const handler of this.messageHandlers.get(event)!) {
        try {
          handler(...args);
        } catch (error) {
          log(`Error in handler for event ${event}: ${error}`, 'enhanced-bus');
          this.metrics.errors++;
        }
      }
    }
  }

  /**
   * Broadcast a circuit breaker status change
   */
  private async broadcastCircuitBreakerStatus(
    target: string,
    state: 'OPEN' | 'HALF_OPEN' | 'CLOSED',
    failures: number,
    details?: string
  ): Promise<void> {
    const message = createCircuitBreakerStatusMessage(
      'system:enhanced-bus',
      state,
      target,
      failures,
      details
    );

    try {
      await this.baseBus.broadcast(message);
    } catch (error) {
      log(`Error broadcasting circuit breaker status: ${error}`, 'enhanced-bus');
    }
  }
}