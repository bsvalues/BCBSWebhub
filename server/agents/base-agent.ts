import { 
  AgentType, 
  AgentMessage, 
  MessageType, 
  Priority, 
  StatusCode,
  AgentCommunicationBus, 
  Subscription,
  TaskMessage,
  TaskResponseMessage 
} from "@shared/protocols/agent-communication";

/**
 * Interface defining the capabilities of an agent
 */
export interface Agent {
  readonly type: AgentType;
  readonly capabilities: string[];
  getStatus(): { status: string; metrics: any };
  handleMessage(message: AgentMessage): Promise<void>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Task interface representing a unit of work for an agent
 */
export interface Task {
  id: string;
  type: string;
  parameters: any;
  context?: any;
  source?: AgentType;
  priority: Priority;
  startTime?: Date;
  endTime?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: any;
}

/**
 * Abstract base class for all agents in the system
 */
export abstract class BaseAgent implements Agent {
  public readonly type: AgentType;
  public readonly capabilities: string[];
  
  protected communicationBus: AgentCommunicationBus;
  protected subscriptions: Subscription[] = [];
  protected tasks: Map<string, Task> = new Map();
  protected running: boolean = false;
  protected logger: (message: string, data?: any) => void;
  
  constructor(
    type: AgentType, 
    capabilities: string[],
    communicationBus: AgentCommunicationBus,
    logger?: (message: string, data?: any) => void
  ) {
    this.type = type;
    this.capabilities = capabilities;
    this.communicationBus = communicationBus;
    this.logger = logger || console.log;
  }
  
  /**
   * Initialize the agent and set up message subscriptions
   */
  public async initialize(): Promise<void> {
    if (this.running) {
      return;
    }
    
    // Subscribe to messages directed to this agent
    this.subscriptions.push(
      this.communicationBus.subscribe(this.type, this.handleMessage.bind(this))
    );
    
    // Subscribe to broadcast messages
    this.subscriptions.push(
      this.communicationBus.subscribe('broadcast', this.handleMessage.bind(this))
    );
    
    this.running = true;
    this.logger(`Agent ${this.type} initialized with capabilities: ${this.capabilities.join(', ')}`);
    
    // Send status update to MCP
    this.sendStatusUpdate();
  }
  
  /**
   * Shutdown the agent and clean up resources
   */
  public async shutdown(): Promise<void> {
    // Unsubscribe from all message subscriptions
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions = [];
    
    // Cancel any in-progress tasks
    for (const task of this.tasks.values()) {
      if (task.status === 'processing' || task.status === 'pending') {
        task.status = 'cancelled';
        task.endTime = new Date();
      }
    }
    
    this.running = false;
    this.logger(`Agent ${this.type} shutdown`);
  }
  
  /**
   * Get the current status of the agent
   */
  public getStatus(): { status: string; metrics: any } {
    const activeTasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'processing' || t.status === 'pending'
    ).length;
    
    const completedTasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'completed'
    ).length;
    
