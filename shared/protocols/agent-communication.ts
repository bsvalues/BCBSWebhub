/**
 * Agent Communication Protocol
 * 
 * This module defines the message formats and communication patterns
 * for the multi-agent AI architecture. It enables standardized communication
 * between the Master Control Program (MCP) and specialized agents.
 */

// Agent types in the system
export enum AgentType {
  MCP = 'master_control_program',
  DATA_VALIDATION = 'data_validation_agent',
  VALUATION = 'valuation_agent',
  USER_INTERACTION = 'user_interaction_agent',
  TAX_INFORMATION = 'tax_information_agent',
  WORKFLOW = 'workflow_agent',
  LEGAL_COMPLIANCE = 'legal_compliance_agent'
}

// Message types for inter-agent communication
export enum MessageType {
  // Control messages
  TASK_REQUEST = 'task_request',
  TASK_RESPONSE = 'task_response',
  TASK_UPDATE = 'task_update',
  TASK_CANCEL = 'task_cancel',
  
  // Data messages
  DATA_REQUEST = 'data_request',
  DATA_RESPONSE = 'data_response',
  DATA_UPDATE = 'data_update',
  DATA_VALIDATION_REQUEST = 'data_validation_request',
  DATA_VALIDATION_RESPONSE = 'data_validation_response',
  
  // Valuation messages
  VALUATION_REQUEST = 'valuation_request',
  VALUATION_RESPONSE = 'valuation_response',
  COMPARABLE_REQUEST = 'comparable_request',
  COMPARABLE_RESPONSE = 'comparable_response',
  ANOMALY_DETECTION_REQUEST = 'anomaly_detection_request',
  ANOMALY_DETECTION_RESPONSE = 'anomaly_detection_response',
  
  // Coordination messages
  COORDINATION_REQUEST = 'coordination_request',
  COORDINATION_RESPONSE = 'coordination_response',
  
  // System messages
  HEARTBEAT = 'heartbeat',
  STATUS_UPDATE = 'status_update',
  ERROR = 'error',
  LOG = 'log'
}

// Priority levels for message processing
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Status codes for task responses
export enum StatusCode {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILURE = 'failure',
  VALIDATION_ERROR = 'validation_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  RESOURCE_ERROR = 'resource_error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  SYSTEM_ERROR = 'system_error'
}

// Standard message format for inter-agent communication
export interface AgentMessage {
  messageId: string;
  timestamp: Date;
  source: AgentType | string;
  destination: AgentType | string;
  messageType: MessageType;
  priority: Priority;
  payload: any;
  requiresResponse: boolean;
  correlationId?: string; // For tracking related messages
  expiresAt?: Date; // Optional timeout for message processing
  routingInfo?: {
    path?: AgentType[]; // Ordered list of agents that should process this message
    visited?: AgentType[]; // Agents that have already processed the message
    nextAgent?: AgentType; // Next agent to process the message
  };
}

// Task message format
export interface TaskMessage extends AgentMessage {
  payload: {
    taskId: string;
    taskType: string;
    parameters: any;
    context?: any;
    requiredCapabilities?: string[];
    timeoutSeconds?: number;
  };
}

// Task response message format
export interface TaskResponseMessage extends AgentMessage {
  payload: {
    taskId: string;
    status: StatusCode;
    result?: any;
    errorDetails?: any;
    metrics?: {
      processingTimeMs: number;
      resourceUsage?: any;
    };
    warnings?: string[];
  };
}

// Data validation message format
export interface DataValidationMessage extends AgentMessage {
  payload: {
    dataId: string;
    dataType: string;
    data: any;
    validationRules?: string[];
    strictMode?: boolean;
  };
}

// Valuation request message format
export interface ValuationRequestMessage extends AgentMessage {
  payload: {
    propertyId: number;
    parcelNumber?: string;
    valuationDate: Date;
    valuationContext?: {
      purpose: 'assessment' | 'market' | 'insurance' | 'refinance';
      assessmentYear?: number;
      useComparables?: boolean;
      useHistoricalTrends?: boolean;
      detectAnomalies?: boolean;
    };
  };
}

// Message handler type
export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

// Subscription object returned when subscribing to messages
export interface Subscription {
  unsubscribe: () => void;
}

// Communication bus for agents to exchange messages
export class AgentCommunicationBus {
  private messageHandlers: Map<string, MessageHandler[]>;
  private logger: (message: string, data?: any) => void;
  
  constructor(logger?: (message: string, data?: any) => void) {
    this.messageHandlers = new Map();
    this.logger = logger || console.log;
  }
  
  /**
   * Publish a message to the communication bus
   */
  public publish(message: AgentMessage): void {
    // Log message for audit trail
    this.logMessage(message);
    
    // Deliver to handlers for the specific destination
    const specificHandlers = this.messageHandlers.get(message.destination) || [];
    specificHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.logger(`Error in message handler for ${message.destination}:`, error);
      }
    });
    
    // Deliver to wildcard handlers (subscribers to all messages)
    const wildcardHandlers = this.messageHandlers.get('*') || [];
    wildcardHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.logger(`Error in wildcard message handler:`, error);
      }
    });
  }
  
  /**
   * Subscribe to messages for a specific destination or all messages using '*'
   */
  public subscribe(destination: string, handler: MessageHandler): Subscription {
    const handlers = this.messageHandlers.get(destination) || [];
    handlers.push(handler);
    this.messageHandlers.set(destination, handlers);
    
    // Return subscription object for unsubscribing
    return {
      unsubscribe: () => this.unsubscribe(destination, handler)
    };
  }
  
  /**
   * Unsubscribe from messages
   */
  private unsubscribe(destination: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(destination) || [];
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      this.messageHandlers.set(destination, handlers);
    }
  }
  
  /**
   * Log message for audit and debugging purposes
   */
  private logMessage(message: AgentMessage): void {
    // Don't log full payload of large messages or heartbeats
    const logLevel = message.messageType === MessageType.HEARTBEAT ? 'debug' : 'info';
    
    const logMessage = {
      ...message,
      payload: message.messageType === MessageType.HEARTBEAT ? '(heartbeat data)' : 
               (typeof message.payload === 'object' && Object.keys(message.payload).length > 10) ? 
               '(large payload)' : message.payload
    };
    
    this.logger(`[${logLevel}] Agent message ${message.messageId}: ${message.source} -> ${message.destination} (${message.messageType})`, logMessage);
  }
  
  /**
   * Helper to create a message ID
   */
  public static createMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Helper to generate an error response for a message
   */
  public static createErrorResponse(originalMessage: AgentMessage, error: any): AgentMessage {
    return {
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: originalMessage.destination,
      destination: originalMessage.source,
      messageType: MessageType.ERROR,
      priority: Priority.HIGH,
      requiresResponse: false,
      correlationId: originalMessage.messageId,
      payload: {
        error: error.message || String(error),
        errorCode: error.code || 'UNKNOWN_ERROR',
        originalMessageId: originalMessage.messageId,
        originalMessageType: originalMessage.messageType
      }
    };
  }
}