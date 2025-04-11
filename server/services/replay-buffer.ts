/**
 * Experience Replay Buffer
 * 
 * Stores agent experiences (interactions) for later training and analysis.
 * Implements priority sampling to focus on important experiences.
 */

import { logger } from '../utils/logger';

// Interface for buffer entries
export interface ExperienceEntry {
  experience: any;      // The actual experience data
  timestamp: Date;      // When the experience was added
  priority: number;     // Priority level (0 is highest)
  id: string;           // Unique identifier
  outcome?: boolean;    // Whether the experience led to success
  timesSampled: number; // How many times this has been sampled
}

// Interface for buffer options
export interface ReplayBufferOptions {
  maxSize: number;         // Maximum number of experiences to store
  priorityLevels: number;  // Number of priority levels
  alpha?: number;          // Priority exponent (how much to favor high priority)
  beta?: number;           // Weight correction exponent
  decayRate?: number;      // Rate at which priorities decrease with sampling
}

export class ExperienceReplayBuffer {
  private buffer: ExperienceEntry[] = [];
  private priorityBuffers: ExperienceEntry[][] = [];
  private options: Required<ReplayBufferOptions>;
  private successCount = 0;
  private failureCount = 0;
  
  private static DEFAULT_OPTIONS: Required<ReplayBufferOptions> = {
    maxSize: 1000,
    priorityLevels: 3,
    alpha: 0.6,
    beta: 0.4,
    decayRate: 0.99
  };
  
  constructor(options: ReplayBufferOptions) {
    this.options = {
      ...ExperienceReplayBuffer.DEFAULT_OPTIONS,
      ...options
    };
    
    // Initialize priority buffers
    this.priorityBuffers = Array(this.options.priorityLevels)
      .fill(null)
      .map(() => []);
    
    logger.info(`Experience replay buffer initialized with ${this.options.priorityLevels} priority levels and max size ${this.options.maxSize}`);
  }
  
