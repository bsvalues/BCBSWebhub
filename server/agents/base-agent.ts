import { 
  AgentType, 
  AgentMessage, 
  MessageType, 
  Priority,
  AgentCommunicationBus
} from "@shared/protocols/agent-communication";

/**
 * Task interface representing a unit of work for an agent to process
 */
export interface Task {
  id: string;
  type: string; 
  parameters: any;
  priority: Priority;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: any;
}

/**
 * Agent interface representing any specialized AI agent in the system
 */
export interface Agent {
  type: AgentType | string;
  capabilities: string[];
  running: boolean;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  handleMessage(message: AgentMessage): Promise<void>;
  getStatus(): { status: string; metrics: any };
}

/**
 * Base Agent class implementing common functionality for all agents
 */
export abstract class BaseAgent implements Agent {
  public readonly type: AgentType | string;
  public readonly capabilities: string[];
  protected running: boolean = false;
  protected communicationBus: AgentCommunicationBus;
  protected taskMap: Map<string, Task> = new Map();
  protected startTime: number = 0;
  
  /**
   * Constructor
   * @param type The type of agent
   * @param capabilities List of capabilities this agent provides
   * @param communicationBus The communication bus for inter-agent messaging
   */
  constructor(
    type: AgentType | string, 
    capabilities: string[],
    communicationBus: AgentCommunicationBus
  ) {
    this.type = type;
    this.capabilities = capabilities;
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
    this.running = true;
    
    // Subscribe to messages directed to this agent
    this.communicationBus.subscribe(this.type, this.handleMessage.bind(this));
    
    this.logger(`${this.type} agent initialized`);
    
    // Send status update to MCP
    this.sendStatusUpdate();
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
    this.communicationBus.unsubscribe(this.type);
    
    // Clear task map
    for (const task of this.taskMap.values()) {
      task.status = 'cancelled';
    }
    this.taskMap.clear();
    
    this.logger(`${this.type} agent shutdown`);
  }
  
  /**
   * Handle incoming messages
   * @param message Message to handle
   */
  public async handleMessage(message: AgentMessage): Promise<void> {
    if (!this.running) {
      return;
    }
    
    try {
      switch (message.messageType) {
        case MessageType.TASK_REQUEST:
          await this.handleTaskRequest(message);
          break;
          
        case MessageType.TASK_CANCEL:
          await this.handleTaskCancel(message);
          break;
          
        case MessageType.STATUS_UPDATE:
          await this.handleStatusUpdate(message);
          break;
          
        default:
          // Handle specialized message types
          await this.handleSpecializedMessage(message);
      }
    } catch (error) {
      this.logger(`Error handling message: ${error}`);
      
      // Send error response
      if (message.requiresResponse) {
        this.communicationBus.publish(
          AgentCommunicationBus.createErrorResponse(message, error)
        );
      }
    }
  }
  
  /**
   * Get the current status of the agent
   */
  public getStatus(): { status: string; metrics: any } {
    const uptime = this.running ? Date.now() - this.startTime : 0;
    
    // Count tasks by status
    const pendingTasks = Array.from(this.taskMap.values()).filter(t => t.status === 'pending').length;
    const processingTasks = Array.from(this.taskMap.values()).filter(t => t.status === 'processing').length;
    const completedTasks = Array.from(this.taskMap.values()).filter(t => t.status === 'completed').length;
    const failedTasks = Array.from(this.taskMap.values()).filter(t => t.status === 'failed').length;
    
    return {
      status: this.running ? 'running' : 'stopped',
      metrics: {
        uptime,
        tasks: {
          pending: pendingTasks,
          processing: processingTasks,
          completed: completedTasks,
          failed: failedTasks,
          total: this.taskMap.size
        },
        capabilities: this.capabilities,
      }
    };
  }
  
  /**
   * Handle task request message
   */
  private async handleTaskRequest(message: AgentMessage): Promise<void> {
    const { taskId, taskType, parameters } = message.payload;
    
    // Create a task
    const task: Task = {
      id: taskId,
      type: taskType,
      parameters,
      priority: message.priority,
      status: 'pending'
    };
    
    // Store the task
    this.taskMap.set(taskId, task);
    
    // Update task status
    task.status = 'processing';
    
    try {
      // Execute the task
      const result = await this.executeTask(task);
      
      // Update task with result
      task.result = result;
      task.status = 'completed';
      
      // Send response
      if (message.requiresResponse) {
        this.communicationBus.publish({
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
            status: 'success',
            result
          }
        });
      }
    } catch (error) {
      // Update task with error
      task.error = error.message || 'Unknown error';
      task.status = 'failed';
      
      // Send error response
      if (message.requiresResponse) {
        this.communicationBus.publish({
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
              stack: error.stack
            }
          }
        });
      }
    }
  }
  
  /**
   * Handle task cancel message
   */
  private async handleTaskCancel(message: AgentMessage): Promise<void> {
    const { taskId } = message.payload;
    
    // Find the task
    const task = this.taskMap.get(taskId);
    if (!task) {
      // Task not found, send error response
      if (message.requiresResponse) {
        this.communicationBus.publish({
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
              message: `Task not found: ${taskId}`
            }
          }
        });
      }
      return;
    }
    
    // Can only cancel pending or processing tasks
    if (task.status !== 'pending' && task.status !== 'processing') {
      if (message.requiresResponse) {
        this.communicationBus.publish({
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
              message: `Cannot cancel task with status ${task.status}`
            }
          }
        });
      }
      return;
    }
    
    // Cancel the task
    task.status = 'cancelled';
    
    // Send response
    if (message.requiresResponse) {
      this.communicationBus.publish({
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
          status: 'success',
          result: {
            status: 'cancelled'
          }
        }
      });
    }
  }
  
  /**
   * Handle status update message
   */
  private async handleStatusUpdate(message: AgentMessage): Promise<void> {
    // Send status update
    this.sendStatusUpdate(message);
  }
  
  /**
   * Send status update to requester or MCP
   */
  private sendStatusUpdate(requestMessage?: AgentMessage): void {
    const status = this.getStatus();
    
    if (requestMessage) {
      // Respond to status request
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: requestMessage.source,
        messageType: MessageType.STATUS_UPDATE,
        priority: Priority.LOW,
        requiresResponse: false,
        correlationId: requestMessage.messageId,
        payload: status
      });
    } else {
      // Broadcast status update to MCP
      this.communicationBus.publish({
        messageId: AgentCommunicationBus.createMessageId(),
        timestamp: new Date(),
        source: this.type,
        destination: AgentType.MCP,
        messageType: MessageType.STATUS_UPDATE,
        priority: Priority.LOW,
        requiresResponse: false,
        payload: status
      });
    }
  }
  
  /**
   * Execute a task assigned to this agent
   * This method must be implemented by all agent subclasses
   */
  protected abstract executeTask(task: Task): Promise<any>;
  
  /**
   * Handle specialized messages specific to this agent
   * This method should be implemented by agent subclasses that need
   * to handle specialized message types
   */
  protected async handleSpecializedMessage(message: AgentMessage): Promise<void> {
    // By default, log that we received an unhandled message type
    this.logger(`Unhandled message type ${message.messageType} in ${this.type} agent`);
  }
  
  /**
   * Logger method for agent-specific logging
   */
  protected logger(message: string, ...args: any[]): void {
    console.log(`[${this.type}] ${message}`, ...args);
  }
}