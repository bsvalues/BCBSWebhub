import { Request, Response } from "express";
import { z } from "zod";
import { MasterControlProgram } from "../agents/master-control-program";
import { AgentType, AgentCommunicationBus, Priority } from "@shared/protocols/agent-communication";

// Create a communication bus for inter-agent messaging
const communicationBus = new AgentCommunicationBus();

// Create and initialize the Master Control Program
const mcp = new MasterControlProgram(communicationBus);

// Task submission schema
const submitTaskSchema = z.object({
  taskType: z.string(),
  parameters: z.any(),
  destinationAgent: z.nativeEnum(AgentType).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

// Task cancellation schema
const cancelTaskSchema = z.object({
  taskId: z.string()
});

// Agent status request schema
const agentStatusSchema = z.object({
  agentType: z.nativeEnum(AgentType)
});

/**
 * Agent Controller - Provides API endpoints for interacting with the agent system
 */
export class AgentController {
  private initialized: boolean = false;
  
  constructor() {
    // Initialize MCP on first access
    this.ensureInitialized();
  }
  
  /**
   * Initialize the agent system if not already initialized
   */
  private async ensureInitialized() {
    if (!this.initialized) {
      await mcp.initialize();
      this.initialized = true;
      console.log('Agent system initialized');
    }
  }
  
  /**
   * Submit a task to the agent system
   */
  public async submitTask(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const validation = submitTaskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request', 
          details: validation.error.format()
        });
      }
      
      // Extract validated data
      const { taskType, parameters, destinationAgent, priority } = validation.data;
      
      // Submit task to MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'submit_task',
        parameters: {
          taskType,
          parameters,
          destinationAgent,
          priority: priority as Priority || Priority.MEDIUM,
          responseRequired: true,
          source: 'api',
        },
        priority: Priority.HIGH,
        status: 'processing'
      });
      
      return res.status(202).json({
        message: 'Task submitted successfully',
        taskId: result.taskId,
        status: result.status
      });
    } catch (error) {
      console.error('Error submitting task:', error);
      return res.status(500).json({ 
        error: 'Task submission failed', 
        message: error.message
      });
    }
  }
  
  /**
   * Cancel a task in the agent system
   */
  public async cancelTask(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const validation = cancelTaskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request', 
          details: validation.error.format()
        });
      }
      
      // Extract task ID
      const { taskId } = validation.data;
      
      // Cancel task via MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'cancel_task',
        parameters: { taskId },
        priority: Priority.HIGH,
        status: 'processing'
      });
      
      return res.status(200).json({
        message: 'Task cancelled successfully',
        taskId: result.taskId,
        status: result.status
      });
    } catch (error) {
      console.error('Error cancelling task:', error);
      
      // Check if it's a "not found" error
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'Task not found', 
          message: error.message
        });
      }
      
      return res.status(500).json({ 
        error: 'Task cancellation failed', 
        message: error.message
      });
    }
  }
  
  /**
   * Get the status of a task
   */
  public async getTaskStatus(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Get task ID from params
      const taskId = req.params.id;
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      // Get task status via MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'get_task_status',
        parameters: { taskId },
        priority: Priority.MEDIUM,
        status: 'processing'
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting task status:', error);
      
      // Check if it's a "not found" error
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'Task not found', 
          message: error.message
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to get task status', 
        message: error.message
      });
    }
  }
  
  /**
   * Get the status of a specific agent
   */
  public async getAgentStatus(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request
      const agentType = req.params.type as AgentType;
      if (!Object.values(AgentType).includes(agentType)) {
        return res.status(400).json({ 
          error: 'Invalid agent type', 
          validTypes: Object.values(AgentType)
        });
      }
      
      // Get agent status via MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'get_agent_status',
        parameters: { agentType },
        priority: Priority.MEDIUM,
        status: 'processing'
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting agent status:', error);
      
      // Check if it's a "not found" error
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'Agent not found', 
          message: error.message
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to get agent status', 
        message: error.message
      });
    }
  }
  
  /**
   * Get the status of the entire system
   */
  public async getSystemStatus(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Get system status via MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'get_system_status',
        parameters: {},
        priority: Priority.MEDIUM,
        status: 'processing'
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting system status:', error);
      return res.status(500).json({ 
        error: 'Failed to get system status', 
        message: error.message
      });
    }
  }
  
  /**
   * Submit a property validation task
   */
  public async validateProperty(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Extract property data from request body
      const propertyData = req.body;
      if (!propertyData) {
        return res.status(400).json({ error: 'Property data is required' });
      }
      
      // Submit validation task to MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'submit_task',
        parameters: {
          taskType: 'validate_property',
          parameters: { property: propertyData },
          destinationAgent: AgentType.DATA_VALIDATION,
          priority: Priority.HIGH,
          responseRequired: true,
          source: 'api'
        },
        priority: Priority.HIGH,
        status: 'processing'
      });
      
      return res.status(202).json({
        message: 'Property validation task submitted',
        taskId: result.taskId,
        status: result.status
      });
    } catch (error) {
      console.error('Error submitting property validation task:', error);
      return res.status(500).json({ 
        error: 'Property validation submission failed', 
        message: error.message
      });
    }
  }
  
  /**
   * Submit a property valuation task
   */
  public async calculatePropertyValue(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Extract parameters from request
      const { propertyId, parcelNumber, context } = req.body;
      
      if (!propertyId && !parcelNumber) {
        return res.status(400).json({ 
          error: 'Either propertyId or parcelNumber is required' 
        });
      }
      
      // Submit valuation task to MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'submit_task',
        parameters: {
          taskType: 'calculate_property_value',
          parameters: { 
            propertyId, 
            parcelNumber,
            valuationDate: new Date(),
            context: context || {
              purpose: 'assessment',
              assessmentYear: new Date().getFullYear(),
              useComparables: true,
              useHistoricalTrends: true,
              detectAnomalies: true
            }
          },
          destinationAgent: AgentType.VALUATION,
          priority: Priority.HIGH,
          responseRequired: true,
          source: 'api'
        },
        priority: Priority.HIGH,
        status: 'processing'
      });
      
      return res.status(202).json({
        message: 'Property valuation task submitted',
        taskId: result.taskId,
        status: result.status
      });
    } catch (error) {
      console.error('Error submitting property valuation task:', error);
      return res.status(500).json({ 
        error: 'Property valuation submission failed', 
        message: error.message
      });
    }
  }
  
  /**
   * Find comparable properties
   */
  public async findComparableProperties(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Extract parameters from request
      const { propertyId, options } = req.body;
      
      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required' });
      }
      
      // Submit comparable properties task to MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'submit_task',
        parameters: {
          taskType: 'find_comparable_properties',
          parameters: { propertyId, ...options },
          destinationAgent: AgentType.VALUATION,
          priority: Priority.MEDIUM,
          responseRequired: true,
          source: 'api'
        },
        priority: Priority.MEDIUM,
        status: 'processing'
      });
      
      return res.status(202).json({
        message: 'Comparable properties task submitted',
        taskId: result.taskId,
        status: result.status
      });
    } catch (error) {
      console.error('Error submitting comparable properties task:', error);
      return res.status(500).json({ 
        error: 'Comparable properties submission failed', 
        message: error.message
      });
    }
  }
  
  /**
   * Detect valuation anomalies
   */
  public async detectValuationAnomalies(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Extract parameters from request
      const options = req.body;
      
      // Submit anomaly detection task to MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'submit_task',
        parameters: {
          taskType: 'detect_valuation_anomalies',
          parameters: options || {},
          destinationAgent: AgentType.VALUATION,
          priority: Priority.MEDIUM,
          responseRequired: true,
          source: 'api'
        },
        priority: Priority.MEDIUM,
        status: 'processing'
      });
      
      return res.status(202).json({
        message: 'Anomaly detection task submitted',
        taskId: result.taskId,
        status: result.status
      });
    } catch (error) {
      console.error('Error submitting anomaly detection task:', error);
      return res.status(500).json({ 
        error: 'Anomaly detection submission failed', 
        message: error.message
      });
    }
  }
  
  /**
   * Analyze data quality
   */
  public async analyzeDataQuality(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Submit data quality analysis task to MCP
      const result = await mcp.executeTask({
        id: `api_${Date.now()}`,
        type: 'submit_task',
        parameters: {
          taskType: 'analyze_data_quality',
          parameters: {},
          destinationAgent: AgentType.DATA_VALIDATION,
          priority: Priority.MEDIUM,
          responseRequired: true,
          source: 'api'
        },
        priority: Priority.MEDIUM,
        status: 'processing'
      });
      
      return res.status(202).json({
        message: 'Data quality analysis task submitted',
        taskId: result.taskId,
        status: result.status
      });
    } catch (error) {
      console.error('Error submitting data quality analysis task:', error);
      return res.status(500).json({ 
        error: 'Data quality analysis submission failed', 
        message: error.message
      });
    }
  }
}

// Create a singleton instance of the controller
export const agentController = new AgentController();