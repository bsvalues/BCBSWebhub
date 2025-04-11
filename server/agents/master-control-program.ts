import { 
  AgentType, 
  AgentMessage, 
  MessageType, 
  Priority,
  StatusCode, 
  AgentCommunicationBus,
  TaskMessage
} from "@shared/protocols/agent-communication";
import { BaseAgent, Agent, Task } from "./base-agent";
import { DataValidationAgent } from "./data-validation-agent";
import { ValuationAgent } from "./valuation-agent";
import { PriorityQueue } from "../utils/priority-queue";

// Interface for task tracking
interface TaskInfo {
  task: Task;
  destinationAgent: AgentType;
  responseRequired: boolean;
  messageId?: string;
  source?: string;
  submittedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'assigned' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: any;
}

/**
 * Master Control Program (MCP)
 * 
 * Central orchestrator for the multi-agent AI architecture.
 * Manages agent lifecycle, task distribution, and inter-agent communication.
 */
export class MasterControlProgram extends BaseAgent {
  private agents: Map<AgentType | string, Agent>;
  private taskQueue: PriorityQueue<TaskInfo>;
  private taskRegistry: Map<string, TaskInfo>;
  private agentStatus: Map<AgentType | string, { status: string; lastSeen: Date; metrics: any }>;
  
  constructor(communicationBus: AgentCommunicationBus) {
    super(
      AgentType.MCP, 
      [
        'agent_orchestration',
        'task_distribution',
        'workflow_management',
        'system_monitoring',
        'cross_agent_coordination'
      ],
      communicationBus
    );
    
    this.agents = new Map();
    this.taskQueue = new PriorityQueue<TaskInfo>((a, b) => {
      // Priority comparison function
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      
      // First compare by priority
      const priorityDiff = priorityOrder[a.task.priority] - priorityOrder[b.task.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // Then by submission time (FIFO)
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });
    this.taskRegistry = new Map();
    this.agentStatus = new Map();
  }
  
  /**
   * Initialize the MCP and all managed agents
   */
  public async initialize(): Promise<void> {
    if (this.running) {
      return;
    }
    
    // Initialize MCP first
    await super.initialize();
    
    // Create and initialize specialized agents
    this.registerAgent(new DataValidationAgent(this.communicationBus));
    this.registerAgent(new ValuationAgent(this.communicationBus));
    
    // Initialize all registered agents
    const initPromises = Array.from(this.agents.values()).map(agent => agent.initialize());
    await Promise.all(initPromises);
    
    this.logger('Master Control Program initialized with agents:', 
      Array.from(this.agents.keys()));
    
    // Start task processing
    this.processTaskQueue();
    
    // Start periodic agent status checks
    this.startAgentStatusChecks();
  }
  
  /**
   * Shutdown the MCP and all managed agents
   */
  public async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }
    
    // Shutdown all registered agents
    const shutdownPromises = Array.from(this.agents.values()).map(agent => agent.shutdown());
    await Promise.all(shutdownPromises);
    
    // Clear data structures
    this.agents.clear();
    this.taskQueue.clear();
    this.taskRegistry.clear();
    this.agentStatus.clear();
    
    // Shutdown MCP last
    await super.shutdown();
    
