/**
 * Enhanced Agent Manager
 * 
 * Manages agent lifecycle with added reliability features:
 * - Self-healing for crashed agents
 * - Health checking
 * - Circuit breaker integration for agent communication
 * - Centralized agent metrics and monitoring
 */

import { BaseAgent } from './base-agent';
import { AgentCommunicationBus } from '@shared/protocols/agent-communication';
import { AgentStatus, AgentType } from '@shared/protocols/agent-communication';
import { CircuitBreakerRegistry } from '../utils/circuit-breaker-registry';
import { DataValidationAgent } from './data-validation-agent';
// Import other agent types as needed

export interface AgentConfig {
  agentId: string;
  agentType: AgentType;
  settings?: Record<string, any>;
  healthCheckIntervalMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
}

export interface AgentHealth {
  agentId: string;
  status: AgentStatus;
  healthCheck: {
    lastCheckTime: number;
    isHealthy: boolean;
    consecutiveFailures: number;
    restartAttempts: number;
  };
  metrics: {
    uptime: number;
    messagesSent: number;
    messagesReceived: number;
    errorCount: number;
  };
}

export class EnhancedAgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private agentConfigs: Map<string, AgentConfig> = new Map();
  private healthStatuses: Map<string, AgentHealth> = new Map();
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  private communicationBus: AgentCommunicationBus;
  private circuitBreakerRegistry: CircuitBreakerRegistry;
  private isInitialized: boolean = false;

  constructor(communicationBus: AgentCommunicationBus) {
    this.communicationBus = communicationBus;
    this.circuitBreakerRegistry = new CircuitBreakerRegistry();
    
    console.log('Enhanced Agent Manager created');
  }

  /**
   * Initialize the agent manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Agent manager is already initialized');
      return;
    }

    // Set up global error handlers
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));

    this.isInitialized = true;
    console.log('Enhanced Agent Manager initialized');
  }

  /**
   * Register an agent with the manager
   */
  public registerAgent(config: AgentConfig): void {
    const { agentId, agentType, settings = {} } = config;
    
    // Check if agent already exists
    if (this.agents.has(agentId)) {
      console.warn(`Agent ${agentId} is already registered`);
      return;
    }
    
    // Store configuration
    this.agentConfigs.set(agentId, {
      ...config,
      healthCheckIntervalMs: config.healthCheckIntervalMs || 60000, // Default 1 minute
      retryDelayMs: config.retryDelayMs || 5000, // Default 5 seconds
      maxRetries: config.maxRetries || 3 // Default 3 retries
    });
    
    // Initialize health status
    this.initializeHealthStatus(agentId);
    
    console.log(`Agent ${agentId} registered with type ${agentType}`);
  }

  /**
   * Create and start all registered agents
   */
  public async startAllAgents(): Promise<void> {
    const startPromises: Promise<void>[] = [];
    
    for (const agentId of this.agentConfigs.keys()) {
      startPromises.push(this.startAgent(agentId));
    }
    
    await Promise.all(startPromises);
    console.log(`Started ${startPromises.length} agents`);
  }

  /**
   * Create and start a specific agent
   */
  public async startAgent(agentId: string): Promise<void> {
    const config = this.agentConfigs.get(agentId);
    if (!config) {
      throw new Error(`No configuration found for agent ${agentId}`);
    }
    
    try {
      console.log(`Starting agent ${agentId}`);
      
      // Create the agent based on type
      const agent = this.createAgentInstance(config);
      
      // Store the agent
      this.agents.set(agentId, agent);
      
      // Initialize the agent
      await agent.initialize();
      
      // Start health checking
      this.startHealthCheck(agentId);
      
      // Update health status
      const health = this.healthStatuses.get(agentId)!;
      health.status = agent.getStatus();
      health.healthCheck.isHealthy = true;
      health.healthCheck.lastCheckTime = Date.now();
      
      console.log(`Agent ${agentId} started successfully`);
    } catch (error) {
      console.error(`Failed to start agent ${agentId}:`, error);
      
      // Update health status
      const health = this.healthStatuses.get(agentId)!;
      health.status = AgentStatus.ERROR;
      health.healthCheck.isHealthy = false;
      health.healthCheck.lastCheckTime = Date.now();
      health.healthCheck.consecutiveFailures++;
      
      // Attempt retry if configured
      if (health.healthCheck.restartAttempts < config.maxRetries!) {
        console.log(`Scheduling restart for agent ${agentId} in ${config.retryDelayMs}ms`);
        setTimeout(() => {
          health.healthCheck.restartAttempts++;
          this.startAgent(agentId);
        }, config.retryDelayMs);
      } else {
        console.error(`Maximum restart attempts (${config.maxRetries}) reached for agent ${agentId}`);
      }
      
      throw error;
    }
  }

  /**
   * Get an agent by ID
   */
  public getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get an agent's health status
   */
  public getAgentHealth(agentId: string): AgentHealth | undefined {
    return this.healthStatuses.get(agentId);
  }

  /**
   * Get health status for all agents
   */
  public getAllAgentsHealth(): Record<string, AgentHealth> {
    const allHealth: Record<string, AgentHealth> = {};
    
    for (const [agentId, health] of this.healthStatuses.entries()) {
      allHealth[agentId] = health;
    }
    
    return allHealth;
  }

  /**
   * Restart a specific agent
   */
  public async restartAgent(agentId: string): Promise<void> {
    console.log(`Restarting agent ${agentId}`);
    
    // Stop the agent if it's running
    await this.stopAgent(agentId);
    
    // Reset health check counters
    const health = this.healthStatuses.get(agentId);
    if (health) {
      health.healthCheck.consecutiveFailures = 0;
      health.healthCheck.restartAttempts = 0;
    }
    
    // Start the agent again
    await this.startAgent(agentId);
  }

  /**
   * Stop a specific agent
   */
  public async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`No running agent found with ID ${agentId}`);
      return;
    }
    
    console.log(`Stopping agent ${agentId}`);
    
    // Stop health check
    this.stopHealthCheck(agentId);
    
    try {
      // Shut down the agent
      await agent.shutdown();
      console.log(`Agent ${agentId} stopped successfully`);
    } catch (error) {
      console.error(`Error stopping agent ${agentId}:`, error);
      // We still want to remove it from our map
    }
    
    // Remove from active agents
    this.agents.delete(agentId);
    
    // Update health status
    const health = this.healthStatuses.get(agentId);
    if (health) {
      health.status = AgentStatus.OFFLINE;
    }
  }

  /**
   * Stop all agents
   */
  public async stopAllAgents(): Promise<void> {
    console.log('Stopping all agents');
    
    const stopPromises: Promise<void>[] = [];
    
    for (const agentId of this.agents.keys()) {
      stopPromises.push(this.stopAgent(agentId));
    }
    
    await Promise.all(stopPromises);
    console.log(`Stopped ${stopPromises.length} agents`);
  }

  /**
   * Shut down the agent manager and clean up resources
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    console.log('Shutting down Enhanced Agent Manager');
    
    // Stop all agents
    await this.stopAllAgents();
    
    // Clean up circuit breakers
    this.circuitBreakerRegistry.dispose();
    
    // Remove global error handlers
    // Note: In a real system, we'd need to store and remove specific handler references
    
    this.isInitialized = false;
    console.log('Enhanced Agent Manager shut down successfully');
  }

  /**
   * Create an agent instance based on its type
   */
  private createAgentInstance(config: AgentConfig): BaseAgent {
    const { agentId, agentType, settings = {} } = config;
    
    switch (agentType) {
      case AgentType.DATA_VALIDATION:
        return new DataValidationAgent(agentId, this.communicationBus, settings);
        
      // Add cases for other agent types here
      
      default:
        throw new Error(`Unsupported agent type: ${agentType}`);
    }
  }

  /**
   * Initialize health status for an agent
   */
  private initializeHealthStatus(agentId: string): void {
    this.healthStatuses.set(agentId, {
      agentId,
      status: AgentStatus.OFFLINE,
      healthCheck: {
        lastCheckTime: 0,
        isHealthy: false,
        consecutiveFailures: 0,
        restartAttempts: 0
      },
      metrics: {
        uptime: 0,
        messagesSent: 0,
        messagesReceived: 0,
        errorCount: 0
      }
    });
  }

  /**
   * Start periodic health checking for an agent
   */
  private startHealthCheck(agentId: string): void {
    const config = this.agentConfigs.get(agentId);
    if (!config) return;
    
    // Clear any existing health check
    this.stopHealthCheck(agentId);
    
    // Start a new health check interval
    const interval = setInterval(
      () => this.checkAgentHealth(agentId),
      config.healthCheckIntervalMs
    );
    
    this.healthChecks.set(agentId, interval);
    console.log(`Started health check for agent ${agentId} at ${config.healthCheckIntervalMs}ms intervals`);
  }

  /**
   * Stop health checking for an agent
   */
  private stopHealthCheck(agentId: string): void {
    const interval = this.healthChecks.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.healthChecks.delete(agentId);
      console.log(`Stopped health check for agent ${agentId}`);
    }
  }

  /**
   * Check the health of an agent
   */
  private async checkAgentHealth(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    const health = this.healthStatuses.get(agentId);
    
    if (!agent || !health) {
      console.warn(`Cannot check health for missing agent: ${agentId}`);
      return;
    }
    
    try {
      // Update last check time
      health.healthCheck.lastCheckTime = Date.now();
      
      // Get current agent status
      const status = agent.getStatus();
      health.status = status;
      
      // Check if agent is in error state
      const isHealthy = status !== AgentStatus.ERROR;
      health.healthCheck.isHealthy = isHealthy;
      
      if (isHealthy) {
        // Reset consecutive failures on success
        health.healthCheck.consecutiveFailures = 0;
      } else {
        // Increment consecutive failures
        health.healthCheck.consecutiveFailures++;
        console.warn(`Agent ${agentId} health check failed, consecutive failures: ${health.healthCheck.consecutiveFailures}`);
        
        // Get config for retry thresholds
        const config = this.agentConfigs.get(agentId);
        if (config && health.healthCheck.consecutiveFailures >= 3) {
          console.error(`Agent ${agentId} has failed ${health.healthCheck.consecutiveFailures} consecutive health checks, attempting restart`);
          
          // Only restart if we haven't exceeded max retries
          if (health.healthCheck.restartAttempts < config.maxRetries!) {
            health.healthCheck.restartAttempts++;
            await this.restartAgent(agentId);
          } else {
            console.error(`Maximum restart attempts (${config.maxRetries}) reached for agent ${agentId}`);
          }
        }
      }
      
      // Update metrics if available
      const metrics = agent.getMetrics?.();
      if (metrics) {
        health.metrics = {
          ...health.metrics,
          ...metrics
        };
      }
    } catch (error) {
      console.error(`Error during health check for agent ${agentId}:`, error);
      
      health.healthCheck.isHealthy = false;
      health.healthCheck.consecutiveFailures++;
      health.status = AgentStatus.ERROR;
      health.metrics.errorCount++;
    }
  }

  /**
   * Handle uncaught exceptions at the process level
   */
  private handleUncaughtException(error: Error): void {
    console.error('PROCESS UNCAUGHT EXCEPTION:', error);
    // In a production system, we might want to notify monitoring systems here
    // Do not exit the process, as we want to maintain service availability
  }

  /**
   * Handle unhandled promise rejections at the process level
   */
  private handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    console.error('PROCESS UNHANDLED REJECTION:', reason);
    // In a production system, we might want to notify monitoring systems here
  }
}