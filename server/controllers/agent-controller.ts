/**
 * Agent Controller
 * 
 * Provides API endpoints to interact with the AI agent system.
 * Acts as the interface between external clients and the agent infrastructure.
 */

import { Request, Response } from 'express';
import { AgentCommunicationBus } from '../../shared/protocols/agent-communication';
import { getAgentManager, AgentManager } from '../agents/agent-manager';
import { configManager } from '../utils/config-manager';
import { logger } from '../utils/logger';
import { 
  createMessage, 
  MessageEventType, 
  MessagePriority
} from '../../shared/protocols/message-protocol';
import { v4 as uuidv4 } from 'uuid';

// Initialize dependencies
const communicationBus = new AgentCommunicationBus();
let agentManager: AgentManager | null = null;

// Create a controller object to export
const agentController = {
  initializeAgentSystem,
  listAgents,
  getAgentStatus,
  startAgent,
  stopAgent,
  sendMessage,
  executeCommand,
  getReplayBufferStats,
  triggerTraining,
  shutdownAgentSystem,
  validateProperty: validatePropertyData,
  checkPropertyCompliance,
  // Method aliases for the router
  submitTask: (req: Request, res: Response) => executeCommand(req, res),
  cancelTask: (req: Request, res: Response) => executeCommand(req, res),
  getTaskStatus: (req: Request, res: Response) => getAgentStatus(req, res),
  getSystemStatus: (req: Request, res: Response) => listAgents(req, res),
  analyzeDataQuality: (req: Request, res: Response) => validatePropertyData(req, res),
  calculatePropertyValue: (req: Request, res: Response) => executeCommand(req, res),
  findComparableProperties: (req: Request, res: Response) => executeCommand(req, res),
  detectValuationAnomalies: (req: Request, res: Response) => executeCommand(req, res)
};

export { agentController };

/**
 * Initialize the agent system
 */
async function initializeAgentSystem(): Promise<void> {
  try {
    logger.info('Initializing agent system');
    
    // Create agent manager if not already created
    if (!agentManager) {
      const config = configManager.get('agents', {});
      agentManager = getAgentManager(communicationBus, { agents: config });
      await agentManager.initialize();
      logger.info('Agent system initialized successfully');
    }
  } catch (error) {
    logger.error('Failed to initialize agent system:', error);
    throw error;
  }
}

/**
 * List all active agents
 */
export function listAgents(req: Request, res: Response): void {
  try {
    if (!agentManager) {
      return res.status(500).json({
        success: false,
        error: 'Agent system not initialized'
      });
    }
    
    const agentStatus = agentManager.getAgentStatus();
    
    res.json({
      success: true,
      data: agentStatus
    });
  } catch (error) {
    logger.error('Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list agents'
    });
  }
}

/**
 * Get status of a specific agent
 */
export function getAgentStatus(req: Request, res: Response): void {
  try {
    const { agentId } = req.params;
    
    if (!agentManager) {
      return res.status(500).json({
        success: false,
        error: 'Agent system not initialized'
      });
    }
    
    const agentStatus = agentManager.getAgentStatus();
    
    if (!agentStatus[agentId]) {
      return res.status(404).json({
        success: false,
        error: `Agent with ID ${agentId} not found`
      });
    }
    
    // Get agent-specific status by querying the agent directly
    const responsePromise = communicationBus.sendMessageWithResponse(
      createMessage(
        'agent-controller',
        agentId,
        MessageEventType.QUERY,
        { queryType: 'status' },
        { 
          metadata: { priority: MessagePriority.LOW }
        }
      ),
      5000 // 5 second timeout
    );
    
    // Handle response asynchronously
    responsePromise.then(response => {
      if (response && response.payload) {
        res.json({
          success: true,
          data: {
            ...agentStatus[agentId],
            ...response.payload
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            ...agentStatus[agentId],
            status: 'unknown',
            message: 'Agent did not respond with status details'
          }
        });
      }
    }).catch(error => {
      logger.warn(`Error getting detailed status for agent ${agentId}:`, error);
      res.json({
        success: true,
        data: {
          ...agentStatus[agentId],
          status: 'unavailable',
          message: 'Agent did not respond to status request'
        }
      });
    });
  } catch (error) {
    logger.error(`Error getting agent status:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent status'
    });
  }
}

/**
 * Start a specific agent
 */
export async function startAgent(req: Request, res: Response): Promise<void> {
  try {
    const { agentId } = req.params;
    const { type, settings } = req.body;
    
    if (!agentManager) {
      return res.status(500).json({
        success: false,
        error: 'Agent system not initialized'
      });
    }
    
    // Validate agent type
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Agent type is required'
      });
    }
    
    // Start the agent
    const agent = await agentManager.startAgent(agentId, type, settings || {});
    
    if (agent) {
      res.json({
        success: true,
        message: `Agent ${agentId} started successfully`,
        data: {
          id: agentId,
          type
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Failed to start agent ${agentId}`
      });
    }
  } catch (error) {
    logger.error(`Error starting agent:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to start agent'
    });
  }
}

/**
 * Stop a specific agent
 */
export async function stopAgent(req: Request, res: Response): Promise<void> {
  try {
    const { agentId } = req.params;
    
    if (!agentManager) {
      return res.status(500).json({
        success: false,
        error: 'Agent system not initialized'
      });
    }
    
    // Stop the agent
    const success = await agentManager.stopAgent(agentId);
    
    if (success) {
      res.json({
        success: true,
        message: `Agent ${agentId} stopped successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found or could not be stopped`
      });
    }
  } catch (error) {
    logger.error(`Error stopping agent:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop agent'
    });
  }
}

