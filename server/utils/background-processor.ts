/**
 * Background Processor
 * 
 * Provides an asynchronous processing mechanism for handling long-running tasks
 * like batch validations, data imports, and large-scale operations.
 * 
 * Features:
 * - Queue-based processing system
 * - Progress tracking
 * - Resilient error handling
 * - Priority-based execution
 * - Result persistence
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../vite';

/**
 * Task priority levels
 */
export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Task callback function type
 */
export type TaskCallback<T> = (
  updateProgress: (progress: number, message?: string) => void,
  getTaskInfo: () => TaskInfo<T>
) => Promise<T>;

/**
 * Task information
 */
export interface TaskInfo<T = any> {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  progressMessage?: string;
  result?: T;
  error?: Error;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number; // in milliseconds
  userId?: number; // user who created the task
  metadata?: Record<string, any>;
}

/**
 * Task submission options
 */
export interface TaskOptions<T = any> {
  name: string;
  description?: string;
  priority?: TaskPriority;
  estimatedDuration?: number;
  userId?: number;
  metadata?: Record<string, any>;
  onProgress?: (taskInfo: TaskInfo<T>) => void;
  onCompleted?: (result: T, taskInfo: TaskInfo<T>) => void;
  onFailed?: (error: Error, taskInfo: TaskInfo<T>) => void;
}

/**
 * Background processor for handling asynchronous tasks
 */
export class BackgroundProcessor {
  private tasks: Map<string, TaskInfo> = new Map();
  private queue: string[] = [];
  private runningTasks: Set<string> = new Set();
  private eventEmitter: EventEmitter = new EventEmitter();
  private maxConcurrentTasks: number;
  private isProcessing: boolean = false;
  private taskCallbacks: Map<string, TaskCallback<any>> = new Map();
  private taskListeners: Map<string, { onProgress?: Function, onCompleted?: Function, onFailed?: Function }> = new Map();
  
  // Storage for task results
  private taskResults: Map<string, any> = new Map();
  private resultRetentionTime: number; // in milliseconds
  
  /**
   * Create a new background processor
   * 
   * @param maxConcurrentTasks Maximum number of tasks to run concurrently
   * @param resultRetentionTime How long to keep task results (in milliseconds)
   */
  constructor(maxConcurrentTasks: number = 3, resultRetentionTime: number = 3600000) {
    this.maxConcurrentTasks = maxConcurrentTasks;
    this.resultRetentionTime = resultRetentionTime;
    
    log('Background processor initialized', 'background');
    
    // Set up periodic cleanup for completed tasks
    setInterval(() => this.cleanupOldResults(), this.resultRetentionTime);
  }
  
  /**
   * Submit a task for background processing
   * 
   * @param taskFn The function to execute in the background
   * @param options Task options
   * @returns Task ID
   */
  public submitTask<T>(taskFn: TaskCallback<T>, options: TaskOptions<T>): string {
    const taskId = uuidv4();
    
    // Create task info
    const taskInfo: TaskInfo<T> = {
      id: taskId,
      name: options.name,
      description: options.description,
      status: TaskStatus.PENDING,
      priority: options.priority || TaskPriority.MEDIUM,
      progress: 0,
      createdAt: new Date(),
      estimatedDuration: options.estimatedDuration,
      userId: options.userId,
      metadata: options.metadata
    };
    
    // Store task
    this.tasks.set(taskId, taskInfo);
    
    // Store callback function
    this.taskCallbacks.set(taskId, taskFn);
    
    // Store event listeners
    this.taskListeners.set(taskId, {
      onProgress: options.onProgress,
      onCompleted: options.onCompleted,
      onFailed: options.onFailed
    });
    
    // Add to appropriate position in queue based on priority
    this.addToQueue(taskId, options.priority || TaskPriority.MEDIUM);
    
    log(`Task ${taskId} (${options.name}) submitted to background processor`, 'background');
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return taskId;
  }
  
  /**
   * Get the current status of a task
   * 
   * @param taskId Task ID
   * @returns Task info or undefined if not found
   */
  public getTaskStatus<T = any>(taskId: string): TaskInfo<T> | undefined {
    const task = this.tasks.get(taskId) as TaskInfo<T>;
    
    if (task) {
      return { ...task };
    }
    
    return undefined;
  }
  
  /**
   * Get the result of a completed task
   * 
   * @param taskId Task ID
   * @returns Task result or undefined if task not found or not completed
   */
  public getTaskResult<T = any>(taskId: string): T | undefined {
    return this.taskResults.get(taskId) as T;
  }
  
  /**
   * Cancel a pending task
   * 
   * @param taskId Task ID
   * @returns True if task was cancelled, false otherwise
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    // Can only cancel pending tasks
    if (task.status === TaskStatus.PENDING) {
      // Update task status
      task.status = TaskStatus.CANCELLED;
      
      // Remove from queue
      const index = this.queue.indexOf(taskId);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
      
      // Emit event
      this.eventEmitter.emit('task:cancelled', { ...task });
      
      log(`Task ${taskId} (${task.name}) cancelled`, 'background');
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get all tasks with optional filtering
   * 
   * @param filter Optional filter function
   * @returns Array of task infos
   */
  public getAllTasks<T = any>(filter?: (task: TaskInfo<T>) => boolean): TaskInfo<T>[] {
    const tasks = Array.from(this.tasks.values()) as TaskInfo<T>[];
    
    if (filter) {
      return tasks.filter(filter);
    }
    
    return tasks;
  }
  
  /**
   * Get all currently running tasks
   */
  public getRunningTasks<T = any>(): TaskInfo<T>[] {
    return this.getAllTasks(task => task.status === TaskStatus.RUNNING) as TaskInfo<T>[];
  }
  
