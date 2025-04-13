/**
 * Enhanced Agent Communication Protocol
 * 
 * Extends the base communication protocol with resilience features:
 * - Circuit breaker protection
 * - Health check messaging
 * - Status monitoring
 */

import { AgentCommunicationBus, AgentMessage, MessageEventType } from './agent-communication';
import { CircuitBreakerRegistry } from '../../server/utils/circuit-breaker-registry';
import { CircuitState } from '../../server/utils/circuit-breaker';

/**
 * Enhanced message event types
 */
export enum EnhancedMessageEventType {
  // Health monitoring
  HEALTH_CHECK = 'HEALTH_CHECK',
  HEALTH_RESPONSE = 'HEALTH_RESPONSE',
  
  // Circuit breaker events
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  CIRCUIT_BREAKER_HALF_OPEN = 'CIRCUIT_BREAKER_HALF_OPEN',
  CIRCUIT_BREAKER_CLOSED = 'CIRCUIT_BREAKER_CLOSED',
  
  // Enhanced agent lifecycle
  AGENT_STARTING = 'AGENT_STARTING',
  AGENT_READY = 'AGENT_READY',
  AGENT_BUSY = 'AGENT_BUSY',
  AGENT_ERROR = 'AGENT_ERROR',
  AGENT_DEGRADED = 'AGENT_DEGRADED',
  AGENT_SHUTTING_DOWN = 'AGENT_SHUTTING_DOWN',
  AGENT_RESTARTING = 'AGENT_RESTARTING',
  AGENT_OFFLINE = 'AGENT_OFFLINE',
  
  // Enhanced validation
  VALIDATION_REQUEST = 'VALIDATION_REQUEST',
  VALIDATION_RESPONSE = 'VALIDATION_RESPONSE'
}

/**
 * Health check message payload
 */
export interface HealthCheckPayload {
  timestamp: number;
  requestId: string;
}

/**
 * Health response message payload
 */
export interface HealthResponsePayload {
  timestamp: number;
  requestId: string;
  status: string;
  metrics?: Record<string, any>;
}

/**
 * Circuit breaker status payload
 */
export interface CircuitBreakerStatusPayload {
  agentId: string;
  state: CircuitState;
  failures: number;
  timestamp: number;
}

/**
 * Enhanced Agent Communication Bus
 * 
 * Extends the base communication bus with circuit breaker protection
 */
export class EnhancedCommunicationBus {
  private bus: AgentCommunicationBus;
  private circuitBreakerRegistry: CircuitBreakerRegistry;
  
  constructor(bus: AgentCommunicationBus, circuitBreakerRegistry: CircuitBreakerRegistry) {
    this.bus = bus;
    this.circuitBreakerRegistry = circuitBreakerRegistry;
    
    // Set up circuit breaker event listeners
    this.setupCircuitBreakerListeners();
  }
  
  /**
   * Initialize the enhanced communication bus
   */
  public async initialize(): Promise<void> {
    // Nothing to initialize in this implementation
    // In a real implementation, you might want to set up additional listeners
    // or initialize the underlying bus
  }
  
  /**
   * Send a message with circuit breaker protection
   */
  public async sendMessage(message: AgentMessage): Promise<void> {
    const destination = message.destination;
    
    // Get circuit breaker for the destination
    const breaker = this.circuitBreakerRegistry.getBreaker(destination);
    
    // Send the message through the circuit breaker
    try {
      await breaker.execute(() => this.bus.sendMessage(message));
    } catch (error) {
      // Transform the error to include circuit breaker info
      const circuitState = breaker.getStats().state;
      const enhancedError: any = new Error(`Failed to send message to ${destination} (Circuit: ${circuitState})`);
      enhancedError.originalError = error;
      enhancedError.circuitBreakerState = circuitState;
      enhancedError.destination = destination;
      
      throw enhancedError;
    }
  }
  