/**
 * Send a message to an agent
 */
export function sendMessage(req: Request, res: Response): void {
  try {
    const message = req.body;
    
    // Basic message validation
    if (!message || !message.targetAgentId || !message.eventType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message format',
        details: 'Message must include targetAgentId and eventType'
      });
    }
    
    // Check if the target agent exists
    const agentStatus = agentManager?.getAgentStatus() || {};
    if (!agentStatus[message.targetAgentId]) {
      return res.status(404).json({
        success: false,
        error: `Target agent ${message.targetAgentId} not found`
      });
    }
    
    // Send the message
    if (message.eventType === MessageEventType.QUERY) {
      // For queries, wait for a response
      const responsePromise = communicationBus.sendMessageWithResponse(
        message,
        10000 // 10 second timeout
      );
      
      // Handle response asynchronously
      responsePromise.then(response => {
        res.json({
          success: true,
          data: response
        });
      }).catch(error => {
        logger.warn(`Error getting response for query:`, error);
        res.status(504).json({
          success: false,
          error: 'Query timed out or failed',
          details: error.message
        });
      });
    } else {
      // For non-queries, just send the message without waiting for response
      communicationBus.sendMessage(message);
      
      res.json({
        success: true,
        message: 'Message sent successfully',
        messageId: message.messageId
      });
    }
  } catch (error) {
    logger.error(`Error sending message:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
}

/**
 * Execute a command on an agent
 */
export function executeCommand(req: Request, res: Response): void {
  try {
    const { agentId } = req.params;
    const { command, params } = req.body;
    
    // Check if the agent exists
    const agentStatus = agentManager?.getAgentStatus() || {};
    if (!agentStatus[agentId]) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      });
    }
    
    // Create a command message
    const message = createMessage(
      'agent-controller',
      agentId,
      MessageEventType.COMMAND,
      {
        commandName: command,
        ...params
      }
    );
    
    // Send the command and wait for response
    const responsePromise = communicationBus.sendMessageWithResponse(
      message,
      30000 // 30 second timeout for commands
    );
    
    // Handle response asynchronously
    responsePromise.then(response => {
      res.json({
        success: true,
        data: response.payload
      });
    }).catch(error => {
      logger.warn(`Error executing command on agent ${agentId}:`, error);
      res.status(504).json({
        success: false,
        error: 'Command execution timed out or failed',
        details: error.message
      });
    });
  } catch (error) {
    logger.error(`Error executing command:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute command'
    });
  }
}

/**
 * Get replay buffer statistics
 */
export function getReplayBufferStats(req: Request, res: Response): void {
  try {
    if (!agentManager) {
      return res.status(500).json({
        success: false,
        error: 'Agent system not initialized'
      });
    }
    
    const stats = agentManager.getReplayBufferStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error getting replay buffer stats:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get replay buffer statistics'
    });
  }
}

