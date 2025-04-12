/**
 * Circuit Breaker Implementation
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * when a dependency is failing, providing resilient communication between agents.
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;     // Number of failures before opening circuit
  resetTimeout: number;         // Time (ms) before trying again when open
  halfOpenSuccessThreshold: number; // Successes needed to close circuit when half-open
  monitorInterval?: number;     // Interval to check health, clean up stale entries
  timeout?: number;             // Max execution time before considering a failure
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  rejected: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChange: number;
}

export class CircuitBreaker {
  private failures: number = 0;
  private successes: number = 0;
  private rejected: number = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private lastStateChange: number = Date.now();
  private monitorInterval?: NodeJS.Timeout;

  constructor(
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 3,
      resetTimeout: 30000,
      halfOpenSuccessThreshold: 2,
      monitorInterval: 60000,
      timeout: 10000
    }
  ) {
    // Set up monitoring if interval was configured
    if (options.monitorInterval) {
      this.monitorInterval = setInterval(() => this.monitor(), options.monitorInterval);
    }

    console.log('Circuit breaker initialized with options:', options);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if it's time to try again (reset timeout has elapsed)
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.setState('HALF_OPEN');
      } else {
        this.rejected++;
        throw new Error('Circuit breaker is open - request rejected');
      }
    }

    // Execute the function with optional timeout
    try {
      let timeoutId: NodeJS.Timeout | undefined;
      
      // Create a promise with timeout if configured
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          if (this.options.timeout) {
            timeoutId = setTimeout(() => {
              reject(new Error(`Circuit breaker timeout after ${this.options.timeout}ms`));
            }, this.options.timeout);
          }
        })
      ]);

      // Clear timeout if it was set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    
    // If we're half-open and the success threshold is reached, close the circuit
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.halfOpenSuccessThreshold) {
        this.setState('CLOSED');
      }
    }

    // Reset counters when closed
    if (this.state === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
    }
  }

  /**
   * Handle execution failure
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    // Open the circuit if failure threshold is reached or if we're in half-open state
    if (this.failures >= this.options.failureThreshold || this.state === 'HALF_OPEN') {
      this.setState('OPEN');
    }
  }

  /**
   * Change the circuit breaker state
   */
  private setState(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const prevState = this.state;
      this.state = newState;
      this.lastStateChange = Date.now();

      // Reset counters on state change
      if (newState === 'CLOSED') {
        this.failures = 0;
        this.successes = 0;
      } else if (newState === 'HALF_OPEN') {
        this.successes = 0;
      }

      console.log(`Circuit breaker state changed from ${prevState} to ${newState}`);
    }
  }

  /**
   * Manually reset the circuit breaker to closed state
   */
  public reset(): void {
    this.setState('CLOSED');
    this.failures = 0;
    this.successes = 0;
    this.rejected = 0;
  }

  /**
   * Get current circuit breaker statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      rejected: this.rejected,
      lastFailureTime: this.lastFailureTime || null,
      lastSuccessTime: this.lastSuccessTime || null,
      lastStateChange: this.lastStateChange
    };
  }

  /**
   * Monitor circuit breaker health and perform cleanup
   */
  private monitor(): void {
    // Auto-reset very long-lived open circuits (as a safety measure)
    if (this.state === 'OPEN') {
      const openDuration = Date.now() - this.lastStateChange;
      
      // If circuit has been open for more than 3x the reset timeout,
      // we move to half-open to allow retry attempts
      if (openDuration > this.options.resetTimeout * 3) {
        console.log(`Circuit breaker auto-transitioning to HALF_OPEN after extended period: ${openDuration}ms`);
        this.setState('HALF_OPEN');
      }
    }
  }

  /**
   * Clean up resources when circuit breaker is no longer needed
   */
  public dispose(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }
}