  /**
   * Send a health check message to an agent
   */
  public async sendHealthCheck(agentId: string): Promise<void> {
    const requestId = `health-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    const healthCheckMessage: AgentMessage = {
      messageId: requestId,
      correlationId: undefined,
      timestamp: new Date(),
      source: 'system:health-monitor',
      destination: agentId,
      eventType: EnhancedMessageEventType.HEALTH_CHECK as any,
      payload: {
        timestamp: Date.now(),
        requestId
      },
      metadata: {
        priority: 'HIGH' as any
      }
    };
    
    await this.sendMessage(healthCheckMessage);
  }
  
  /**
   * Broadcast a message to all agents
   */
  public async broadcastMessage(message: Omit<AgentMessage, 'destination'>): Promise<void> {
    try {
      await this.bus.broadcast(message as any);
    } catch (error) {
      const enhancedError: any = new Error('Failed to broadcast message');
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }
  
  /**
   * Broadcast a circuit breaker state change
   */
  private async broadcastCircuitBreakerState(agentId: string, state: CircuitState): Promise<void> {
    let eventType: EnhancedMessageEventType;
    
    switch (state) {
      case CircuitState.OPEN:
        eventType = EnhancedMessageEventType.CIRCUIT_BREAKER_OPEN;
        break;
      case CircuitState.HALF_OPEN:
        eventType = EnhancedMessageEventType.CIRCUIT_BREAKER_HALF_OPEN;
        break;
      case CircuitState.CLOSED:
        eventType = EnhancedMessageEventType.CIRCUIT_BREAKER_CLOSED;
        break;
      default:
        return; // Unknown state, don't broadcast
    }
    
    const stats = this.circuitBreakerRegistry.getStats(agentId);
    
    const message: Omit<AgentMessage, 'destination'> = {
      messageId: `circuit-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      correlationId: undefined,
      timestamp: new Date(),
      source: 'system:circuit-breaker',
      eventType: (MessageEventType.STATUS_UPDATE || eventType) as any,
      payload: {
        agentId,
        state,
        failures: stats.failures,
        timestamp: Date.now()
      },
      metadata: {
        priority: 'HIGH' as any
      }
    };
    
    try {
      await this.broadcastMessage(message);
    } catch (error) {
      console.error('Failed to broadcast circuit breaker state change:', error);
    }
  }
  
  /**
   * Set up circuit breaker event listeners
   */
  private setupCircuitBreakerListeners(): void {
    // Subscribe to circuit breaker state change events
    // This would be implemented in a real system
  }
  
  /**
   * Disconnect the bus
   */
  public async disconnect(): Promise<void> {
    try {
      await this.bus.disconnect();
    } catch (error) {
      console.error('Error disconnecting enhanced communication bus:', error);
    }
  }
  
  /**
   * Send an agent status update
   */
  public async sendAgentStatusUpdate(agentId: string, status: string, details?: Record<string, any>): Promise<void> {
    let eventType: EnhancedMessageEventType;
    
    switch (status) {
      case 'STARTING':
        eventType = EnhancedMessageEventType.AGENT_STARTING;
        break;
      case 'READY':
        eventType = EnhancedMessageEventType.AGENT_READY;
        break;
      case 'BUSY':
        eventType = EnhancedMessageEventType.AGENT_BUSY;
        break;
      case 'ERROR':
        eventType = EnhancedMessageEventType.AGENT_ERROR;
        break;
      case 'DEGRADED':
        eventType = EnhancedMessageEventType.AGENT_DEGRADED;
        break;
      case 'SHUTTING_DOWN':
        eventType = EnhancedMessageEventType.AGENT_SHUTTING_DOWN;
        break;
      case 'RESTARTING':
        eventType = EnhancedMessageEventType.AGENT_RESTARTING;
        break;
      case 'OFFLINE':
        eventType = EnhancedMessageEventType.AGENT_OFFLINE;
        break;
      default:
        eventType = EnhancedMessageEventType.AGENT_READY; // Default to READY
    }
    
    const message: Omit<AgentMessage, 'destination'> = {
      messageId: `status-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      correlationId: undefined,
      timestamp: new Date(),
      source: agentId,
      eventType: (MessageEventType.STATUS_UPDATE || eventType) as any,
      payload: {
        agentId,
        status,
        details,
        timestamp: Date.now()
      },
      metadata: {
        priority: 'MEDIUM' as any
      }
    };
    
    try {
      await this.broadcastMessage(message);
    } catch (error) {
      console.error(`Failed to broadcast status update for ${agentId}:`, error);
    }
  }
  
  /**
   * Send a validation request with circuit breaker protection
   */
  public async sendValidationRequest(
    source: string, 
    destination: string, 
    data: any, 
    validationType: string
  ): Promise<void> {
    const message: AgentMessage = {
      messageId: `validation-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      correlationId: undefined,
      timestamp: new Date(),
      source,
      destination,
      eventType: EnhancedMessageEventType.VALIDATION_REQUEST as any,
      payload: {
        data,
        validationType,
        timestamp: Date.now()
      },
      metadata: {
        priority: 'HIGH' as any
      }
    };
    
    await this.sendMessage(message);
  }
}