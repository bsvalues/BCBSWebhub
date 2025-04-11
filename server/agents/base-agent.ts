import { 
  AgentType, 
  AgentMessage, 
  MessageType, 
  Priority,
  AgentCommunicationBus,
  AgentStatus,
  Task,
  Agent
} from "@shared/protocols/agent-communication";

/**
 * Base Agent Class
 * 
 * Provides common functionality for all agents in the system.
 * All specialized agents should extend this class.
 */
export abstract class BaseAgent implements Agent {
  protected running: boolean = false;
  protected tasks: Map<string, Task> = new Map();
  protected startTime: number = 0;
  protected lastActivityTime: number = 0;
  protected unsubscribeFunction: (() => void) | null = null;
  
  public readonly type: string;
  public readonly capabilities: string[];
  public readonly communicationBus: AgentCommunicationBus;
  
  /**
   * Constructor
   */
  constructor(type: string, capabilities: string[], communicationBus: AgentCommunicationBus) {
    this.type = type;
    this.capabilities = capabilities || [];
    this.communicationBus = communicationBus;
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    if (this.running) {
      return;
    }
    
    this.startTime = Date.now();
    this.lastActivityTime = this.startTime;
    this.running = true;
    
    // Subscribe to messages
    this.unsubscribeFunction = this.communicationBus.subscribe(
      this.type, 
      this.handleMessage.bind(this)
    );
    
    this.logger(`Agent initialized: ${this.type}`);
    
    // Send registration message
    await this.sendRegistration();
    
    // Start status updates
    this.startStatusUpdates();
  }
  
