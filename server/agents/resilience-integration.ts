/**
 * Agent Resilience Integration
 * 
 * Provides a facade for integrating all resilience-related features:
 * - Circuit breaker integration
 * - Enhanced agent management
 * - Resilience testing
 * - Health monitoring
 */

import { AgentCommunicationBus } from '@shared/protocols/agent-communication';
import { CircuitBreakerRegistry } from '../utils/circuit-breaker-registry';
import { EnhancedAgentManager, AgentConfig } from './enhanced-agent-manager';
import { AgentResilienceTester, TestOptions, TestResult } from '../utils/agent-resilience-tester';
import { EnhancedCommunicationBus } from '@shared/protocols/enhanced-agent-communication';

/**
 * Agent Resilience Integration Facade
 */
export class AgentResilienceIntegration {
  private circuitBreakerRegistry: CircuitBreakerRegistry;
  private agentManager: EnhancedAgentManager;
  private resilienceTester: AgentResilienceTester;
  private enhancedBus: EnhancedCommunicationBus;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(baseCommunicationBus: AgentCommunicationBus) {
    // Create circuit breaker registry
    this.circuitBreakerRegistry = new CircuitBreakerRegistry({
      failureThreshold: 3,
      resetTimeout: 15000,  // 15 seconds to reset
      halfOpenSuccessThreshold: 2
    });
    
    // Create enhanced communication bus with circuit breaker integration
    this.enhancedBus = new EnhancedCommunicationBus(
      baseCommunicationBus,
      this.circuitBreakerRegistry
    );
    
    // Create enhanced agent manager
    this.agentManager = new EnhancedAgentManager(this.enhancedBus);
    
    // Create resilience tester
    this.resilienceTester = new AgentResilienceTester(
      this.agentManager,
      this.circuitBreakerRegistry
    );
    
    console.log('Agent Resilience Integration initialized');
  }
  
  /**
   * Initialize the resilience integration
   */
  public async initialize(): Promise<void> {
    await this.agentManager.initialize();
    
    // Start health check interval
    this.healthCheckInterval = setInterval(() => this.checkSystemHealth(), 60000);
    
    console.log('Agent Resilience Integration started');
  }
  
  /**
   * Register an agent with resilience features
   */
  public registerAgent(config: AgentConfig): void {
    this.agentManager.registerAgent(config);
    
    // Ensure circuit breaker exists for the agent
    if (!this.circuitBreakerRegistry.hasBreaker(config.agentId)) {
      this.circuitBreakerRegistry.getBreaker(config.agentId);
    }
  }
  
  /**
   * Start all registered agents
   */
  public async startAllAgents(): Promise<void> {
    await this.agentManager.startAllAgents();
  }
  
  /**
   * Get the enhanced communication bus
   */
  public getEnhancedBus(): EnhancedCommunicationBus {
    return this.enhancedBus;
  }
  
  /**
   * Get the enhanced agent manager
   */
  public getAgentManager(): EnhancedAgentManager {
    return this.agentManager;
  }
  
  /**
   * Run a resilience test
   */
  public async runResilienceTest(options: TestOptions): Promise<string> {
    return this.resilienceTester.runTest(options);
  }
  
  /**
   * Get test results
   */
  public getTestResult(testId: string): TestResult | undefined {
    return this.resilienceTester.getTestResult(testId);
  }
  
  /**
   * Get all test results
   */
  public getAllTestResults(): TestResult[] {
    return this.resilienceTester.getAllTestResults();
  }
  
  /**
   * Get system health status
   */
  public getSystemHealth(): any {
    return {
      agents: this.agentManager.getAllAgentsHealth(),
      circuitBreakers: this.circuitBreakerRegistry.getAllStats(),
      timestamp: new Date()
    };
  }
  
  /**
   * Stop all agents and shutdown resilience integration
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down Agent Resilience Integration');
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Stop all agents
    await this.agentManager.shutdown();
    
    // Clean up circuit breakers
    this.circuitBreakerRegistry.dispose();
    
    console.log('Agent Resilience Integration shutdown complete');
  }
  
  /**
   * Periodically check system health and log any issues
   */
  private checkSystemHealth(): void {
    try {
      const health = this.getSystemHealth();
      const agentCount = Object.keys(health.agents).length;
      const healthyAgentCount = Object.values(health.agents)
        .filter((agent: any) => agent.healthCheck.isHealthy)
        .length;
      
      const circuitBreakerCount = Object.keys(health.circuitBreakers).length;
      const openCircuitCount = Object.values(health.circuitBreakers)
        .filter((breaker: any) => breaker.state === 'OPEN')
        .length;
      
      console.log(`System health: ${healthyAgentCount}/${agentCount} agents healthy, ` +
                 `${openCircuitCount}/${circuitBreakerCount} circuits open`);
      
      // Check for unhealthy agents and log warnings
      for (const [agentId, agent] of Object.entries(health.agents)) {
        if (!(agent as any).healthCheck.isHealthy) {
          console.warn(`Unhealthy agent detected: ${agentId}, ` +
                      `status: ${(agent as any).status}, ` +
                      `consecutive failures: ${(agent as any).healthCheck.consecutiveFailures}`);
        }
      }
      
      // Check for open circuit breakers and log warnings
      for (const [breaker, stats] of Object.entries(health.circuitBreakers)) {
        if ((stats as any).state === 'OPEN') {
          console.warn(`Open circuit breaker detected for ${breaker}: ` +
                      `failures: ${(stats as any).failures}, ` +
                      `last failure: ${new Date((stats as any).lastFailureTime).toISOString()}`);
        }
      }
    } catch (error) {
      console.error('Error checking system health:', error);
    }
  }
}