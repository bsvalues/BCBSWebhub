/**
 * Circuit Breaker Registry
 * 
 * Provides a centralized registry for circuit breakers to manage
 * individual services/endpoints with a single point of configuration.
 */

import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker';

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultOptions: CircuitBreakerOptions;

  constructor(defaultOptions?: Partial<CircuitBreakerOptions>) {
    // Default configuration for all circuit breakers
    this.defaultOptions = {
      failureThreshold: 3,
      resetTimeout: 30000,
      halfOpenSuccessThreshold: 2,
      monitorInterval: 60000,
      timeout: 10000,
      ...defaultOptions
    };

    console.log('Circuit breaker registry initialized with default options:', this.defaultOptions);
  }

  /**
   * Get or create a circuit breaker for a specific service/endpoint
   */
  public getBreaker(serviceKey: string, customOptions?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(serviceKey)) {
      // Create a new circuit breaker with custom or default options
      const options = {
        ...this.defaultOptions,
        ...customOptions
      };
      
      const breaker = new CircuitBreaker(options);
      this.breakers.set(serviceKey, breaker);
      
      console.log(`Created new circuit breaker for service: ${serviceKey}`);
    }
    
    return this.breakers.get(serviceKey)!;
  }

  /**
   * Check if a circuit breaker exists for a specific service
   */
  public hasBreaker(serviceKey: string): boolean {
    return this.breakers.has(serviceKey);
  }

  /**
   * Reset a specific circuit breaker
   */
  public resetBreaker(serviceKey: string): boolean {
    const breaker = this.breakers.get(serviceKey);
    if (breaker) {
      breaker.reset();
      console.log(`Reset circuit breaker for service: ${serviceKey}`);
      return true;
    }
    return false;
  }

  /**
   * Get statistics for all circuit breakers
   */
  public getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, breaker] of this.breakers.entries()) {
      stats[key] = breaker.getStats();
    }
    
    return stats;
  }

  /**
   * Remove a circuit breaker from the registry
   */
  public removeBreaker(serviceKey: string): boolean {
    const breaker = this.breakers.get(serviceKey);
    if (breaker) {
      breaker.dispose();
      this.breakers.delete(serviceKey);
      console.log(`Removed circuit breaker for service: ${serviceKey}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up all circuit breakers
   */
  public dispose(): void {
    for (const [key, breaker] of this.breakers.entries()) {
      breaker.dispose();
      console.log(`Disposed circuit breaker for service: ${key}`);
    }
    this.breakers.clear();
  }
}