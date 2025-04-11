import { 
  AgentType, 
  AgentStatus,
  AgentCommunicationBus,
  TaskStatus
} from "@shared/protocols/agent-communication";
import {
  AgentMessage,
  MessageEventType as MessageType,
  MessagePriority as Priority
} from "@shared/protocols/message-protocol";
import { BaseAgent, Task, Agent } from "./base-agent";
import { DataValidationAgent } from "./data-validation-agent";
import { ValuationAgent } from "./valuation-agent";
import { ArchitectPrimeAgent } from "./architect-prime-agent";
import { IntegrationCoordinatorAgent } from "./integration-coordinator-agent";
import { ComplianceAgent } from './compliance-agent';
import { PriorityQueue } from "../utils/priority-queue";

// Task information stored by the MCP
interface TaskInfo {
  id: string;
  agentType: AgentType | string;
  taskType: string;
  parameters: any;
  priority: Priority;
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed' | 'cancelled';
  assignedAgent?: string;
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: any;
}

/**
 * Master Control Program (MCP)
 * 
 * Central orchestration service that coordinates all agents in the system.
 * Responsibilities:
 * - Maintaining agent registry
 * - Task queue management and distribution
 * - Inter-agent communication
 * - System-wide logging and state tracking
 */
export class MasterControlProgram extends BaseAgent {
  private agents: Map<string, Agent> = new Map();
  private taskInfoMap: Map<string, TaskInfo> = new Map();
  private taskQueue: PriorityQueue<string> = new PriorityQueue();
  private processingInterval: NodeJS.Timeout | null = null;
  private processingPaused: boolean = false;
  
  /**
   * Constructor
   */
  constructor() {
    super(
      AgentType.MCP,
      [
        'agent_orchestration',
        'task_distribution',
        'system_monitoring',
        'inter_agent_communication',
        'error_handling'
      ],
      new AgentCommunicationBus()
    );
  }
  
  /**
   * Initialize the Master Control Program
   */
  public async initialize(): Promise<void> {
    // Initialize base functionality
    await super.initialize();
    
    // Create and register agents
    await this.setupAgents();
    
    // Start task processing
    this.startTaskProcessing();
    
    this.logger("Master Control Program initialized");
  }
  
  /**
   * Shutdown the Master Control Program
   */
  public async shutdown(): Promise<void> {
    // Stop task processing
    this.stopTaskProcessing();
    
    // Shutdown all agents
    for (const agent of this.agents.values()) {
      await agent.shutdown();
    }
    
    // Clear agent registry
    this.agents.clear();
    
    // Shutdown base functionality
    await super.shutdown();
    
    this.logger("Master Control Program shutdown");
  }
  