  /**
   * Shutdown the agent
   */
  public async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }
    
    this.running = false;
    
    // Unsubscribe from messages
    if (this.unsubscribeFunction) {
      this.unsubscribeFunction();
      this.unsubscribeFunction = null;
    }
    
    // Clean up any pending tasks
    for (const task of this.tasks.values()) {
      if (!task.completedAt) {
        task.completedAt = new Date();
        task.error = { message: 'Agent shutdown' };
      }
    }
    
    this.logger(`Agent shutdown: ${this.type}`);
  }
  
  /**
   * Get the agent's status
   */
  public getStatus(): AgentStatus {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(t => !t.assignedAt && !t.completedAt).length;
    
    const processingTasks = Array.from(this.tasks.values())
      .filter(t => t.assignedAt && !t.completedAt).length;
    
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.completedAt && !t.error).length;
    
    const failedTasks = Array.from(this.tasks.values())
      .filter(t => t.completedAt && t.error).length;
    
    return {
      status: this.running ? 'running' : 'stopped',
      uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      taskCount: {
        pending: pendingTasks,
        processing: processingTasks,
        completed: completedTasks,
        failed: failedTasks
      },
      lastActiveTime: new Date(this.lastActivityTime),
      metrics: this.getMetrics()
    };
  }
  
  /**
   * Send a message
   */
  public sendMessage(message: AgentMessage): void {
    this.communicationBus.publish(message);
    this.lastActivityTime = Date.now();
  }
  
  /**
   * Add a task to the agent
   */
  public async addTask(task: Task): Promise<void> {
    if (!this.running) {
      throw new Error(`Agent not running: ${this.type}`);
    }
    
    // Store the task
    this.tasks.set(task.id, task);
    this.lastActivityTime = Date.now();
    
    // Process the task
    try {
      // Mark as assigned
      task.assignedAt = new Date();
      
      // Execute the task
      const result = await this.executeTask(task);
      
      // Mark as completed
      task.completedAt = new Date();
      task.result = result;
    } catch (error) {
      // Mark as failed
      task.completedAt = new Date();
      task.error = {
        message: error.message || 'Unknown error',
        stack: error.stack,
        details: error
      };
      
      this.logger(`Task execution failed: ${task.id} - ${error.message}`);
    }
  }
  
  /**
   * Execute a task (abstract method to be implemented by subclasses)
   */
  protected abstract executeTask(task: Task): Promise<any>;
  
  /**
   * Handle a message from the communication bus
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    this.lastActivityTime = Date.now();
    
    try {
      // Process system messages
      switch (message.messageType) {
        case MessageType.STATUS_UPDATE:
          await this.handleStatusUpdate(message);
          break;
          
        case MessageType.ERROR_REPORT:
          await this.handleErrorReport(message);
          break;
          
        case MessageType.HEARTBEAT:
          await this.handleHeartbeat(message);
          break;
          
        case MessageType.SHUTDOWN:
          await this.handleShutdown(message);
          break;
          
        case MessageType.TASK_REQUEST:
          await this.handleTaskRequest(message);
          break;
          
        case MessageType.TASK_CANCEL:
          await this.handleTaskCancel(message);
          break;
          
        default:
          // Let the specialized agent handle it
          await this.handleSpecializedMessage(message);
      }
    } catch (error) {
      this.logger(`Error handling message: ${error.message}`);
      
      // Send error response if response is required
      if (message.requiresResponse) {
        this.sendMessage({
          messageId: AgentCommunicationBus.createMessageId(),
          timestamp: new Date(),
          source: this.type,
          destination: message.source,
          messageType: MessageType.ERROR_REPORT,
          priority: Priority.HIGH,
          requiresResponse: false,
          correlationId: message.messageId,
          payload: {
            error: error.message || 'Unknown error',
            details: error
          }
        });
      }
    }
  }
  
  /**
   * Handle specialized messages (to be implemented by subclasses)
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    // Default implementation just logs the message
    this.logger(`Unhandled message type: ${message.messageType}`);
  }
  
  /**
   * Handle status update message
   */
  protected async handleStatusUpdate(message: AgentMessage): Promise<void> {
    // Just acknowledge receipt if response is required
    if (message.requiresResponse) {
      this.sendMessage({
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
  
  /**
   * Handle error report message
   */
  protected async handleErrorReport(message: AgentMessage): Promise<void> {
    const { error, details } = message.payload;
    this.logger(`Error report from ${message.source}: ${error}`);
    
    // Just acknowledge receipt if response is required
    if (message.requiresResponse) {
      this.sendMessage({
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
  
  /**
   * Handle heartbeat message
   */
  protected async handleHeartbeat(message: AgentMessage): Promise<void> {
    // Just send back a heartbeat response
    if (message.requiresResponse) {
      this.sendMessage({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.HEARTBEAT,
        priority: Priority.LOW,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: { timestamp: new Date() }
      });
    }
  }
  
  /**
   * Handle shutdown message
   */
  protected async handleShutdown(message: AgentMessage): Promise<void> {
    this.logger(`Shutdown requested by ${message.source}`);
    
    // Acknowledge receipt before shutting down
    if (message.requiresResponse) {
      this.sendMessage({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.STATUS_UPDATE,
        priority: Priority.HIGH,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: { 
          status: 'stopping',
          message: 'Shutdown in progress'
        }
      });
    }
    
    // Shut down the agent
    await this.shutdown();
  }
  
  /**
   * Handle task request message
   */
  protected async handleTaskRequest(message: AgentMessage): Promise<void> {
    const { taskId, taskType, parameters } = message.payload;
    
    this.logger(`Task request received: ${taskType} (${taskId})`);
    
    // Create a new task
    const task: Task = {
      id: taskId,
      type: taskType,
      parameters: parameters || {},
      priority: message.priority,
      createdAt: new Date()
    };
    
    try {
      // Execute the task
      await this.addTask(task);
      
      // Send response
      this.sendMessage({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.TASK_RESPONSE,
        priority: message.priority,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: {
          taskId,
          status: task.error ? 'error' : 'success',
          result: task.result,
          errorDetails: task.error
        }
      });
    } catch (error) {
      // Send error response
      this.sendMessage({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.TASK_RESPONSE,
        priority: message.priority,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: {
          taskId,
          status: 'error',
          errorDetails: {
            message: error.message || 'Unknown error',
            stack: error.stack,
            details: error
          }
        }
      });
    }
  }
  
  /**
   * Handle task cancel message
   */
  protected async handleTaskCancel(message: AgentMessage): Promise<void> {
    const { taskId } = message.payload;
    
    this.logger(`Task cancellation requested: ${taskId}`);
    
    // Check if we have this task
    if (this.tasks.has(taskId)) {
      const task = this.tasks.get(taskId)!;
      
      // If it's not completed yet, mark it as cancelled
      if (!task.completedAt) {
        task.completedAt = new Date();
        task.error = { message: 'Task cancelled' };
        
        this.logger(`Task cancelled: ${taskId}`);
      }
      
      // Send response
      if (message.requiresResponse) {
        this.sendMessage({
          messageId: AgentCommunicationBus.createMessageId(),
          timestamp: new Date(),
          source: this.type,
          destination: message.source,
          messageType: MessageType.TASK_RESPONSE,
          priority: message.priority,
          requiresResponse: false,
          correlationId: message.messageId,
          payload: {
            taskId,
            status: 'cancelled'
          }
        });
      }
    } else {
      // Task not found
      if (message.requiresResponse) {
        this.sendMessage({
          messageId: AgentCommunicationBus.createMessageId(),
          timestamp: new Date(),
          source: this.type,
          destination: message.source,
          messageType: MessageType.TASK_RESPONSE,
          priority: message.priority,
          requiresResponse: false,
          correlationId: message.messageId,
          payload: {
            taskId,
            status: 'error',
            errorDetails: { message: 'Task not found' }
          }
        });
      }
    }
  }
  
  /**
   * Send registration message
   */
  protected async sendRegistration(): Promise<void> {
    this.sendMessage({
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.type,
      destination: AgentType.MCP,
      messageType: MessageType.AGENT_REGISTRATION,
      priority: Priority.HIGH,
      requiresResponse: true,
      payload: {
        agentType: this.type,
        capabilities: this.capabilities,
        status: 'running'
      }
    });
  }
  
  /**
   * Start periodic status updates
   */
  protected startStatusUpdates(): void {
    // Send an initial status update
    this.sendStatusUpdate();
    
    // Schedule periodic status updates (every 30 seconds)
    setInterval(() => {
      if (this.running) {
        this.sendStatusUpdate();
      }
    }, 30000);
  }
  
  /**
   * Send a status update
   */
  protected sendStatusUpdate(): void {
    this.sendMessage({
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.type,
      destination: AgentType.MCP,
      messageType: MessageType.STATUS_UPDATE,
      priority: Priority.LOW,
      requiresResponse: false,
      payload: this.getStatus()
    });
  }
  
  /**
   * Get additional metrics
   */
  protected getMetrics(): any {
    return {
      taskQueueLength: this.tasks.size,
      pendingTasks: Array.from(this.tasks.values())
        .filter(t => !t.assignedAt && !t.completedAt).length,
      processingTasks: Array.from(this.tasks.values())
        .filter(t => t.assignedAt && !t.completedAt).length,
      completedTasks: Array.from(this.tasks.values())
        .filter(t => t.completedAt && !t.error).length,
      failedTasks: Array.from(this.tasks.values())
        .filter(t => t.completedAt && t.error).length,
      avgTaskDuration: this.calculateAverageTaskDuration()
    };
  }
  
  /**
   * Calculate average task duration
   */
  protected calculateAverageTaskDuration(): number {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.completedAt && t.assignedAt);
    
    if (completedTasks.length === 0) {
      return 0;
    }
    
    const totalDuration = completedTasks.reduce((sum, task) => {
      return sum + (task.completedAt!.getTime() - task.assignedAt!.getTime());
    }, 0);
    
    return totalDuration / completedTasks.length;
  }
  
  /**
   * Logger function
   */
  protected logger(message: string): void {
    console.log(`[${this.type}] ${message}`);
  }
}