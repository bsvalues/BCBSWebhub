/**
 * Agent Resilience Integration
 * 
 * Integrates all resilience features into a cohesive solution:
 * - Circuit breaker pattern
 * - Self-healing capabilities
 * - Health monitoring
 * 
 * This serves as the main entry point for resilience features
 */

import { AgentCommunicationBus, AgentType } from '@shared/protocols/agent-communication';
import { EnhancedCommunicationBus } from '@shared/protocols/enhanced-agent-communication';
import { CircuitBreakerRegistry } from '../utils/circuit-breaker-registry';
import { EnhancedAgentManager, AgentConfig, AgentHealth } from './enhanced-agent-manager';
import { log } from '../vite';

/**
 * Agent Resilience Integration
 * 
 * Provides a unified interface for resilience features
 */
export class AgentResilienceIntegration {
  private circuitBreakerRegistry: CircuitBreakerRegistry;
  private enhancedBus: EnhancedCommunicationBus;
  private agentManager: EnhancedAgentManager;
  private initialized: boolean = false;
  
  constructor(baseBus: AgentCommunicationBus) {
    // Create the circuit breaker registry with default settings
    this.circuitBreakerRegistry = new CircuitBreakerRegistry({
      failureThreshold: 5,       // 5 consecutive failures opens the circuit
      resetTimeout: 10000,       // 10 seconds before trying half-open
      halfOpenSuccessThreshold: 2 // 2 successful requests to close the circuit
    });
    
    // Create the enhanced communication bus
    this.enhancedBus = new EnhancedCommunicationBus(baseBus, this.circuitBreakerRegistry);
    
    // Create the enhanced agent manager
    this.agentManager = new EnhancedAgentManager(this.enhancedBus);
    
    log('Agent resilience integration created', 'resilience');
  }
  
  /**
   * Initialize the resilience integration
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Initialize the enhanced bus
    await this.enhancedBus.initialize();
    
    // Initialize the agent manager
    await this.agentManager.initialize();
    
    this.initialized = true;
    log('Agent resilience integration initialized', 'resilience');
  }
  
  /**
   * Register an agent with resilience features
   */
  public registerAgent(config: AgentConfig): void {
    this.verifyInitialized();
    
    this.agentManager.registerAgent(config);
    log(`Registered agent ${config.agentId} with resilience features`, 'resilience');
  }
  
  /**
   * Start all registered agents
   */
  public async startAllAgents(): Promise<void> {
    this.verifyInitialized();
    
    await this.agentManager.startAllAgents();
    log('Started all agents with resilience features', 'resilience');
  }
  
  /**
   * Start a specific agent
   */
  public async startAgent(agentId: string): Promise<void> {
    this.verifyInitialized();
    
    await this.agentManager.startAgent(agentId);
    log(`Started agent ${agentId} with resilience features`, 'resilience');
  }
  
  /**
   * Stop a specific agent
   */
  public async stopAgent(agentId: string): Promise<void> {
    this.verifyInitialized();
    
    await this.agentManager.stopAgent(agentId);
    log(`Stopped agent ${agentId}`, 'resilience');
  }
  
  /**
   * Restart a specific agent
   */
  public async restartAgent(agentId: string): Promise<void> {
    this.verifyInitialized();
    
    await this.agentManager.restartAgent(agentId);
    log(`Restarted agent ${agentId}`, 'resilience');
  }
  
  /**
   * Get the enhanced communication bus
   */
  public getEnhancedBus(): EnhancedCommunicationBus {
    this.verifyInitialized();
    
    return this.enhancedBus;
  }
  
  /**
   * Get the circuit breaker registry
   */
  public getCircuitBreakerRegistry(): CircuitBreakerRegistry {
    return this.circuitBreakerRegistry;
  }
  
  /**
   * Get the enhanced agent manager
   */
  public getAgentManager(): EnhancedAgentManager {
    this.verifyInitialized();
    
    return this.agentManager;
  }
  
  /**
   * Get health of all agents
   */
  public getSystemHealth(): Record<string, AgentHealth> {
    this.verifyInitialized();
    
    const agentHealth = this.agentManager.getAllAgentsHealth();
    const circuitBreakerStats = this.circuitBreakerRegistry.getAllStats();
    
    // Combine with circuit breaker stats for a comprehensive health view
    for (const [agentId, health] of Object.entries(agentHealth)) {
      if (circuitBreakerStats[agentId]) {
        if (!health.metrics) {
          health.metrics = {};
        }
        health.metrics.circuitBreaker = circuitBreakerStats[agentId];
      }
    }
    
    return agentHealth;
  }
  
  /**
   * Get health of a specific agent
   */
  public getAgentHealth(agentId: string): AgentHealth | undefined {
    this.verifyInitialized();
    
    const health = this.agentManager.getAgentHealth(agentId);
    if (!health) {
      return undefined;
    }
    
    // Add circuit breaker stats to health
    const circuitStats = this.circuitBreakerRegistry.getStats(agentId);
    if (!health.metrics) {
      health.metrics = {};
    }
    health.metrics.circuitBreaker = circuitStats;
    
    return health;
  }
  
  /**
   * Reset a circuit breaker for an agent
   */
  public resetCircuitBreaker(agentId: string): boolean {
    return this.circuitBreakerRegistry.resetBreaker(agentId);
  }
  
  /**
   * Get all unhealthy agents
   */
  public getUnhealthyAgents(): string[] {
    this.verifyInitialized();
    
    return this.agentManager.getUnhealthyAgents();
  }
  
  /**
   * Get all circuit breakers in open state
   */
  public getOpenCircuits(): string[] {
    // Import CircuitState from circuit-breaker.ts
    const { CircuitState } = require('../utils/circuit-breaker');
    return this.circuitBreakerRegistry.getBreakersInState(CircuitState.OPEN);
  }
  
  /**
   * Run a diagnostic test on the resilience system
   */
  public async runDiagnostic(): Promise<Record<string, any>> {
    this.verifyInitialized();
    
    const diagnostic: Record<string, any> = {
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        total: this.circuitBreakerRegistry.getBreakerCount(),
        stateCounts: this.circuitBreakerRegistry.getStateCount(),
        openCircuits: this.getOpenCircuits()
      },
      agents: {
        health: this.getSystemHealth(),
        unhealthy: this.getUnhealthyAgents()
      }
    };
    
    return diagnostic;
  }
  
  /**
   * Simulate agent failure (for testing)
   */
  public simulateAgentFailure(agentId: string): void {
    this.verifyInitialized();
    
    this.agentManager.simulateAgentFailure(agentId);
    log(`Simulated failure of agent ${agentId}`, 'resilience');
  }
  
  /**
   * Shutdown all resilience features
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    log('Shutting down agent resilience integration', 'resilience');
    
    // Shutdown the agent manager
    await this.agentManager.shutdown();
    
    // Dispose circuit breakers
    this.circuitBreakerRegistry.dispose();
    
    this.initialized = false;
    log('Agent resilience integration shutdown complete', 'resilience');
  }
  
  /**
   * Verify that the resilience integration is initialized
   */
  private verifyInitialized(): void {
    if (!this.initialized) {
      throw new Error('Agent resilience integration not initialized. Call initialize() first.');
    }
  }
}