  /**
   * Set up and register all agents
   */
  private async setupAgents(): Promise<void> {
    this.logger("Setting up agent registry");
    
    // Create inter-agent communication bus
    const communicationBus = new AgentCommunicationBus();
    
    // Create strategic leadership agents (top-level in hierarchy)
    const architectPrimeAgent = new ArchitectPrimeAgent('architect-prime', communicationBus, {
      strategicVision: 'Ensure accurate property assessments and compliance with Washington State regulations',
      systemGoals: ['Reduce assessment errors by 85%', 'Accelerate valuation workflows by 70%', 'Achieve 100% regulatory compliance']
    });
    
    // Create integration coordinator (second level in hierarchy)
    const integrationCoordinatorAgent = new IntegrationCoordinatorAgent('integration-coordinator', communicationBus, {
      coordinationDomains: ['data-flow', 'compliance', 'workflow-management', 'reporting']
    });
    
    // Create specialized functional agents (operational layer)
    const dataValidationAgent = new DataValidationAgent(communicationBus);
    const valuationAgent = new ValuationAgent(communicationBus);
    const complianceAgent = new ComplianceAgent('compliance-agent', communicationBus, {
      regulatoryFramework: 'washington-state',
      complianceThreshold: 0.95
    });
    
    // Register agents in hierarchical order
    
    // 1. Strategic Leadership Layer
    this.registerAgent(architectPrimeAgent);
    this.registerAgent(integrationCoordinatorAgent);
    
    // 2. Component Leads Layer
    // Dynamically import to avoid circular dependencies
    const { BCBSMasterLeadAgent } = await import('./bcbs-master-lead-agent');
    const { BCBSGISProLeadAgent } = await import('./bcbs-gispro-lead-agent');
    const { BCBSLevyLeadAgent } = await import('./bcbs-levy-lead-agent');
    
    const masterLeadAgent = new BCBSMasterLeadAgent('master-lead', communicationBus, {
      domainAreas: ['property-assessment', 'tax-calculation', 'gis-integration', 'compliance'],
      priorityGoals: ['Data accuracy', 'Processing efficiency', 'Regulatory compliance'],
      complianceFrameworks: ['washington-state']
    });
    
    const gisProLeadAgent = new BCBSGISProLeadAgent('gispro-lead', communicationBus, {
      supportedDataFormats: ['shapefile', 'geojson', 'geopackage', 'kml'],
      spatialAnalysisCapabilities: ['proximity', 'overlay', 'buffer', 'interpolation'],
      serviceLevels: {
        'vector_processing': 10,
        'raster_processing': 5,
        'spatial_analytics': 8
      }
    });
    
    const levyLeadAgent = new BCBSLevyLeadAgent('levy-lead', communicationBus, {
      taxYears: [new Date().getFullYear(), new Date().getFullYear() + 1],
      levyRateSources: ['washington-dor', 'county-treasurer', 'municipal-budget'],
      taxingAuthorities: ['state', 'county', 'city', 'school', 'fire', 'library', 'port'],
      calculationModes: ['standard', 'special-assessment', 'multi-year']
    });
    
    this.registerAgent(masterLeadAgent);
    this.registerAgent(gisProLeadAgent);
    this.registerAgent(levyLeadAgent);
    
    // 3. Specialized Functional Agents
    this.registerAgent(dataValidationAgent);
    this.registerAgent(valuationAgent);
    this.registerAgent(complianceAgent);
    
    // Initialize all registered agents
    for (const agent of this.agents.values()) {
      await agent.initialize();
    }
    
    this.logger(`Agent registry setup complete. ${this.agents.size} agents registered in hierarchical structure`);
  }
  
  /**
   * Register an agent with the MCP
   */
  public registerAgent(agent: Agent): void {
    if (this.agents.has(agent.type)) {
      this.logger(`Agent of type ${agent.type} is already registered`);
      return;
    }
    
    this.agents.set(agent.type, agent);
    this.logger(`Registered agent: ${agent.type}`);
  }
  
  /**
   * Unregister an agent from the MCP
   */
  public unregisterAgent(agentType: string): void {
    if (!this.agents.has(agentType)) {
      this.logger(`Agent of type ${agentType} is not registered`);
      return;
    }
    
    // Get the agent
    const agent = this.agents.get(agentType);
    
    // Remove from registry
    this.agents.delete(agentType);
    
    this.logger(`Unregistered agent: ${agentType}`);
  }
  
  /**
   * Execute a task
   */
  protected async executeTask(task: Task): Promise<any> {
    switch (task.type) {
      case 'submit_task':
        return this.handleSubmitTask(task.parameters);
        
      case 'cancel_task':
        return this.handleCancelTask(task.parameters);
        
      case 'get_task_status':
        return this.handleGetTaskStatus(task.parameters);
        
      case 'get_agent_status':
        return this.handleGetAgentStatus(task.parameters);
        
      case 'get_system_status':
        return this.handleGetSystemStatus(task.parameters);
        
      case 'pause_processing':
        return this.handlePauseProcessing(task.parameters);
        
      case 'resume_processing':
        return this.handleResumeProcessing(task.parameters);
        
      default:
        throw new Error(`Unsupported MCP task type: ${task.type}`);
    }
  }
  
  /**
   * Handle submit task request
   */
  private async handleSubmitTask(params: any): Promise<any> {
    const { agentType, taskId, taskType, parameters, priority } = params;
    
    // Validate agent type
    if (!this.agents.has(agentType)) {
      throw new Error(`Agent type not found: ${agentType}`);
    }
    
    // Create task info
    const taskInfo: TaskInfo = {
      id: taskId,
      agentType,
      taskType,
      parameters,
      priority,
      status: 'pending',
      submittedAt: new Date()
    };
    
    // Store task info
    this.taskInfoMap.set(taskId, taskInfo);
    
    // Add to task queue
    this.taskQueue.enqueue(taskId, priority);
    
    this.logger(`Task ${taskId} of type ${taskType} submitted for agent ${agentType}`);
    
    // If processing is paused, return immediately
    if (this.processingPaused) {
      return {
        taskId,
        status: 'pending',
        message: 'Task queued, but processing is currently paused'
      };
    }
    
    // Process tasks immediately
    this.processTasks();
    
    return {
      taskId,
      status: 'pending',
      message: 'Task submitted successfully'
    };
  }
  
