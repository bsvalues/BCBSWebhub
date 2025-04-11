import { Request, Response } from "express";
import { MasterControlProgram } from "../agents/master-control-program";
import { AgentType, Priority } from "@shared/protocols/agent-communication";
import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * Agent Controller - Provides API endpoints for interacting with the agent system
 */
export class AgentController {
  private initialized: boolean = false;
  private mcp: MasterControlProgram | null = null;
  
  constructor() {
    // Initialization of the agent system is deferred until first use
    this.initialized = false;
    this.mcp = null;
  }
  
  /**
   * Initialize the agent system if not already initialized
   */
  private async ensureInitialized() {
    if (this.initialized && this.mcp) {
      return;
    }
    
    try {
      console.log("Initializing Master Control Program and agent system...");
      
      // Create and initialize the Master Control Program
      this.mcp = new MasterControlProgram();
      await this.mcp.initialize();
      
      this.initialized = true;
      console.log("Agent system successfully initialized");
    } catch (error) {
      console.error("Failed to initialize agent system:", error);
      throw new Error("Agent system initialization failed");
    }
  }
  
  /**
   * Submit a task to the agent system
   */
  public async submitTask(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const taskSchema = z.object({
        agentType: z.enum([
          AgentType.DATA_VALIDATION, 
          AgentType.VALUATION, 
          AgentType.USER_INTERACTION
        ]),
        taskType: z.string(),
        parameters: z.any(),
        priority: z.enum(["high", "medium", "low"]).optional()
      });
      
      const result = taskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid task request", 
          details: result.error.format() 
        });
      }
      
      const { agentType, taskType, parameters } = result.data;
      const priority = result.data.priority 
        ? (result.data.priority === "high" 
            ? Priority.HIGH 
            : result.data.priority === "medium" 
              ? Priority.MEDIUM 
              : Priority.LOW)
        : Priority.MEDIUM;
      
      // Generate task ID
      const taskId = randomUUID();
      
      // Submit task to MCP
      try {
        const taskResult = await this.mcp!.executeTask({
          agentType,
          taskId,
          taskType,
          parameters,
          priority
        });
        
        res.status(202).json({
          taskId,
          status: "accepted",
          result: taskResult
        });
      } catch (error) {
        console.error("Task execution failed:", error);
        res.status(500).json({
          taskId,
          status: "failed",
          error: error.message || "Task execution failed"
        });
      }
    } catch (error) {
      console.error("Task submission error:", error);
      res.status(500).json({ error: "Failed to submit task" });
    }
  }
  
  /**
   * Cancel a task in the agent system
   */
  public async cancelTask(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      const { taskId } = req.params;
      if (!taskId) {
        return res.status(400).json({ error: "Task ID is required" });
      }
      
      try {
        const result = await this.mcp!.executeTask({
          agentType: AgentType.MCP,
          taskId: randomUUID(),
          taskType: "cancel_task",
          parameters: { taskId },
          priority: Priority.HIGH
        });
        
        res.json({
          taskId,
          status: "cancelled",
          result
        });
      } catch (error) {
        console.error("Task cancellation failed:", error);
        res.status(500).json({
          taskId,
          status: "failed",
          error: error.message || "Task cancellation failed"
        });
      }
    } catch (error) {
      console.error("Task cancellation error:", error);
      res.status(500).json({ error: "Failed to cancel task" });
    }
  }
  
  /**
   * Get the status of a task
   */
  public async getTaskStatus(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      const { taskId } = req.params;
      if (!taskId) {
        return res.status(400).json({ error: "Task ID is required" });
      }
      
      try {
        const result = await this.mcp!.executeTask({
          agentType: AgentType.MCP,
          taskId: randomUUID(),
          taskType: "get_task_status",
          parameters: { taskId },
          priority: Priority.LOW
        });
        
        if (!result) {
          return res.status(404).json({ error: "Task not found" });
        }
        
        res.json(result);
      } catch (error) {
        console.error("Get task status failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Failed to get task status"
        });
      }
    } catch (error) {
      console.error("Get task status error:", error);
      res.status(500).json({ error: "Failed to get task status" });
    }
  }
  
  /**
   * Get the status of a specific agent
   */
  public async getAgentStatus(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      const { agentType } = req.params;
      if (!agentType) {
        return res.status(400).json({ error: "Agent type is required" });
      }
      
      try {
        const result = await this.mcp!.executeTask({
          agentType: AgentType.MCP,
          taskId: randomUUID(),
          taskType: "get_agent_status",
          parameters: { agentType },
          priority: Priority.LOW
        });
        
        if (!result) {
          return res.status(404).json({ error: "Agent not found" });
        }
        
        res.json(result);
      } catch (error) {
        console.error("Get agent status failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Failed to get agent status"
        });
      }
    } catch (error) {
      console.error("Get agent status error:", error);
      res.status(500).json({ error: "Failed to get agent status" });
    }
  }
  
  /**
   * Get the status of the entire system
   */
  public async getSystemStatus(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      try {
        const result = await this.mcp!.executeTask({
          agentType: AgentType.MCP,
          taskId: randomUUID(),
          taskType: "get_system_status",
          parameters: {},
          priority: Priority.LOW
        });
        
        res.json(result);
      } catch (error) {
        console.error("Get system status failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Failed to get system status"
        });
      }
    } catch (error) {
      console.error("Get system status error:", error);
      res.status(500).json({ error: "Failed to get system status" });
    }
  }
  
  /**
   * Submit a property validation task
   */
  public async validateProperty(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const validateSchema = z.object({
        propertyId: z.number().optional(),
        property: z.object({}).optional(),
        validate: z.array(z.string()).optional()
      });
      
      const result = validateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid validation request", 
          details: result.error.format() 
        });
      }
      
      const { propertyId, property, validate } = result.data;
      
      if (!propertyId && !property) {
        return res.status(400).json({ 
          error: "Either propertyId or property data is required" 
        });
      }
      
      try {
        const taskResult = await this.mcp!.executeTask({
          agentType: AgentType.DATA_VALIDATION,
          taskId: randomUUID(),
          taskType: "validate_property",
          parameters: { propertyId, property, validateFields: validate },
          priority: Priority.MEDIUM
        });
        
        res.json(taskResult);
      } catch (error) {
        console.error("Property validation failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Property validation failed"
        });
      }
    } catch (error) {
      console.error("Property validation error:", error);
      res.status(500).json({ error: "Failed to validate property" });
    }
  }
  
  /**
   * Submit a property valuation task
   */
  public async calculatePropertyValue(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const valuationSchema = z.object({
        propertyId: z.number().optional(),
        property: z.object({}).optional(),
        assessmentYear: z.number(),
        options: z.object({
          useComparables: z.boolean().optional(),
          method: z.enum(["cost", "income", "market", "hybrid"]).optional(),
          includeTrends: z.boolean().optional()
        }).optional()
      });
      
      const result = valuationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid valuation request", 
          details: result.error.format() 
        });
      }
      
      const { propertyId, property, assessmentYear, options } = result.data;
      
      if (!propertyId && !property) {
        return res.status(400).json({ 
          error: "Either propertyId or property data is required" 
        });
      }
      
      try {
        const taskResult = await this.mcp!.executeTask({
          agentType: AgentType.VALUATION,
          taskId: randomUUID(),
          taskType: "calculate_value",
          parameters: { propertyId, property, assessmentYear, options },
          priority: Priority.MEDIUM
        });
        
        res.json(taskResult);
      } catch (error) {
        console.error("Property valuation failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Property valuation failed"
        });
      }
    } catch (error) {
      console.error("Property valuation error:", error);
      res.status(500).json({ error: "Failed to calculate property value" });
    }
  }
  
  /**
   * Find comparable properties
   */
  public async findComparableProperties(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const comparablesSchema = z.object({
        propertyId: z.number(),
        count: z.number().min(1).max(20).optional(),
        filters: z.object({
          radius: z.number().optional(),
          maxAgeDays: z.number().optional(),
          sameNeighborhood: z.boolean().optional(),
          sameTaxingDistrict: z.boolean().optional()
        }).optional()
      });
      
      const result = comparablesSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid comparables request", 
          details: result.error.format() 
        });
      }
      
      const { propertyId, count, filters } = result.data;
      
      try {
        const taskResult = await this.mcp!.executeTask({
          agentType: AgentType.VALUATION,
          taskId: randomUUID(),
          taskType: "find_comparables",
          parameters: { propertyId, count: count || 10, filters },
          priority: Priority.MEDIUM
        });
        
        res.json(taskResult);
      } catch (error) {
        console.error("Finding comparables failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Finding comparable properties failed"
        });
      }
    } catch (error) {
      console.error("Finding comparables error:", error);
      res.status(500).json({ error: "Failed to find comparable properties" });
    }
  }
  
  /**
   * Detect valuation anomalies
   */
  public async detectValuationAnomalies(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const anomalySchema = z.object({
        taxingDistrict: z.string().optional(),
        propertyType: z.enum([
          "residential", 
          "commercial", 
          "industrial", 
          "agricultural",
          "timber",
          "open_space",
          "other"
        ]).optional(),
        assessmentYear: z.number(),
        zScoreThreshold: z.number().min(1).max(5).optional()
      });
      
      const result = anomalySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid anomaly detection request", 
          details: result.error.format() 
        });
      }
      
      const { taxingDistrict, propertyType, assessmentYear, zScoreThreshold } = result.data;
      
      try {
        const taskResult = await this.mcp!.executeTask({
          agentType: AgentType.VALUATION,
          taskId: randomUUID(),
          taskType: "detect_anomalies",
          parameters: { 
            taxingDistrict, 
            propertyType, 
            assessmentYear, 
            zScoreThreshold: zScoreThreshold || 3 
          },
          priority: Priority.LOW
        });
        
        res.json(taskResult);
      } catch (error) {
        console.error("Anomaly detection failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Detecting valuation anomalies failed"
        });
      }
    } catch (error) {
      console.error("Anomaly detection error:", error);
      res.status(500).json({ error: "Failed to detect valuation anomalies" });
    }
  }
  
  /**
   * Analyze data quality
   */
  public async analyzeDataQuality(req: Request, res: Response) {
    try {
      await this.ensureInitialized();
      
      // Validate request body
      const qualitySchema = z.object({
        limit: z.number().min(1).max(1000).optional(),
        offset: z.number().min(0).optional(),
        propertyId: z.number().optional(),
        includeMetrics: z.boolean().optional(),
        includeFieldAnalysis: z.boolean().optional(),
        thresholds: z.object({
          completeness: z.number().min(0).max(100).optional(),
          accuracy: z.number().min(0).max(100).optional(),
          consistency: z.number().min(0).max(100).optional(),
          timeliness: z.number().min(0).max(100).optional()
        }).optional()
      });
      
      const result = qualitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid data quality analysis request", 
          details: result.error.format() 
        });
      }
      
      try {
        const taskResult = await this.mcp!.executeTask({
          agentType: AgentType.DATA_VALIDATION,
          taskId: randomUUID(),
          taskType: "analyze_data_quality",
          parameters: result.data,
          priority: Priority.LOW
        });
        
        res.json(taskResult);
      } catch (error) {
        console.error("Data quality analysis failed:", error);
        res.status(500).json({
          status: "error",
          error: error.message || "Data quality analysis failed"
        });
      }
    } catch (error) {
      console.error("Data quality analysis error:", error);
      res.status(500).json({ error: "Failed to analyze data quality" });
    }
  }
}

export const agentController = new AgentController();