/**
 * Message Protocol
 * 
 * Defines the standardized message format and types for communication
 * between agents in the system.
 */

import { v4 as uuidv4 } from 'uuid';

// Message event types
export enum MessageEventType {
  COMMAND = 'COMMAND',
  QUERY = 'QUERY',
  EVENT = 'EVENT',
  RESPONSE = 'RESPONSE',
  STATUS_UPDATE = 'STATUS_UPDATE',
  ASSISTANCE_REQUESTED = 'ASSISTANCE_REQUESTED',
  
  // Specialized valuation message types
  VALUATION_REQUEST = 'VALUATION_REQUEST',
  VALUATION_RESPONSE = 'VALUATION_RESPONSE',
  COMPARABLE_REQUEST = 'COMPARABLE_REQUEST',
  COMPARABLE_RESPONSE = 'COMPARABLE_RESPONSE',
  ANOMALY_DETECTION_REQUEST = 'ANOMALY_DETECTION_REQUEST',
  ANOMALY_DETECTION_RESPONSE = 'ANOMALY_DETECTION_RESPONSE',
  
  // Specialized validation message types
  VALIDATION_REQUEST = 'VALIDATION_REQUEST',
  VALIDATION_RESPONSE = 'VALIDATION_RESPONSE',
  DATA_QUALITY_REQUEST = 'DATA_QUALITY_REQUEST',
  DATA_QUALITY_RESPONSE = 'DATA_QUALITY_RESPONSE'
}

// Message priority levels
export enum MessagePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

// Command payload type
export interface CommandPayload {
  commandName: string;
  [key: string]: any;
}

// Query payload type
export interface QueryPayload {
  queryType: string;
  parameters?: Record<string, any>;
  [key: string]: any;
}

// Event payload type
export interface EventPayload {
  eventName: string;
  data?: any;
  [key: string]: any;
}

// Status update payload type
export interface StatusUpdatePayload {
  status: string;
  metrics?: Record<string, any>;
  [key: string]: any;
}

// Assistance request payload type
export interface AssistanceRequestPayload {
  issueType: string;
  description: string;
  context?: any;
  [key: string]: any;
}

// Response payload type
export interface ResponsePayload {
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  [key: string]: any;
}

// Message metadata
export interface MessageMetadata {
  priority?: MessagePriority;
  ttl?: number;
  tags?: string[];
  [key: string]: any;
}

// Valuation request payload
export interface ValuationRequestPayload {
  propertyId?: number;
  parcelNumber?: string;
  valuationDate?: Date;
  valuationContext?: Record<string, any>;
  [key: string]: any;
}

// Valuation response payload
export interface ValuationResponsePayload {
  propertyId: number;
  parcelNumber: string;
  valuationDate: Date;
  assessmentYear: number;
  valuationResult: Record<string, any>;
  [key: string]: any;
}

// Comparable request payload
export interface ComparableRequestPayload {
  propertyId: number;
  options?: Record<string, any>;
  [key: string]: any;
}

// Comparable response payload
export interface ComparableResponsePayload {
  propertyId: number;
  result: Record<string, any>;
  [key: string]: any;
}

// Anomaly detection request payload
export interface AnomalyDetectionRequestPayload {
  options: Record<string, any>;
  [key: string]: any;
}

// Anomaly detection response payload
export interface AnomalyDetectionResponsePayload {
  anomalies: any[];
  count: number;
  timestamp: Date;
  [key: string]: any;
}

// Validation request payload
export interface ValidationRequestPayload {
  propertyId?: number;
  property?: any;
  validateFields?: string[];
  validationRules?: string[];
  validateComplianceOnly?: boolean;
  [key: string]: any;
}

// Validation response payload
export interface ValidationResponsePayload {
  propertyId?: number;
  parcelNumber?: string;
  isValid: boolean;
  validationResults: any[];
  validationSummary: {
    errorCount: number;
    warningCount: number;
    errorFields: string[];
    warningFields: string[];
  };
  timestamp: Date;
  [key: string]: any;
}

// Data quality request payload
export interface DataQualityRequestPayload {
  limit?: number;
  offset?: number;
  propertyId?: number;
  includeMetrics?: boolean;
  includeFieldAnalysis?: boolean;
  thresholds?: Record<string, number>;
  [key: string]: any;
}

// Data quality response payload
export interface DataQualityResponsePayload {
  metrics: any;
  recommendations: string[];
  overallScore: number;
  fieldAnalysis?: Record<string, any>;
  timestamp: Date;
  [key: string]: any;
}