  /**
   * Handle cancel task request
   */
  private async handleCancelTask(params: any): Promise<any> {
    const { taskId } = params;
    
    // Check if task exists
    if (!this.taskInfoMap.has(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const taskInfo = this.taskInfoMap.get(taskId);
    
    // Check if task can be cancelled
    if (taskInfo.status !== 'pending' && taskInfo.status !== 'assigned') {
      throw new Error(`Cannot cancel task with status ${taskInfo.status}`);
    }
    
    // If the task is still in the queue, remove it
    if (taskInfo.status === 'pending') {
      this.taskQueue.remove(taskId);
    }
    
    // If the task is assigned to an agent, cancel it
    if (taskInfo.status === 'assigned' && taskInfo.assignedAgent) {
      // Send cancel message to agent
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: taskInfo.assignedAgent,
        messageType: MessageType.TASK_CANCEL,
        priority: Priority.HIGH,
        requiresResponse: false,
        payload: { taskId }
      });
    }
    
    // Update task status
    taskInfo.status = 'cancelled';
    taskInfo.completedAt = new Date();
    
    this.logger(`Task ${taskId} cancelled`);
    
    return {
      taskId,
      status: 'cancelled',
      message: 'Task cancelled successfully'
    };
  }
  
  /**
   * Handle get task status request
   */
  private async handleGetTaskStatus(params: any): Promise<any> {
    const { taskId } = params;
    
    // Check if task exists
    if (!this.taskInfoMap.has(taskId)) {
      return null; // Task not found
    }
    
    const taskInfo = this.taskInfoMap.get(taskId);
    
    return {
      taskId: taskInfo.id,
      agentType: taskInfo.agentType,
      taskType: taskInfo.taskType,
      status: taskInfo.status,
      submittedAt: taskInfo.submittedAt,
      startedAt: taskInfo.startedAt,
      completedAt: taskInfo.completedAt,
      result: taskInfo.result,
      error: taskInfo.error
    };
  }
  
  /**
   * Handle get agent status request
   */
  private async handleGetAgentStatus(params: any): Promise<any> {
    const { agentType } = params;
    
    // Check if agent exists
    if (!this.agents.has(agentType)) {
      return null; // Agent not found
    }
    
    // Get agent status
    const agent = this.agents.get(agentType);
    const status = agent.getStatus();
    
    // Count tasks for this agent
    const agentTasks = Array.from(this.taskInfoMap.values())
      .filter(task => task.agentType === agentType);
    
    const pendingTasks = agentTasks.filter(task => task.status === 'pending').length;
    const processingTasks = agentTasks.filter(task => 
      task.status === 'assigned' || task.status === 'processing'
    ).length;
    const completedTasks = agentTasks.filter(task => task.status === 'completed').length;
    const failedTasks = agentTasks.filter(task => task.status === 'failed').length;
    const cancelledTasks = agentTasks.filter(task => task.status === 'cancelled').length;
    
    return {
      agentType,
      status: status.status,
      metrics: {
        ...status.metrics,
        mcp_metrics: {
          pendingTasks,
          processingTasks,
          completedTasks,
          failedTasks,
          cancelledTasks,
          totalTasks: agentTasks.length
        }
      }
    };
  }
  