  /**
   * Get all pending tasks
   */
  public getPendingTasks<T = any>(): TaskInfo<T>[] {
    return this.getAllTasks(task => task.status === TaskStatus.PENDING) as TaskInfo<T>[];
  }
  
  /**
   * Get all completed tasks
   */
  public getCompletedTasks<T = any>(): TaskInfo<T>[] {
    return this.getAllTasks(task => task.status === TaskStatus.COMPLETED) as TaskInfo<T>[];
  }
  
  /**
   * Get all failed tasks
   */
  public getFailedTasks<T = any>(): TaskInfo<T>[] {
    return this.getAllTasks(task => task.status === TaskStatus.FAILED) as TaskInfo<T>[];
  }
  
  /**
   * Register event listener
   * 
   * @param event Event name
   * @param listener Event listener function
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  /**
   * Unregister event listener
   * 
   * @param event Event name
   * @param listener Event listener function
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
  
  /**
   * Clean up old results
   */
  private cleanupOldResults(): void {
    const now = Date.now();
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) &&
        task.completedAt &&
        now - task.completedAt.getTime() > this.resultRetentionTime
      ) {
        // Remove task after retention period
        this.tasks.delete(taskId);
        this.taskResults.delete(taskId);
        this.taskCallbacks.delete(taskId);
        this.taskListeners.delete(taskId);
        
        log(`Task ${taskId} (${task.name}) cleaned up after retention period`, 'background');
      }
    }
  }
  
  /**
   * Add a task to the queue based on priority
   * 
   * @param taskId Task ID
   * @param priority Task priority
   */
  private addToQueue(taskId: string, priority: TaskPriority): void {
    // Simple priority-based insertion
    if (priority === TaskPriority.HIGH) {
      // High priority goes to the front
      this.queue.unshift(taskId);
    } else if (priority === TaskPriority.MEDIUM) {
      // Medium priority goes after all high priority tasks
      const lastHighPriorityIndex = this.findLastPriorityIndex(TaskPriority.HIGH);
      this.queue.splice(lastHighPriorityIndex + 1, 0, taskId);
    } else {
      // Low priority goes to the end
      this.queue.push(taskId);
    }
  }
  
  /**
   * Find the index of the last task with a given priority
   * 
   * @param priority Priority to look for
   * @returns Index of the last task with the given priority, or -1 if none found
   */
  private findLastPriorityIndex(priority: TaskPriority): number {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const task = this.tasks.get(this.queue[i]);
      if (task && task.priority === priority) {
        return i;
      }
    }
    
    return -1;
  }
  
  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0 && this.runningTasks.size < this.maxConcurrentTasks) {
        const taskId = this.queue.shift();
        
        if (!taskId) {
          continue;
        }
        
        const task = this.tasks.get(taskId);
        const taskFn = this.taskCallbacks.get(taskId);
        
        if (!task || !taskFn || task.status !== TaskStatus.PENDING) {
          continue;
        }
        
        // Mark task as running
        this.runningTasks.add(taskId);
        task.status = TaskStatus.RUNNING;
        task.startedAt = new Date();
        
        // Emit event
        this.eventEmitter.emit('task:started', { ...task });
        
        log(`Starting task ${taskId} (${task.name})`, 'background');
        
        // Execute task in the background
        this.executeTask(taskId, taskFn, task);
      }
    } finally {
      this.isProcessing = false;
      
      // If there are more tasks and available slots, continue processing
      if (this.queue.length > 0 && this.runningTasks.size < this.maxConcurrentTasks) {
        setImmediate(() => this.processQueue());
      }
    }
  }
  
  /**
   * Execute a task
   * 
   * @param taskId Task ID
   * @param taskFn Task function
   * @param task Task info
   */
  private async executeTask<T>(
    taskId: string,
    taskFn: TaskCallback<T>,
    task: TaskInfo<T>
  ): Promise<void> {
    try {
      // Create progress update function
      const updateProgress = (progress: number, message?: string) => {
        // Update task info
        task.progress = Math.min(Math.max(0, progress), 100);
        task.progressMessage = message;
        
        // Notify listeners
        const listeners = this.taskListeners.get(taskId);
        if (listeners && listeners.onProgress) {
          listeners.onProgress({ ...task });
        }
        
        // Emit event
        this.eventEmitter.emit('task:progress', { ...task });
      };
      
      // Create task info getter
      const getTaskInfo = () => ({ ...task });
      
      // Execute the task
      const result = await taskFn(updateProgress, getTaskInfo);
      
      // Store the result
      this.taskResults.set(taskId, result);
      
      // Update task info
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.progress = 100;
      task.result = result;
      
      // Emit completion event
      this.eventEmitter.emit('task:completed', { ...task });
      
      // Notify listeners
      const listeners = this.taskListeners.get(taskId);
      if (listeners && listeners.onCompleted) {
        listeners.onCompleted(result, { ...task });
      }
      
      log(`Task ${taskId} (${task.name}) completed successfully`, 'background');
    } catch (error) {
      // Update task info
      task.status = TaskStatus.FAILED;
      task.completedAt = new Date();
      task.error = error as Error;
      
      // Emit error event
      this.eventEmitter.emit('task:failed', { ...task, error });
      
      // Notify listeners
      const listeners = this.taskListeners.get(taskId);
      if (listeners && listeners.onFailed) {
        listeners.onFailed(error, { ...task });
      }
      
      log(`Task ${taskId} (${task.name}) failed: ${error}`, 'background');
    } finally {
      // Remove from running tasks
      this.runningTasks.delete(taskId);
      
      // Continue processing queue
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }
}

// Singleton instance
export const backgroundProcessor = new BackgroundProcessor(5, 24 * 60 * 60 * 1000); // 5 concurrent tasks, 24-hour retention