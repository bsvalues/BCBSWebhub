/**
 * Enhanced Message Protocol
 * 
 * Extends the base message protocol with additional message types and
 * features for circuit breaker integration and resilient communication.
 */

import { AgentMessage, MessageEventType, createMessage, createSuccessResponse, createErrorResponse } from './message-protocol';

// Re-export base types and functions
export { 
  AgentMessage, 
  MessageEventType,
  createMessage,
  createSuccessResponse,
  createErrorResponse
};

// Extended message event types for resilience features
export enum EnhancedMessageEventType {
  // System health and monitoring
  HEALTH_CHECK = 'HEALTH_CHECK',
  HEALTH_RESPONSE = 'HEALTH_RESPONSE',
  METRICS_REQUEST = 'METRICS_REQUEST',
  METRICS_RESPONSE = 'METRICS_RESPONSE',
  
  // Circuit breaker status changes
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  CIRCUIT_BREAKER_HALF_OPEN = 'CIRCUIT_BREAKER_HALF_OPEN',
  CIRCUIT_BREAKER_CLOSED = 'CIRCUIT_BREAKER_CLOSED',
  
  // Agent lifecycle events
  AGENT_STARTING = 'AGENT_STARTING',
  AGENT_READY = 'AGENT_READY',
  AGENT_BUSY = 'AGENT_BUSY',
  AGENT_ERROR = 'AGENT_ERROR',
  AGENT_DEGRADED = 'AGENT_DEGRADED',
  AGENT_SHUTTING_DOWN = 'AGENT_SHUTTING_DOWN',
  AGENT_RESTARTING = 'AGENT_RESTARTING',
  
  // Validation message types
  VALIDATION_REQUEST = 'VALIDATION_REQUEST',
  VALIDATION_RESPONSE = 'VALIDATION_RESPONSE',
  
  // Testing message types
  TEST_MESSAGE = 'TEST_MESSAGE',
  TEST_TIMEOUT = 'TEST_TIMEOUT',
  TEST_ERROR = 'TEST_ERROR'
}

// Message priority levels
export enum MessagePriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

// Health check request message
export interface HealthCheckMessage extends AgentMessage {
  payload: {
    checkType: 'basic' | 'full';
    requestMetrics?: boolean;
  };
}

// Health check response message
export interface HealthResponseMessage extends AgentMessage {
  payload: {
    status: string;
    uptime: number;
    metrics?: {
      messagesSent: number;
      messagesReceived: number;
      errorCount: number;
      cpuUsage?: number;
      memoryUsage?: number;
    };
    circuitBreakerStatus?: {
      state: string;
      failures: number;
      lastFailureTime?: number;
    };
  };
}

// Circuit breaker status change message
export interface CircuitBreakerStatusMessage extends AgentMessage {
  payload: {
    state: 'OPEN' | 'HALF_OPEN' | 'CLOSED';
    target: string;
    failures: number;
    timestamp: Date;
    details?: string;
  };
}

// Agent status change message
export interface AgentStatusMessage extends AgentMessage {
  payload: {
    status: string;
    prevStatus?: string;
    reason?: string;
    metrics?: Record<string, any>;
  };
}

// Validation request message
export interface ValidationRequestMessage extends AgentMessage {
  payload: {
    propertyId?: number;
    property?: any;
    validateFields?: string[];
  };
}

/**
 * Create a health check message
 */
export function createHealthCheckMessage(
  source: string,
  destination: string,
  checkType: 'basic' | 'full' = 'basic',
  requestMetrics: boolean = false
): HealthCheckMessage {
  return {
    ...createMessage(
      source,
      destination,
      EnhancedMessageEventType.HEALTH_CHECK,
      {
        checkType,
        requestMetrics
      }
    )
  } as HealthCheckMessage;
}

/**
 * Create a health response message
 */
export function createHealthResponseMessage(
  source: string,
  destination: string,
  correlationId: string | null,
  status: string,
  uptime: number,
  metrics?: Record<string, any>,
  circuitBreakerStatus?: Record<string, any>
): HealthResponseMessage {
  return {
    ...createMessage(
      source,
      destination,
      EnhancedMessageEventType.HEALTH_RESPONSE,
      {
        status,
        uptime,
        metrics,
        circuitBreakerStatus
      },
      correlationId
    )
  } as HealthResponseMessage;
}

/**
 * Create a circuit breaker status change message
 */
export function createCircuitBreakerStatusMessage(
  source: string,
  state: 'OPEN' | 'HALF_OPEN' | 'CLOSED',
  target: string,
  failures: number,
  details?: string
): CircuitBreakerStatusMessage {
  let eventType: MessageEventType | EnhancedMessageEventType;
  
  switch (state) {
    case 'OPEN':
      eventType = EnhancedMessageEventType.CIRCUIT_BREAKER_OPEN;
      break;
    case 'HALF_OPEN':
      eventType = EnhancedMessageEventType.CIRCUIT_BREAKER_HALF_OPEN;
      break;
    case 'CLOSED':
      eventType = EnhancedMessageEventType.CIRCUIT_BREAKER_CLOSED;
      break;
    default:
      eventType = MessageEventType.STATUS_UPDATE;
  }
  
  return {
    ...createMessage(
      source,
      'broadcast',
      eventType,
      {
        state,
        target,
        failures,
        timestamp: new Date(),
        details
      }
    )
  } as CircuitBreakerStatusMessage;
}

/**
 * Create an agent status change message
 */
export function createAgentStatusMessage(
  source: string,
  status: string,
  prevStatus?: string,
  reason?: string,
  metrics?: Record<string, any>
): AgentStatusMessage {
  let eventType: MessageEventType | EnhancedMessageEventType;
  
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
    default:
      eventType = MessageEventType.STATUS_UPDATE;
  }
  
  return {
    ...createMessage(
      source,
      'broadcast',
      eventType,
      {
        status,
        prevStatus,
        reason,
        metrics
      }
    )
  } as AgentStatusMessage;
}

/**
 * Create a validation request message
 */
export function createValidationRequestMessage(
  source: string,
  destination: string,
  propertyId?: number,
  property?: any,
  validateFields?: string[]
): ValidationRequestMessage {
  return {
    ...createMessage(
      source,
      destination,
      EnhancedMessageEventType.VALIDATION_REQUEST,
      {
        propertyId,
        property,
        validateFields
      }
    )
  } as ValidationRequestMessage;
}