    this.logger('Master Control Program shutdown complete');
  }
  
  /**
   * Register a new agent with the MCP
   */
  public registerAgent(agent: Agent): void {
    this.agents.set(agent.type, agent);
    this.agentStatus.set(agent.type, {
      status: 'registered',
      lastSeen: new Date(),
      metrics: {}
    });
    
    this.logger(`Registered agent: ${agent.type} with capabilities: ${agent.capabilities.join(', ')}`);
  }
  
  /**
   * Unregister an agent from the MCP
   */
  public unregisterAgent(agentType: AgentType | string): void {
    const agent = this.agents.get(agentType);
    if (agent) {
      this.agents.delete(agentType);
      this.agentStatus.delete(agentType);
      this.logger(`Unregistered agent: ${agentType}`);
    }
  }
  
  /**
   * Execute a task assigned to the MCP
   */
  protected async executeTask(task: Task): Promise<any> {
    switch (task.type) {
      case 'submit_task':
        return this.submitTask(task.parameters);
        
      case 'cancel_task':
        return this.cancelTask(task.parameters.taskId);
        
      case 'get_task_status':
        return this.getTaskStatus(task.parameters.taskId);
        
      case 'get_agent_status':
        return this.getAgentStatus(task.parameters.agentType);
        
      case 'get_system_status':
        return this.getSystemStatus();
        
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }
  
  /**
   * Handle specialized messages specific to the MCP
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    switch (message.messageType) {
      case MessageType.TASK_RESPONSE:
        await this.handleTaskResponse(message);
        break;
        
      case MessageType.STATUS_UPDATE:
        await this.handleStatusUpdate(message);
        break;
        
      default:
        this.logger(`Unhandled message type ${message.messageType} in MCP`);
    }
  }
  
  /**
   * Handle task response messages from agents
   */
  private async handleTaskResponse(message: AgentMessage): Promise<void> {
    const { taskId, status, result, errorDetails } = message.payload;
    
    // Find the task in the registry
    const taskInfo = this.taskRegistry.get(taskId);
    if (!taskInfo) {
      this.logger(`Received response for unknown task ID: ${taskId}`);
      return;
    }
    
    // Update task status
    taskInfo.completedAt = new Date();
    taskInfo.status = status === StatusCode.SUCCESS ? 'completed' : 'failed';
    taskInfo.result = result;
    taskInfo.error = errorDetails;
    
    this.logger(`Task ${taskId} completed with status: ${status}`);
    
    // If this task was submitted by an external source that requires a response
    if (taskInfo.responseRequired && taskInfo.source) {
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: taskInfo.source,
        messageType: MessageType.TASK_RESPONSE,
        priority: taskInfo.task.priority,
        requiresResponse: false,
        correlationId: taskInfo.messageId,
        payload: {
          taskId,
          status,
          result,
          errorDetails,
          metrics: {
            processingTimeMs: taskInfo.completedAt.getTime() - taskInfo.submittedAt.getTime()
          }
        }
      });
    }
  }
  
  /**
   * Handle status update messages from agents
   */
  private async handleStatusUpdate(message: AgentMessage): Promise<void> {
    const agentType = message.source;
    const status = message.payload;
    
    // Update agent status
    this.agentStatus.set(agentType, {
      status: status.status,
      lastSeen: new Date(),
      metrics: status.metrics
    });
    
    // No need to log every status update as it would be too verbose
  }
  
  /**
   * Submit a task to be executed by an appropriate agent
   */
  private async submitTask(params: {
    taskType: string;
    parameters: any;
    destinationAgent?: AgentType;
    priority?: Priority;
    responseRequired?: boolean;
    source?: string;
    messageId?: string;
  }): Promise<{ taskId: string; status: string }> {
    const { 
      taskType, 
      parameters, 
      destinationAgent, 
      priority = Priority.MEDIUM,
      responseRequired = true,
      source,
      messageId
    } = params;
    
    // Generate task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create task
    const task: Task = {
      id: taskId,
      type: taskType,
      parameters,
      priority,
      status: 'pending'
    };
    
    // Find appropriate agent if not specified
    let targetAgent: AgentType | undefined = destinationAgent;
    if (!targetAgent) {
      targetAgent = this.findAgentForTask(taskType, parameters);
      if (!targetAgent) {
        throw new Error(`No suitable agent found for task type: ${taskType}`);
      }
    }
    
    // Create task info
    const taskInfo: TaskInfo = {
      task,
      destinationAgent: targetAgent,
      responseRequired,
      source,
      messageId,
      submittedAt: new Date(),
      status: 'pending'
    };
    
    // Register task
    this.taskRegistry.set(taskId, taskInfo);
    
    // Add to queue - will be picked up by task processor
    this.taskQueue.enqueue(taskInfo);
    
    this.logger(`Task ${taskId} submitted for ${targetAgent} with priority ${priority}`);
    
    return {
      taskId,
      status: 'pending'
    };
  }
  
  /**
   * Cancel a task
   */
  private async cancelTask(taskId: string): Promise<{ taskId: string; status: string }> {
    const taskInfo = this.taskRegistry.get(taskId);
    if (!taskInfo) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    if (taskInfo.status === 'completed' || taskInfo.status === 'failed') {
      throw new Error(`Cannot cancel task with status: ${taskInfo.status}`);
    }
    
    // If already assigned to an agent, send cancellation message
    if (taskInfo.status === 'assigned') {
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: taskInfo.destinationAgent,
        messageType: MessageType.TASK_CANCEL,
        priority: Priority.HIGH,
        requiresResponse: true,
        payload: {
          taskId
        }
      });
    }
    
    // Update task status
    taskInfo.status = 'cancelled';
    taskInfo.completedAt = new Date();
    
    this.logger(`Task ${taskId} cancelled`);
    
    return {
      taskId,
      status: 'cancelled'
    };
  }
  
  /**
   * Get the status of a task
   */
  private getTaskStatus(taskId: string): any {
    const taskInfo = this.taskRegistry.get(taskId);
    if (!taskInfo) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    return {
      taskId,
      taskType: taskInfo.task.type,
      agent: taskInfo.destinationAgent,
      status: taskInfo.status,
      submittedAt: taskInfo.submittedAt,
      completedAt: taskInfo.completedAt,
      processingTimeMs: taskInfo.completedAt ? 
        taskInfo.completedAt.getTime() - taskInfo.submittedAt.getTime() : undefined,
      result: taskInfo.result,
      error: taskInfo.error
    };
  }
  
  /**
   * Get the status of a specific agent
   */
  private getAgentStatus(agentType: AgentType): any {
    if (!this.agents.has(agentType)) {
      throw new Error(`Agent not found: ${agentType}`);
    }
    
    const agent = this.agents.get(agentType)!;
    const status = agent.getStatus();
    const lastSeen = this.agentStatus.get(agentType)?.lastSeen || new Date();
    
    // Get tasks for this agent
    const pendingTasks = Array.from(this.taskRegistry.values())
      .filter(t => t.destinationAgent === agentType && t.status === 'pending')
      .length;
    
    const assignedTasks = Array.from(this.taskRegistry.values())
      .filter(t => t.destinationAgent === agentType && t.status === 'assigned')
      .length;
    
    const completedTasks = Array.from(this.taskRegistry.values())
      .filter(t => t.destinationAgent === agentType && t.status === 'completed')
      .length;
    
    return {
      agentType,
      status: status.status,
      lastSeen,
      capabilities: agent.capabilities,
      metrics: status.metrics,
      tasks: {
        pending: pendingTasks,
        assigned: assignedTasks,
        completed: completedTasks
      }
    };
  }
  
  /**
   * Get the status of the entire system
   */
  private getSystemStatus(): any {
    const agentStatuses = Array.from(this.agents.keys()).map(agentType => 
      this.getAgentStatus(agentType as AgentType)
    );
    
    // Task statistics
    const totalTasks = this.taskRegistry.size;
    const pendingTasks = Array.from(this.taskRegistry.values())
      .filter(t => t.status === 'pending').length;
    const assignedTasks = Array.from(this.taskRegistry.values())
      .filter(t => t.status === 'assigned').length;
    const completedTasks = Array.from(this.taskRegistry.values())
      .filter(t => t.status === 'completed').length;
    const failedTasks = Array.from(this.taskRegistry.values())
      .filter(t => t.status === 'failed').length;
    
    return {
      status: this.running ? 'running' : 'stopped',
      agents: {
        total: this.agents.size,
        running: agentStatuses.filter(status => status.status === 'running').length,
        statuses: agentStatuses
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        assigned: assignedTasks,
        completed: completedTasks,
        failed: failedTasks
      },
      uptime: this.running ? Date.now() - Math.min(
        ...agentStatuses.map(status => status.lastSeen.getTime())
      ) : 0,
      timestamp: new Date()
    };
  }
  
  /**
   * Find an appropriate agent for a task based on its type
   */
  private findAgentForTask(taskType: string, parameters: any): AgentType | undefined {
    // Define task types and which agent should handle them
    const taskTypeToAgent: Record<string, AgentType> = {
      // Data validation tasks
      'validate_property': AgentType.DATA_VALIDATION,
      'analyze_data_quality': AgentType.DATA_VALIDATION,
      'generate_data_recommendations': AgentType.DATA_VALIDATION,
      'validate_property_batch': AgentType.DATA_VALIDATION,
      
      // Valuation tasks
      'calculate_property_value': AgentType.VALUATION,
      'find_comparable_properties': AgentType.VALUATION,
      'detect_valuation_anomalies': AgentType.VALUATION,
      'analyze_property_trend': AgentType.VALUATION,
      'batch_valuation': AgentType.VALUATION,
      
      // MCP tasks - handled by the MCP itself
      'submit_task': AgentType.MCP,
      'cancel_task': AgentType.MCP,
      'get_task_status': AgentType.MCP,
      'get_agent_status': AgentType.MCP,
      'get_system_status': AgentType.MCP,
    };
    
    // Direct mapping of task type to agent
    if (taskTypeToAgent[taskType]) {
      return taskTypeToAgent[taskType];
    }
    
    // For more complex determination, use agent capabilities
    // This could be extended based on task type, parameters, etc.
    
    return undefined;
  }
  
  /**
   * Process tasks in the task queue
   */
  private processTaskQueue(): void {
    if (!this.running) {
      return;
    }
    
    setImmediate(async () => {
      try {
        // Process tasks in the queue
        if (!this.taskQueue.isEmpty()) {
          const taskInfo = this.taskQueue.peek();
          
          // Check if agent is available
          const agent = this.agents.get(taskInfo.destinationAgent);
          if (agent) {
            const agentStatus = this.agentStatus.get(taskInfo.destinationAgent);
            
            // Only assign if agent is running
            if (agentStatus && agentStatus.status === 'running') {
              // Dequeue task
              this.taskQueue.dequeue();
              
              // Update task status
              taskInfo.status = 'assigned';
              
              // Send task to agent
              this.assignTaskToAgent(taskInfo);
            }
          }
        }
      } catch (error) {
        this.logger('Error in task queue processing:', error);
      }
      
      // Continue processing
      this.processTaskQueue();
    });
  }
  
  /**
   * Assign a task to an agent
   */
  private assignTaskToAgent(taskInfo: TaskInfo): void {
    const { task, destinationAgent } = taskInfo;
    
    this.logger(`Assigning task ${task.id} to ${destinationAgent}`);
    
    // Send task request message to agent
    this.communicationBus.publish({
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.type,
      destination: destinationAgent,
      messageType: MessageType.TASK_REQUEST,
      priority: task.priority,
      requiresResponse: true,
      payload: {
        taskId: task.id,
        taskType: task.type,
        parameters: task.parameters,
        requiredCapabilities: []
      }
    } as TaskMessage);
  }
  
  /**
   * Start periodic agent status checks
   */
  private startAgentStatusChecks(): void {
    if (!this.running) {
      return;
    }
    
    const checkInterval = 30000; // 30 seconds
    
    const performStatusCheck = () => {
      if (!this.running) {
        return;
      }
      
      // Send status requests to all agents
      for (const agentType of this.agents.keys()) {
        this.communicationBus.publish({
          messageId: AgentCommunicationBus.createMessageId(),
          timestamp: new Date(),
          source: this.type,
          destination: agentType,
          messageType: MessageType.STATUS_UPDATE,
          priority: Priority.LOW,
          requiresResponse: true,
          payload: {}
        });
      }
      
      // Schedule next check
      setTimeout(performStatusCheck, checkInterval);
    };
    
    // Start status checks
    setTimeout(performStatusCheck, checkInterval);
  }
}