/**
 * Trigger a training cycle
 */
export function triggerTraining(req: Request, res: Response): void {
  try {
    // Send command to MCP to trigger training
    if (!agentManager) {
      return res.status(500).json({
        success: false,
        error: 'Agent system not initialized'
      });
    }
    
    // Create a command message
    const message = createMessage(
      'agent-controller',
      'mcp',
      MessageEventType.COMMAND,
      {
        commandName: 'start-training-cycle',
        initiatedBy: 'api-request',
        params: req.body
      }
    );
    
    // Send the command (no need to wait for response)
    communicationBus.sendMessage(message);
    
    res.json({
      success: true,
      message: 'Training cycle triggered',
      requestId: message.messageId
    });
  } catch (error) {
    logger.error(`Error triggering training:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger training'
    });
  }
}

/**
 * Shutdown the agent system
 */
export async function shutdownAgentSystem(req: Request, res: Response): Promise<void> {
  try {
    if (!agentManager) {
      return res.status(400).json({
        success: false,
        error: 'Agent system not initialized'
      });
    }
    
    await agentManager.shutdown();
    
    res.json({
      success: true,
      message: 'Agent system shutdown successfully'
    });
  } catch (error) {
    logger.error(`Error shutting down agent system:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to shutdown agent system'
    });
  }
}

/**
 * Handle data validation request
 * Convenience endpoint for validating property data
 */
export function validatePropertyData(req: Request, res: Response): void {
  try {
    const { property, propertyId, validateFields } = req.body;
    
    // Check if at least one of property or propertyId is provided
    if (!property && !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Either property object or propertyId must be provided'
      });
    }
    
    // Create validation request message
    const message = createMessage(
      'agent-controller',
      'data-validation',
      MessageEventType.COMMAND,
      {
        commandName: 'validateProperty',
        propertyId,
        property,
        validateFields
      },
      { 
        metadata: { priority: MessagePriority.MEDIUM }
      }
    );
    
    // Send the message and wait for response
    const responsePromise = communicationBus.sendMessageWithResponse(
      message,
      30000 // 30 second timeout
    );
    
    // Handle response asynchronously
    responsePromise.then(response => {
      if (response.payload.status === 'success') {
        res.json({
          success: true,
          data: response.payload.result
        });
      } else {
        res.status(400).json({
          success: false,
          error: response.payload.error?.errorMessage || 'Validation failed',
          details: response.payload.error?.details
        });
      }
    }).catch(error => {
      logger.warn(`Error validating property data:`, error);
      res.status(504).json({
        success: false,
        error: 'Validation request timed out or failed',
        details: error.message
      });
    });
  } catch (error) {
    logger.error(`Error validating property data:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate property data'
    });
  }
}

/**
 * Handle compliance check request
 * Convenience endpoint for checking property compliance
 */
export function checkPropertyCompliance(req: Request, res: Response): void {
  try {
    const { property, propertyId, region } = req.body;
    
    // Check if at least one of property or propertyId is provided
    if (!property && !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Either property object or propertyId must be provided'
      });
    }
    
    // Create compliance check message
    const message = createMessage(
      'agent-controller',
      'compliance',
      MessageEventType.COMMAND,
      {
        commandName: 'checkCompliance',
        propertyId,
        property,
        region: region || 'WA' // Default to Washington
      },
      { 
        metadata: { priority: MessagePriority.MEDIUM }
      }
    );
    
    // Send the message and wait for response
    const responsePromise = communicationBus.sendMessageWithResponse(
      message,
      30000 // 30 second timeout
    );
    
    // Handle response asynchronously
    responsePromise.then(response => {
      if (response.payload.status === 'success') {
        res.json({
          success: true,
          data: response.payload.result
        });
      } else {
        res.status(400).json({
          success: false,
          error: response.payload.error?.errorMessage || 'Compliance check failed',
          details: response.payload.error?.details
        });
      }
    }).catch(error => {
      logger.warn(`Error checking property compliance:`, error);
      res.status(504).json({
        success: false,
        error: 'Compliance check request timed out or failed',
        details: error.message
      });
    });
  } catch (error) {
    logger.error(`Error checking property compliance:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to check property compliance'
    });
  }
}