    const failedTasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'failed'
    ).length;
    
    return {
      status: this.running ? 'running' : 'stopped',
      metrics: {
        activeTasks,
        completedTasks,
        failedTasks,
        totalTasks: this.tasks.size,
        uptime: this.running ? Date.now() - (this.tasks.size > 0 ? 
          Math.min(...Array.from(this.tasks.values())
            .filter(t => t.startTime)
            .map(t => t.startTime!.getTime())) : 
          Date.now()) : 0
      }
    };
  }
  
  /**
   * Handle an incoming message
   */
  public async handleMessage(message: AgentMessage): Promise<void> {
    if (!this.running) {
      this.logger(`Agent ${this.type} received message ${message.messageId} but is not running`);
      return;
    }
    
    this.logger(`Agent ${this.type} handling message ${message.messageId} of type ${message.messageType}`);
    
    try {
      switch (message.messageType) {
        case MessageType.TASK_REQUEST:
          await this.handleTaskRequest(message as TaskMessage);
          break;
          
        case MessageType.TASK_CANCEL:
          await this.handleTaskCancel(message);
          break;
          
        case MessageType.STATUS_UPDATE:
          // Send current status in response
          this.sendStatusUpdate(message.source, message.messageId);
          break;
          
        case MessageType.HEARTBEAT:
          // Respond to heartbeat if required
          if (message.requiresResponse) {
            this.sendHeartbeatResponse(message);
          }
          break;
          
        default:
          // Each agent implementation should handle specialized messages
          await this.handleSpecializedMessage(message);
      }
    } catch (error) {
      this.logger(`Error handling message ${message.messageId} in agent ${this.type}:`, error);
      
      // Send error response if the message requires a response
      if (message.requiresResponse) {
        this.communicationBus.publish(
          AgentCommunicationBus.createErrorResponse(message, error)
        );
      }
    }
  }
  
  /**
   * Handle task request message
   */
  private async handleTaskRequest(message: TaskMessage): Promise<void> {
    const { taskId, taskType, parameters, context } = message.payload;
    
    // Check if the agent has the required capabilities
    if (message.payload.requiredCapabilities) {
      const hasCapabilities = message.payload.requiredCapabilities.every(
        cap => this.capabilities.includes(cap)
      );
      
      if (!hasCapabilities) {
        this.sendTaskResponse(message, {
          taskId,
          status: StatusCode.RESOURCE_ERROR,
          errorDetails: {
            message: `Agent ${this.type} does not have the required capabilities: ${
              message.payload.requiredCapabilities.filter(c => !this.capabilities.includes(c)).join(', ')
            }`
          }
        });
        return;
      }
    }
    
    // Create and initialize the task
    const task: Task = {
      id: taskId,
      type: taskType,
      parameters,
      context,
      source: message.source as AgentType,
      priority: message.priority,
      startTime: new Date(),
      status: 'processing'
    };
    
    this.tasks.set(taskId, task);
    
    try {
      // Execute the task
      const result = await this.executeTask(task);
      
      // Update task status
      task.status = 'completed';
      task.endTime = new Date();
      task.result = result;
      
      // Send response if required
      if (message.requiresResponse) {
        this.sendTaskResponse(message, {
          taskId,
          status: StatusCode.SUCCESS,
          result
        });
      }
    } catch (error) {
      // Update task status
      task.status = 'failed';
      task.endTime = new Date();
      task.error = error;
      
      // Send failure response if required
      if (message.requiresResponse) {
        this.sendTaskResponse(message, {
          taskId,
          status: StatusCode.FAILURE,
          errorDetails: {
            message: error.message || String(error),
            stack: error.stack
          }
        });
      }
    }
  }
  
  /**
   * Handle task cancel message
   */
  private async handleTaskCancel(message: AgentMessage): Promise<void> {
    const taskId = message.payload.taskId;
    const task = this.tasks.get(taskId);
    
    if (!task) {
      this.logger(`Task ${taskId} not found for cancellation in agent ${this.type}`);
      return;
    }
    
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      this.logger(`Cannot cancel task ${taskId} with status ${task.status}`);
      return;
    }
    
    // Set task as cancelled
    task.status = 'cancelled';
    task.endTime = new Date();
    
    this.logger(`Cancelled task ${taskId} in agent ${this.type}`);
    
    // Send confirmation if required
    if (message.requiresResponse) {
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: message.source,
        messageType: MessageType.TASK_RESPONSE,
        priority: Priority.MEDIUM,
        requiresResponse: false,
        correlationId: message.messageId,
        payload: {
          taskId,
          status: StatusCode.CANCELLED
        }
      });
    }
  }
  
  /**
   * Send task response message
   */
  private sendTaskResponse(
    requestMessage: TaskMessage, 
    response: { taskId: string; status: StatusCode; result?: any; errorDetails?: any; warnings?: string[] }
  ): void {
    // Calculate processing time
    const task = this.tasks.get(response.taskId);
    const processingTimeMs = task ? 
      (task.endTime ? task.endTime.getTime() : Date.now()) - (task.startTime?.getTime() || Date.now()) : 
      0;
    
    // Send response
    this.communicationBus.publish({
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.type,
      destination: requestMessage.source,
      messageType: MessageType.TASK_RESPONSE,
      priority: requestMessage.priority,
      requiresResponse: false,
      correlationId: requestMessage.messageId,
      payload: {
        ...response,
        metrics: {
          processingTimeMs
        }
      }
    } as TaskResponseMessage);
  }
  
  /**
   * Send heartbeat response message
   */
  private sendHeartbeatResponse(requestMessage: AgentMessage): void {
    this.communicationBus.publish({
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.type,
      destination: requestMessage.source,
      messageType: MessageType.HEARTBEAT,
      priority: Priority.LOW,
      requiresResponse: false,
      correlationId: requestMessage.messageId,
      payload: {
        status: 'alive',
        timestamp: new Date()
      }
    });
  }
  
  /**
   * Send status update message to MCP or other agent
   */
  private sendStatusUpdate(destination: string = AgentType.MCP, correlationId?: string): void {
    const status = this.getStatus();
    
    this.communicationBus.publish({
      messageId: AgentCommunicationBus.createMessageId(),
      timestamp: new Date(),
      source: this.type,
      destination,
      messageType: MessageType.STATUS_UPDATE,
      priority: Priority.LOW,
      requiresResponse: false,
      correlationId,
      payload: status
    });
  }
  
  /**
   * Abstract method to execute a task - must be implemented by agent subclasses
   */
  protected abstract executeTask(task: Task): Promise<any>;
  
  /**
   * Handle specialized messages - should be implemented by agent subclasses
   */
  protected abstract handleSpecializedMessage(message: AgentMessage): Promise<void>;
}