  /**
   * Add an experience to the buffer
   */
  public add(experience: any, priority: number = this.options.priorityLevels - 1): void {
    // Ensure priority is within bounds
    priority = Math.max(0, Math.min(priority, this.options.priorityLevels - 1));
    
    const entry: ExperienceEntry = {
      experience,
      timestamp: new Date(),
      priority,
      id: typeof experience.messageId === 'string' ? experience.messageId : `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timesSampled: 0
    };
    
    // Add to the appropriate priority buffer
    this.priorityBuffers[priority].push(entry);
    
    // Also add to main buffer for easier iteration
    this.buffer.push(entry);
    
    // Check if we need to evict entries
    this.enforceMaxSize();
    
    // Log if this is a significant milestone
    if (this.buffer.length % 100 === 0) {
      logger.debug(`Experience buffer size: ${this.buffer.length}`);
    }
  }
  
  /**
   * Update the outcome of an experience
   */
  public updateOutcome(experienceId: string, success: boolean): void {
    const entry = this.buffer.find(e => e.id === experienceId);
    
    if (entry) {
      // Update the outcome
      entry.outcome = success;
      
      // Update success/failure counts
      if (success) {
        this.successCount++;
      } else {
        this.failureCount++;
      }
    }
  }
  
  /**
   * Sample an experience from the buffer based on priority
   */
  public sample(count: number = 1): ExperienceEntry[] {
    if (this.buffer.length === 0) {
      return [];
    }
    
    const result: ExperienceEntry[] = [];
    
    // Sample 'count' experiences
    for (let i = 0; i < count && this.buffer.length > 0; i++) {
      // Determine which priority buffer to sample from
      // Higher priority buffers have higher chance of being selected
      const priorityIndex = this.samplePriorityIndex();
      
      // If the selected priority buffer is empty, try the next one
      let actualPriorityIndex = priorityIndex;
      while (this.priorityBuffers[actualPriorityIndex].length === 0) {
        actualPriorityIndex = (actualPriorityIndex + 1) % this.options.priorityLevels;
        
        // If we've checked all buffers and they're all empty, break
        if (actualPriorityIndex === priorityIndex) {
          break;
        }
      }
      
      // If we found a non-empty buffer, sample from it
      if (this.priorityBuffers[actualPriorityIndex].length > 0) {
        const targetBuffer = this.priorityBuffers[actualPriorityIndex];
        const randomIndex = Math.floor(Math.random() * targetBuffer.length);
        
        // Get the experience
        const sampled = targetBuffer[randomIndex];
        
        // Update times sampled
        sampled.timesSampled++;
        
        // Add to result
        result.push(sampled);
      }
    }
    
    return result;
  }
  
  /**
   * Sample a priority index based on priority distribution
   */
  private samplePriorityIndex(): number {
    // Calculate weights for each priority level
    const weights = Array(this.options.priorityLevels)
      .fill(0)
      .map((_, i) => Math.pow(this.options.priorityLevels - i, this.options.alpha));
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // Generate a random value between 0 and the total weight
    let random = Math.random() * totalWeight;
    
    // Find the index that corresponds to this random value
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return i;
      }
    }
    
    // Fallback
    return 0;
  }
  
  /**
   * Enforce the maximum buffer size by removing least important experiences
   */
  private enforceMaxSize(): void {
    if (this.buffer.length <= this.options.maxSize) {
      return;
    }
    
    // Calculate how many entries to remove
    const excessCount = this.buffer.length - this.options.maxSize;
    
    // Start removing from lowest priority buffers
    let removedCount = 0;
    
    for (let priority = this.options.priorityLevels - 1; priority >= 0 && removedCount < excessCount; priority--) {
      const buffer = this.priorityBuffers[priority];
      
      // Sort by least recently added and most frequently sampled
      buffer.sort((a, b) => {
        // First by times sampled (most sampled first)
        if (b.timesSampled !== a.timesSampled) {
          return b.timesSampled - a.timesSampled;
        }
        
        // Then by timestamp (oldest first)
        return a.timestamp.getTime() - b.timestamp.getTime();
      });
      
      // Calculate how many to remove from this buffer
      const removeFromBuffer = Math.min(excessCount - removedCount, buffer.length);
      
      if (removeFromBuffer > 0) {
        // Get the IDs of entries to remove
        const entriesToRemove = buffer.slice(0, removeFromBuffer).map(e => e.id);
        
        // Remove from this priority buffer
        this.priorityBuffers[priority] = buffer.slice(removeFromBuffer);
        
        // Remove from main buffer
        this.buffer = this.buffer.filter(e => !entriesToRemove.includes(e.id));
        
        removedCount += removeFromBuffer;
      }
    }
    
    logger.debug(`Removed ${removedCount} experiences from replay buffer`);
  }
  
  /**
   * Get the current size of the buffer
   */
  public getSize(): number {
    return this.buffer.length;
  }
  
  /**
   * Get the current success rate of experiences
   */
  public getSuccessRate(): number {
    const total = this.successCount + this.failureCount;
    return total > 0 ? this.successCount / total : 0;
  }
  
  /**
   * Get the distribution of experiences across priority levels
   */
  public getPriorityDistribution(): number[] {
    return this.priorityBuffers.map(buffer => buffer.length);
  }
  
  /**
   * Get the most recent experiences
   */
  public getRecentExperiences(count: number = 5): any[] {
    return this.buffer
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count)
      .map(entry => entry.experience);
  }
  
  /**
   * Get experiences filtered by a predicate
   */
  public getExperiencesByFilter(predicate: (experience: any) => boolean, count: number = 10): any[] {
    return this.buffer
      .filter(entry => predicate(entry.experience))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count)
      .map(entry => entry.experience);
  }
  
  /**
   * Clear the buffer
   */
  public clear(): void {
    this.buffer = [];
    this.priorityBuffers = Array(this.options.priorityLevels)
      .fill(null)
      .map(() => []);
    this.successCount = 0;
    this.failureCount = 0;
    
    logger.info('Experience replay buffer cleared');
  }
}