  /**
   * Handle get system status request
   */
  private async handleGetSystemStatus(params: any): Promise<any> {
    const agentStatuses = {};
    
    // Get status for all agents
    for (const [agentType, agent] of this.agents.entries()) {
      agentStatuses[agentType] = agent.getStatus();
    }
    
    // Count tasks by status
    const pendingTasks = Array.from(this.taskInfoMap.values())
      .filter(task => task.status === 'pending').length;
    const assignedTasks = Array.from(this.taskInfoMap.values())
      .filter(task => task.status === 'assigned').length;
    const processingTasks = Array.from(this.taskInfoMap.values())
      .filter(task => task.status === 'processing').length;
    const completedTasks = Array.from(this.taskInfoMap.values())
      .filter(task => task.status === 'completed').length;
    const failedTasks = Array.from(this.taskInfoMap.values())
      .filter(task => task.status === 'failed').length;
    const cancelledTasks = Array.from(this.taskInfoMap.values())
      .filter(task => task.status === 'cancelled').length;
    
    // Get task counts by agent
    const tasksByAgent = {};
    for (const agentType of this.agents.keys()) {
      const agentTasks = Array.from(this.taskInfoMap.values())
        .filter(task => task.agentType === agentType);
      
      tasksByAgent[agentType] = {
        pending: agentTasks.filter(task => task.status === 'pending').length,
        assigned: agentTasks.filter(task => task.status === 'assigned').length,
        processing: agentTasks.filter(task => task.status === 'processing').length,
        completed: agentTasks.filter(task => task.status === 'completed').length,
        failed: agentTasks.filter(task => task.status === 'failed').length,
        cancelled: agentTasks.filter(task => task.status === 'cancelled').length,
        total: agentTasks.length
      };
    }
    
    // Calculate average processing time
    const completedTasksArray = Array.from(this.taskInfoMap.values())
      .filter(task => task.status === 'completed' && task.startedAt && task.completedAt);
    
    let avgProcessingTime = 0;
    if (completedTasksArray.length > 0) {
      const totalProcessingTime = completedTasksArray.reduce((sum, task) => {
        return sum + (task.completedAt!.getTime() - task.startedAt!.getTime());
      }, 0);
      
      avgProcessingTime = totalProcessingTime / completedTasksArray.length;
    }
    
    return {
      status: this.running ? 'running' : 'stopped',
      processingPaused: this.processingPaused,
      queueSize: this.taskQueue.size,
      taskCounts: {
        pending: pendingTasks,
        assigned: assignedTasks,
        processing: processingTasks,
        completed: completedTasks,
        failed: failedTasks,
        cancelled: cancelledTasks,
        total: this.taskInfoMap.size
      },
      tasksByAgent,
      agentCount: this.agents.size,
      agents: agentStatuses,
      metrics: {
        avgProcessingTime,
        uptime: this.startTime > 0 ? Date.now() - this.startTime : 0
      }
    };
  }
  
  /**
   * Handle pause processing request
   */
  private async handlePauseProcessing(params: any): Promise<any> {
    if (this.processingPaused) {
      return { 
        status: 'already_paused',
        message: 'Task processing is already paused'
      };
    }
    
    this.processingPaused = true;
    this.logger("Task processing paused");
    
    return { 
      status: 'paused',
      message: 'Task processing paused successfully'
    };
  }
  
  /**
   * Handle resume processing request
   */
  private async handleResumeProcessing(params: any): Promise<any> {
    if (!this.processingPaused) {
      return { 
        status: 'not_paused',
        message: 'Task processing is not paused'
      };
    }
    
    this.processingPaused = false;
    this.logger("Task processing resumed");
    
    // Process pending tasks
    this.processTasks();
    
    return { 
      status: 'resumed',
      message: 'Task processing resumed successfully'
    };
  }
  
  /**
   * Handle specialized messages
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    switch (message.messageType) {
      case MessageType.TASK_RESPONSE:
        await this.handleTaskResponse(message);
        break;
        
      case MessageType.AGENT_REGISTRATION:
        await this.handleAgentRegistration(message);
        break;
        
      default:
        await super.handleSpecializedMessage(message);
    }
  }
  
  /**
   * Handle task response from an agent
   */
  private async handleTaskResponse(message: AgentMessage): Promise<void> {
    const { taskId, status, result, errorDetails } = message.payload;
    
    // Check if task exists
    if (!this.taskInfoMap.has(taskId)) {
      this.logger(`Received response for unknown task: ${taskId}`);
      return;
    }
    
    const taskInfo = this.taskInfoMap.get(taskId);
    
    // Update task info
    if (status === 'success') {
      taskInfo.status = 'completed';
      taskInfo.result = result;
      taskInfo.completedAt = new Date();
      
      this.logger(`Task ${taskId} completed successfully`);
    } else if (status === 'error') {
      taskInfo.status = 'failed';
      taskInfo.error = errorDetails;
      taskInfo.completedAt = new Date();
      
      this.logger(`Task ${taskId} failed: ${errorDetails.message}`);
    } else if (status === 'cancelled') {
      taskInfo.status = 'cancelled';
      taskInfo.completedAt = new Date();
      
      this.logger(`Task ${taskId} cancelled by agent ${message.source}`);
    }
    
    // Process next tasks
    if (!this.processingPaused) {
      this.processTasks();
    }
  }
  
