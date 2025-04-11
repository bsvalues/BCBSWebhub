import { randomUUID } from "crypto";

/**
 * Agent Type Enumeration
 * 
 * Defines the types of agents in the AI Army architecture.
 */
export enum AgentType {
  MCP = "master_control_program",
  DATA_VALIDATION = "data_validation_agent",
  COMPLIANCE = "compliance_agent",
  VALUATION = "valuation_agent",
  USER_INTERACTION = "user_interaction_agent"
}

/**
 * Message Type Enumeration
 * 
 * Defines the types of messages that can be exchanged between agents.
 */
export enum MessageType {
  // System messages
  STATUS_UPDATE = "status_update",
  STATUS_UPDATE_RESPONSE = "status_update_response",
  ERROR_REPORT = "error_report",
  AGENT_REGISTRATION = "agent_registration",
  AGENT_REGISTRATION_RESPONSE = "agent_registration_response",
  HEARTBEAT = "heartbeat",
  SHUTDOWN = "shutdown",
  
  // Task management messages
  TASK_REQUEST = "task_request",
  TASK_RESPONSE = "task_response",
  TASK_CANCEL = "task_cancel",
  TASK_PROGRESS = "task_progress",
  
  // Validation messages
  VALIDATION_REQUEST = "validation_request",
  VALIDATION_RESPONSE = "validation_response",
  
  // Valuation messages
  VALUATION_REQUEST = "valuation_request",
  VALUATION_RESPONSE = "valuation_response",
  
  // Compliance messages
  COMPLIANCE_CHECK_REQUEST = "compliance_check_request",
  COMPLIANCE_CHECK_RESPONSE = "compliance_check_response",
  
  // User interaction messages
  USER_QUERY_REQUEST = "user_query_request",
  USER_QUERY_RESPONSE = "user_query_response",
  
  // Data exchange messages
  DATA_REQUEST = "data_request",
  DATA_RESPONSE = "data_response",
  
  // Custom message type
  CUSTOM = "custom"
}

/**
 * Priority Enumeration
 * 
 * Defines the priority levels for agent tasks and messages.
 */
export enum Priority {
  HIGH = 3,
  MEDIUM = 2,
  LOW = 1
}

/**
 * Agent Message Interface
 * 
 * Defines the structure of messages exchanged between agents.
 */
export interface AgentMessage {
  messageId: string;
  timestamp: Date;
  source: string;
  destination: string | 'broadcast';
  messageType: MessageType;
  priority: Priority;
  requiresResponse: boolean;
  correlationId?: string;
  expiresAt?: Date;
  payload: any;
}

/**
 * Task Interface
 * 
 * Defines the structure of tasks that agents can execute.
 */
export interface Task {
  id: string;
  type: string;
  priority: Priority;
  parameters: any;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: any;
}

/**
 * Agent Status
 * 
 * Defines the status information that agents provide about themselves.
 */
export interface AgentStatus {
  status: 'initializing' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';
  uptime: number;
  taskCount: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  lastActiveTime: Date;
  metrics: {
    [key: string]: any;
  };
  error?: any;
}

/**
 * Agent Interface
 * 
 * Defines the common interface that all agents must implement.
 */
export interface Agent {
  type: string;
  capabilities: string[];
  running: boolean;
  
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): AgentStatus;
  sendMessage(message: AgentMessage): void;
}

/**
 * Validation Request Message
 * 
 * Defines the structure of a validation request message.
 */
export interface ValidationRequestMessage {
  propertyId?: number;
  property?: any;
  validateFields?: string[];
  validationRules?: string[];
}

/**
 * Valuation Request Message
 * 
 * Defines the structure of a valuation request message.
 */
export interface ValuationRequestMessage {
  propertyId?: number;
  property?: any;
  assessmentYear: number;
  options?: {
    useComparables?: boolean;
    method?: 'cost' | 'income' | 'market' | 'hybrid';
    includeTrends?: boolean;
  };
}

/**
 * Compliance Check Request Message
 * 
 * Defines the structure of a compliance check request message.
 */
export interface ComplianceCheckRequestMessage {
  propertyId?: number;
  property?: any;
  assessmentYear?: number;
  categories?: string[];
  regulationIds?: string[];
}

/**
 * User Query Request Message
 * 
 * Defines the structure of a user query request message.
 */
export interface UserQueryRequestMessage {
  userId: number;
  query: string;
  context?: any;
}

/**
 * Agent Communication Bus
 * 
 * Provides a publish-subscribe mechanism for inter-agent communication.
 */
export class AgentCommunicationBus {
  private subscribers: Map<string, ((message: AgentMessage) => void)[]> = new Map();
  private messageLog: AgentMessage[] = [];
  private readonly MAX_LOG_SIZE = 1000;
  
  /**
   * Generate a unique message ID
   */
  public static createMessageId(): string {
    return randomUUID();
  }
  
  /**
   * Publish a message to the communication bus
   */
  public publish(message: AgentMessage): void {
    // Log the message
    this.logMessage(message);
    
    // If it's a broadcast message, send to all subscribers
    if (message.destination === 'broadcast') {
      for (const [agentType, handlers] of this.subscribers.entries()) {
        if (agentType !== message.source) {
          for (const handler of handlers) {
            try {
              handler(message);
            } catch (error) {
              console.error(`Error in message handler for ${agentType}:`, error);
            }
          }
        }
      }
      return;
    }
    
    // Otherwise, send to the specific destination
    const handlers = this.subscribers.get(message.destination);
    if (handlers && handlers.length > 0) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.destination}:`, error);
        }
      }
    }
  }
  
  /**
   * Subscribe to messages for a specific agent type
   */
  public subscribe(agentType: string, handler: (message: AgentMessage) => void): (() => void) {
    if (!this.subscribers.has(agentType)) {
      this.subscribers.set(agentType, []);
    }
    
    const handlers = this.subscribers.get(agentType)!;
    handlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(agentType, handler);
    };
  }
  
  /**
   * Unsubscribe from messages
   */
  private unsubscribe(agentType: string, handler: (message: AgentMessage) => void): void {
    if (!this.subscribers.has(agentType)) {
      return;
    }
    
    const handlers = this.subscribers.get(agentType)!;
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
    
    // Clean up empty subscribers
    if (handlers.length === 0) {
      this.subscribers.delete(agentType);
    }
  }
  
  /**
   * Log a message
   */
  private logMessage(message: AgentMessage): void {
    this.messageLog.push(message);
    
    // Trim log if it gets too large
    if (this.messageLog.length > this.MAX_LOG_SIZE) {
      this.messageLog = this.messageLog.slice(-this.MAX_LOG_SIZE);
    }
  }
  
  /**
   * Get recent messages (mainly for debugging)
   */
  public getRecentMessages(count: number = 100): AgentMessage[] {
    return this.messageLog.slice(-count);
  }
  
  /**
   * Filter message log to find related messages
   */
  public getRelatedMessages(messageId: string): AgentMessage[] {
    return this.messageLog.filter(
      m => m.messageId === messageId || m.correlationId === messageId
    );
  }
  
  /**
   * Clear all subscriptions
   */
  public clearSubscriptions(): void {
    this.subscribers.clear();
  }
}