// Union type for all possible message payloads
export type MessagePayload = 
  | CommandPayload 
  | QueryPayload 
  | EventPayload 
  | StatusUpdatePayload 
  | AssistanceRequestPayload 
  | ResponsePayload
  | ValuationRequestPayload
  | ValuationResponsePayload
  | ComparableRequestPayload
  | ComparableResponsePayload
  | AnomalyDetectionRequestPayload
  | AnomalyDetectionResponsePayload
  | ValidationRequestPayload
  | ValidationResponsePayload
  | DataQualityRequestPayload
  | DataQualityResponsePayload;

// The main message interface
export interface AgentMessage {
  messageId: string;
  correlationId?: string;
  timestamp: Date;
  source: string;
  destination: string;
  eventType: MessageEventType;
  payload: MessagePayload;
  metadata?: MessageMetadata;
  requiresResponse?: boolean;
  expiresAt?: Date;
}

/**
 * Create a new message
 */
export function createMessage(
  source: string,
  destination: string,
  eventType: MessageEventType,
  payload: any,
  options: {
    metadata?: MessageMetadata;
    correlationId?: string;
    requiresResponse?: boolean;
    ttlSeconds?: number;
  } = {}
): AgentMessage {
  const { metadata = {}, correlationId, requiresResponse = false, ttlSeconds } = options;

  // Set default priority if not specified
  if (!metadata.priority) {
    metadata.priority = MessagePriority.MEDIUM;
  }

  // Calculate expiration time if TTL is provided
  let expiresAt: Date | undefined;
  if (ttlSeconds) {
    expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
  }

  return {
    messageId: uuidv4(),
    correlationId,
    timestamp: new Date(),
    source,
    destination,
    eventType,
    payload,
    metadata,
    requiresResponse,
    expiresAt
  };
}

/**
 * Create a success response message for a received message
 */
export function createSuccessResponse(
  originalMessage: AgentMessage,
  result: any
): AgentMessage {
  return createMessage(
    originalMessage.destination,
    originalMessage.source,
    MessageEventType.RESPONSE,
    {
      success: true,
      result
    },
    {
      correlationId: originalMessage.messageId,
      metadata: originalMessage.metadata
    }
  );
}

/**
 * Create an error response message for a received message
 */
export function createErrorResponse(
  originalMessage: AgentMessage,
  errorCode: string,
  errorMessage: string,
  errorDetails?: any
): AgentMessage {
  return createMessage(
    originalMessage.destination,
    originalMessage.source,
    MessageEventType.RESPONSE,
    {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails
      }
    },
    {
      correlationId: originalMessage.messageId,
      metadata: originalMessage.metadata
    }
  );
}

/**
 * Check if a message has expired
 */
export function isMessageExpired(message: AgentMessage): boolean {
  return !!message.expiresAt && message.expiresAt < new Date();
}

/**
 * Check if a message requires a response
 */
export function requiresResponse(message: AgentMessage): boolean {
  return !!message.requiresResponse;
}

/**
 * Get the priority of a message (defaults to MEDIUM)
 */
export function getMessagePriority(message: AgentMessage): MessagePriority {
  return message.metadata?.priority || MessagePriority.MEDIUM;
}

// Specialized message types for Valuation Agent

export interface ValuationRequestMessage extends AgentMessage {
  eventType: MessageEventType.VALUATION_REQUEST;
  payload: ValuationRequestPayload;
}

export interface ValuationResponseMessage extends AgentMessage {
  eventType: MessageEventType.VALUATION_RESPONSE;
  payload: ValuationResponsePayload;
}

export interface ComparableRequestMessage extends AgentMessage {
  eventType: MessageEventType.COMPARABLE_REQUEST;
  payload: ComparableRequestPayload;
}

export interface ComparableResponseMessage extends AgentMessage {
  eventType: MessageEventType.COMPARABLE_RESPONSE;
  payload: ComparableResponsePayload;
}

export interface AnomalyDetectionRequestMessage extends AgentMessage {
  eventType: MessageEventType.ANOMALY_DETECTION_REQUEST;
  payload: AnomalyDetectionRequestPayload;
}

export interface AnomalyDetectionResponseMessage extends AgentMessage {
  eventType: MessageEventType.ANOMALY_DETECTION_RESPONSE;
  payload: AnomalyDetectionResponsePayload;
}

// Specialized message types for Data Validation Agent

export interface ValidationRequestMessage extends AgentMessage {
  eventType: MessageEventType.VALIDATION_REQUEST;
  payload: ValidationRequestPayload;
}

export interface ValidationResponseMessage extends AgentMessage {
  eventType: MessageEventType.VALIDATION_RESPONSE;
  payload: ValidationResponsePayload;
}

export interface DataQualityRequestMessage extends AgentMessage {
  eventType: MessageEventType.DATA_QUALITY_REQUEST;
  payload: DataQualityRequestPayload;
}

export interface DataQualityResponseMessage extends AgentMessage {
  eventType: MessageEventType.DATA_QUALITY_RESPONSE;
  payload: DataQualityResponsePayload;
}