  /**
   * Handle agent registration
   */
  private async handleAgentRegistration(message: AgentMessage): Promise<void> {
    const { agentType, capabilities } = message.payload;
    
    this.logger(`Agent registration request received: ${agentType}`);
    
    // TODO: Implement dynamic agent registration
    
    // Send response
    this.communicationBus.publish({
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.type,
      destination: message.source,
      messageType: MessageType.AGENT_REGISTRATION_RESPONSE,
      priority: Priority.MEDIUM,
      requiresResponse: false,
      correlationId: message.messageId,
      payload: {
        status: 'success',
        message: 'Agent registered successfully'
      }
    });
  }
  
  /**
   * Start the task processing loop
   */
  private startTaskProcessing(): void {
    if (this.processingInterval !== null) {
      return; // Already running
    }
    
    this.processingPaused = false;
    
    // Process tasks immediately
    this.processTasks();
    
    // Set up interval for periodic task processing
    this.processingInterval = setInterval(() => {
      if (!this.processingPaused) {
        this.processTasks();
      }
    }, 1000); // Check queue every second
    
    this.logger("Task processing started");
  }
  
  /**
   * Stop the task processing loop
   */
  private stopTaskProcessing(): void {
    if (this.processingInterval === null) {
      return; // Not running
    }
    
    clearInterval(this.processingInterval);
    this.processingInterval = null;
    this.processingPaused = true;
    
    this.logger("Task processing stopped");
  }
  
  /**
   * Process tasks in the queue
   */
  private async processTasks(): Promise<void> {
    if (this.processingPaused || !this.running) {
      return;
    }
    
    // Check if there are tasks in the queue
    if (this.taskQueue.isEmpty()) {
      return;
    }
    
    // Process up to 10 tasks at once
    for (let i = 0; i < 10; i++) {
      if (this.taskQueue.isEmpty()) {
        break;
      }
      
      // Get next task from queue
      const taskId = this.taskQueue.dequeue();
      if (!taskId) {
        break;
      }
      
      // Check if task exists
      if (!this.taskInfoMap.has(taskId)) {
        this.logger(`Task ${taskId} not found in taskInfoMap`);
        continue;
      }
      
      const taskInfo = this.taskInfoMap.get(taskId)!;
      
      // Check if the target agent exists
      if (!this.agents.has(taskInfo.agentType)) {
        this.logger(`Agent ${taskInfo.agentType} not found for task ${taskId}`);
        
        // Update task status
        taskInfo.status = 'failed';
        taskInfo.error = { message: `Agent ${taskInfo.agentType} not found` };
        taskInfo.completedAt = new Date();
        
        continue;
      }
      
      // Assign task to agent
      const agent = this.agents.get(taskInfo.agentType)!;
      
      // Update task status
      taskInfo.status = 'assigned';
      taskInfo.assignedAgent = taskInfo.agentType;
      taskInfo.startedAt = new Date();
      
      this.logger(`Assigning task ${taskId} to agent ${taskInfo.agentType}`);
      
      // Send task to agent
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: taskInfo.agentType,
        messageType: MessageType.TASK_REQUEST,
        priority: taskInfo.priority,
        requiresResponse: true,
        payload: {
          taskId: taskInfo.id,
          taskType: taskInfo.taskType,
          parameters: taskInfo.parameters
        }
      });
    }
  }
  
  /**
   * Handle status update message
   * Override to prevent sending status update to self
   */
  private async handleStatusUpdate(message: AgentMessage): Promise<void> {
    // Only handle status updates from other agents
    if (message.source !== this.type) {
      // Store agent status
      const { status, metrics } = message.payload;
      
      this.logger(`Received status update from ${message.source}: ${status}`);
      
      // If agent is not registered, register it
      if (!this.agents.has(message.source)) {
        this.logger(`Agent ${message.source} is not registered, ignoring status update`);
      }
      
      // Send response if required
      if (message.requiresResponse) {
        this.communicationBus.publish({
          messageId: AgentCommunicationBus.createMessageId(),
          timestamp: new Date(),
          source: this.type,
          destination: message.source,
          messageType: MessageType.STATUS_UPDATE_RESPONSE,
          priority: Priority.LOW,
          requiresResponse: false,
          correlationId: message.messageId,
          payload: { received: true }
        });
      }
    }
  }
}