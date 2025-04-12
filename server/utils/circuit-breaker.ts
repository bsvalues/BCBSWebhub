/**
 * Circuit Breaker Implementation
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * when a service is experiencing issues.
 */

import { log } from '../vite';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',   // Normal operation, requests pass through
  OPEN = 'OPEN',       // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if the service is back to normal
}

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening circuit
  resetTimeout: number;          // Time in ms to wait before half-open
  halfOpenSuccessThreshold?: number; // Number of successes in half-open before closing
  monitorInterval?: number;      // Time in ms between state monitoring checks
}

/**
 * Circuit breaker stats
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChangeTime: number;
  openCount: number;  // Number of times circuit has been opened
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastStateChangeTime: number = Date.now();
  private openCount: number = 0;
  private halfOpenTimer: NodeJS.Timeout | null = null;
  private monitorTimer: NodeJS.Timeout | null = null;
  private service: string = 'unknown';
  
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly listeners: { [key: string]: Function[] } = {
    open: [],
    close: [],
    halfOpen: [],
    failure: [],
    success: [],
    rejected: []
  };
  
  constructor(options: CircuitBreakerOptions, service: string = 'unknown') {
    // Set default options
    this.options = {
      failureThreshold: options.failureThreshold,
      resetTimeout: options.resetTimeout,
      halfOpenSuccessThreshold: options.halfOpenSuccessThreshold || 1,
      monitorInterval: options.monitorInterval || 60000 // Default to 1 minute
    };
    
    this.service = service;
    
    // Start monitoring timer
    this.startMonitor();
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      this.emit('rejected');
      throw new Error(`Circuit breaker is open for ${this.service}`);
    }
    
    try {
      // Execute the function
      const result = await fn();
      
      // Register success
      this.registerSuccess();
      
      return result;
    } catch (error) {
      // Register failure
      this.registerFailure(error);
      
      // Rethrow the error
      throw error;
    }
  }
  
  /**
   * Register a successful operation
   */
  public registerSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();
    
    // If in half-open state, check if we should close the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.options.halfOpenSuccessThreshold) {
        this.close();
      }
    }
    
    this.emit('success');
  }
  
  /**
   * Register a failed operation
   */
  public registerFailure(error: any): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    // If in closed state, check if we should open the circuit
    if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.options.failureThreshold) {
        this.open();
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // If in half-open state and a failure occurs, open the circuit again
      this.open();
    }
    
    this.emit('failure', error);
  }
  
  /**
   * Get the current state of the circuit
   */
  public isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
  
  /**
   * Get the current state of the circuit
   */
  public isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }
  
  /**
   * Get the current stats for the circuit
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChangeTime: this.lastStateChangeTime,
      openCount: this.openCount
    };
  }
  
  /**
   * Reset the circuit to a closed state
   */
  public reset(): void {
    // Reset stats and state
    this.failures = 0;
    this.successes = 0;
    
    // If currently open, force close
    if (this.state !== CircuitState.CLOSED) {
      this.close();
    }
    
    log(`Circuit breaker reset for ${this.service}`, 'circuit-breaker');
  }
  
  /**
   * Add an event listener
   */
  public on(event: string, callback: Function): void {
    if (event in this.listeners) {
      this.listeners[event].push(callback);
    }
  }
  
  /**
   * Remove an event listener
   */
  public off(event: string, callback: Function): void {
    if (event in this.listeners) {
      const index = this.listeners[event].indexOf(callback);
      if (index !== -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clear timers
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
    
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    
    // Clear all listeners
    for (const event in this.listeners) {
      this.listeners[event] = [];
    }
  }
  
  /**
   * Force the circuit to the open state
   */
  private open(): void {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.lastStateChangeTime = Date.now();
      this.openCount++;
      this.successes = 0;
      
      log(`Circuit opened for ${this.service}`, 'circuit-breaker');
      
      // Set timer to half-open after reset timeout
      this.halfOpenTimer = setTimeout(() => {
        this.halfOpen();
      }, this.options.resetTimeout);
      
      this.emit('open');
    }
  }
  
  /**
   * Change the circuit to the half-open state
   */
  private halfOpen(): void {
    if (this.state === CircuitState.OPEN) {
      this.state = CircuitState.HALF_OPEN;
      this.lastStateChangeTime = Date.now();
      this.successes = 0;
      
      log(`Circuit half-open for ${this.service}`, 'circuit-breaker');
      
      this.emit('halfOpen');
    }
  }
  
  /**
   * Force the circuit to the closed state
   */
  private close(): void {
    const wasOpen = this.state !== CircuitState.CLOSED;
    
    this.state = CircuitState.CLOSED;
    this.lastStateChangeTime = Date.now();
    this.failures = 0;
    this.successes = 0;
    
    // Clear half-open timer if it exists
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
    
    if (wasOpen) {
      log(`Circuit closed for ${this.service}`, 'circuit-breaker');
      this.emit('close');
    }
  }
  
  /**
   * Start the monitoring timer
   */
  private startMonitor(): void {
    // Start monitoring check
    this.monitorTimer = setInterval(() => {
      this.monitor();
    }, this.options.monitorInterval);
  }
  
  /**
   * Monitor the circuit state
   */
  private monitor(): void {
    const stats = this.getStats();
    
    // Check for stuck circuit
    if (this.state === CircuitState.OPEN) {
      const timeInOpen = Date.now() - this.lastStateChangeTime;
      const resetTimeout = this.options.resetTimeout;
      
      // If we've been open for too long, try half-open
      if (timeInOpen > resetTimeout * 2) {
        log(`Circuit for ${this.service} stuck in open state, forcing half-open`, 'circuit-breaker');
        this.halfOpen();
      }
    }
  }
  
  /**
   * Emit an event to all listeners
   */
  private emit(event: string, ...args: any[]): void {
    if (event in this.listeners) {
      for (const listener of this.listeners[event]) {
        try {
          listener(...args);
        } catch (error) {
          log(`Error in circuit breaker event listener: ${error}`, 'circuit-breaker');
        }
      }
    }
  }
}