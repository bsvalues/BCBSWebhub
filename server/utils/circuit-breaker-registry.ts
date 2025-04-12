/**
 * Circuit Breaker Registry
 * 
 * Manages a collection of circuit breakers for different services or agents.
 */

import { CircuitBreaker, CircuitBreakerOptions, CircuitState, CircuitBreakerStats } from './circuit-breaker';
import { log } from '../vite';

/**
 * Circuit breaker registry
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultOptions: CircuitBreakerOptions;
  
  constructor(defaultOptions: CircuitBreakerOptions) {
    this.defaultOptions = defaultOptions;
    log('Circuit breaker registry initialized', 'circuit-registry');
  }
  
  /**
   * Get a circuit breaker for a service
   * Creates a new one if it doesn't exist
   */
  public getBreaker(service: string): CircuitBreaker {
    if (!this.breakers.has(service)) {
      log(`Creating new circuit breaker for ${service}`, 'circuit-registry');
      const breaker = new CircuitBreaker(this.defaultOptions, service);
      this.breakers.set(service, breaker);
      return breaker;
    }
    
    return this.breakers.get(service)!;
  }
  
  /**
   * Check if a breaker exists for a service
   */
  public hasBreaker(service: string): boolean {
    return this.breakers.has(service);
  }
  
  /**
   * Reset the circuit breaker for a service
   */
  public resetBreaker(service: string): boolean {
    if (this.breakers.has(service)) {
      const breaker = this.breakers.get(service)!;
      breaker.reset();
      log(`Reset circuit breaker for ${service}`, 'circuit-registry');
      return true;
    }
    
    return false;
  }
  
  /**
   * Remove a circuit breaker
   */
  public removeBreaker(service: string): boolean {
    if (this.breakers.has(service)) {
      const breaker = this.breakers.get(service)!;
      breaker.dispose();
      this.breakers.delete(service);
      log(`Removed circuit breaker for ${service}`, 'circuit-registry');
      return true;
    }
    
    return false;
  }
  
  /**
   * Get stats for a specific circuit breaker
   */
  public getStats(service: string): CircuitBreakerStats {
    if (this.breakers.has(service)) {
      return this.breakers.get(service)!.getStats();
    }
    
    return {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      lastStateChangeTime: Date.now(),
      openCount: 0
    };
  }
  
  /**
   * Get stats for all circuit breakers
   */
  public getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [service, breaker] of this.breakers) {
      stats[service] = breaker.getStats();
    }
    
    return stats;
  }
  
  /**
   * Get all circuit breakers in a specific state
   */
  public getBreakersInState(state: CircuitState): string[] {
    const services: string[] = [];
    
    for (const [service, breaker] of this.breakers) {
      if (breaker.getStats().state === state) {
        services.push(service);
      }
    }
    
    return services;
  }
  
  /**
   * Get the count of circuit breakers in each state
   */
  public getStateCount(): Record<CircuitState, number> {
    const counts: Record<CircuitState, number> = {
      [CircuitState.CLOSED]: 0,
      [CircuitState.OPEN]: 0,
      [CircuitState.HALF_OPEN]: 0
    };
    
    for (const breaker of this.breakers.values()) {
      counts[breaker.getStats().state]++;
    }
    
    return counts;
  }
  
  /**
   * Get the number of circuit breakers
   */
  public getBreakerCount(): number {
    return this.breakers.size;
  }
  
  /**
   * Close all circuit breakers
   */
  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    
    log('Reset all circuit breakers', 'circuit-registry');
  }
  
  /**
   * Dispose all circuit breakers
   */
  public dispose(): void {
    for (const breaker of this.breakers.values()) {
      breaker.dispose();
    }
    
    this.breakers.clear();
    log('Disposed all circuit breakers', 'circuit-registry');
  }
}