/**
 * Enhanced Agent Manager
 * 
 * Extends the base agent manager with resilience features:
 * - Self-healing capabilities
 * - Health monitoring
 * - Agent lifecycle management
 */

import { BaseAgent } from './base-agent';
import { EnhancedCommunicationBus } from '@shared/protocols/enhanced-agent-communication';
import { AgentType, AgentStatus } from '@shared/protocols/agent-communication';
import { log } from '../vite';

/**
 * Agent configuration for registration
 */
export interface AgentConfig {
  agentId: string;
  agentType: AgentType;
  healthCheckIntervalMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  settings?: Record<string, any>;
}

/**
 * Agent health information
 */
export interface AgentHealth {
  agentId: string;
  status: string;
  healthCheck: {
    isHealthy: boolean;
    lastCheckTime: number;
    consecutiveFailures: number;
    lastError?: string;
  };
  metrics?: Record<string, any>;
  lastStatusChangeTime: number;
}

/**
 * Enhanced agent manager with self-healing capabilities
 */
export class EnhancedAgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private agentConfigs: Map<string, AgentConfig> = new Map();
  private agentHealth: Map<string, AgentHealth> = new Map();
  private restartTimers: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private bus: EnhancedCommunicationBus;
  
  constructor(bus: EnhancedCommunicationBus) {
    this.bus = bus;
    log('Enhanced agent manager initialized', 'enhanced-manager');
  }
  
  /**
   * Initialize the enhanced agent manager
   */
  public async initialize(): Promise<void> {
    // Set up bus listeners
    // This would be used to listen for agent status updates, etc.
    
    log('Enhanced agent manager started', 'enhanced-manager');
  }
  
  /**
   * Register an agent with the manager
   */
  public registerAgent(config: AgentConfig): void {
    const { agentId, agentType } = config;
    
    // Store the agent configuration
    this.agentConfigs.set(agentId, {
      ...config,
      healthCheckIntervalMs: config.healthCheckIntervalMs || 30000,  // Default: 30 seconds
      retryDelayMs: config.retryDelayMs || 5000,  // Default: 5 seconds
      maxRetries: config.maxRetries || 3  // Default: 3 retries
    });
    
    // Initialize agent health
    this.agentHealth.set(agentId, {
      agentId,
      status: AgentStatus.UNKNOWN,
      healthCheck: {
        isHealthy: false,
        lastCheckTime: Date.now(),
        consecutiveFailures: 0
      },
      lastStatusChangeTime: Date.now()
    });
    
    log(`Registered agent ${agentId} of type ${agentType}`, 'enhanced-manager');
  }
  
  /**
   * Start all registered agents
   */
  public async startAllAgents(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Get all registered agent IDs
    const agentIds = Array.from(this.agentConfigs.keys());
    
    // Start each agent
    for (const agentId of agentIds) {
      promises.push(this.startAgent(agentId));
    }
    
    // Wait for all agents to start
    await Promise.all(promises);
    
    log(`Started ${promises.length} agents`, 'enhanced-manager');
  }
  
  /**
   * Start a specific agent
   */
  public async startAgent(agentId: string): Promise<void> {
    // Check if agent is registered
    if (!this.agentConfigs.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }
    
    // Check if agent is already started
    if (this.agents.has(agentId)) {
      log(`Agent ${agentId} is already started`, 'enhanced-manager');
      return;
    }
    
    const config = this.agentConfigs.get(agentId)!;
    
    try {
      // This is a placeholder. In a real implementation, we would:
      // 1. Create the appropriate agent instance based on the agent type
      // 2. Initialize it
      // 3. Start it
      
      // For this demo, we'll just log the start
      log(`Starting agent ${agentId}`, 'enhanced-manager');
      
      // Update agent health
      this.updateAgentHealth(agentId, {
        status: AgentStatus.STARTING
      });
      
      // In a real implementation, we would do something like:
      // const agent = this.createAgentInstance(config);
      // await agent.initialize();
      // await agent.start();
      // this.agents.set(agentId, agent);
      
      // Set up health check for this agent
      this.startHealthCheck(agentId);
      
      // Update agent health
      this.updateAgentHealth(agentId, {
        status: AgentStatus.READY,
        healthCheck: {
          isHealthy: true,
          lastCheckTime: Date.now(),
          consecutiveFailures: 0
        }
      });
      
      log(`Agent ${agentId} started successfully`, 'enhanced-manager');
    } catch (error) {
      // Handle start failure
      log(`Error starting agent ${agentId}: ${error}`, 'enhanced-manager');
      
      // Update agent health
      this.updateAgentHealth(agentId, {
        status: AgentStatus.ERROR,
        healthCheck: {
          isHealthy: false,
          lastCheckTime: Date.now(),
          consecutiveFailures: 1,
          lastError: String(error)
        }
      });
      
      // Attempt to retry starting the agent
      this.scheduleAgentRestart(agentId);
    }
  }
  
  /**
   * Stop a specific agent
   */
  public async stopAgent(agentId: string): Promise<void> {
    if (!this.agents.has(agentId)) {
      log(`Agent ${agentId} is not running`, 'enhanced-manager');
      return;
    }
    
    try {
      // Get the agent
      const agent = this.agents.get(agentId)!;
      
      // Update agent health
      this.updateAgentHealth(agentId, {
        status: AgentStatus.STOPPING
      });
      
      // Stop the agent
      // await agent.stop();
      log(`Stopping agent ${agentId}`, 'enhanced-manager');
      
      // Remove from active agents
      this.agents.delete(agentId);
      
      // Stop health check
      this.stopHealthCheck(agentId);
      
      // Cancel any pending restart
      if (this.restartTimers.has(agentId)) {
        clearTimeout(this.restartTimers.get(agentId)!);
        this.restartTimers.delete(agentId);
      }
      
      // Update agent health
      this.updateAgentHealth(agentId, {
        status: AgentStatus.OFFLINE as any, // Treat as offline when stopped
        healthCheck: {
          isHealthy: false,
          lastCheckTime: Date.now(),
          consecutiveFailures: 0
        }
      });
      
      log(`Agent ${agentId} stopped successfully`, 'enhanced-manager');
    } catch (error) {
      log(`Error stopping agent ${agentId}: ${error}`, 'enhanced-manager');
      
      // Force removal from active agents
      this.agents.delete(agentId);
      
      // Still mark it as offline
      this.updateAgentHealth(agentId, {
        status: AgentStatus.OFFLINE as any,
        healthCheck: {
          isHealthy: false,
          lastCheckTime: Date.now(),
          consecutiveFailures: 0
        }
      });
    }
  }
  
  /**
   * Restart a specific agent
   */
  public async restartAgent(agentId: string): Promise<void> {
    log(`Restarting agent ${agentId}`, 'enhanced-manager');
    
    // Update agent health
    this.updateAgentHealth(agentId, {
      status: AgentStatus.RESTARTING
    });
    
    // Stop the agent if it's running
    if (this.agents.has(agentId)) {
      await this.stopAgent(agentId);
    }
    
    // Start the agent again
    await this.startAgent(agentId);
  }
  
  /**
   * Get the health of all agents
   */
  public getAllAgentsHealth(): Record<string, AgentHealth> {
    const health: Record<string, AgentHealth> = {};
    
    for (const [agentId, agentHealth] of this.agentHealth) {
      health[agentId] = { ...agentHealth };
    }
    
    return health;
  }
  
  /**
   * Get the health of a specific agent
   */
  public getAgentHealth(agentId: string): AgentHealth | undefined {
    if (this.agentHealth.has(agentId)) {
      return { ...this.agentHealth.get(agentId)! };
    }
    return undefined;
  }
  
  /**
   * Get all unhealthy agents
   */
  public getUnhealthyAgents(): string[] {
    const unhealthyAgents: string[] = [];
    
    for (const [agentId, health] of this.agentHealth) {
      if (!health.healthCheck.isHealthy) {
        unhealthyAgents.push(agentId);
      }
    }
    
    return unhealthyAgents;
  }
  
  /**
   * Simulate an agent failure (for testing)
   */
  public simulateAgentFailure(agentId: string): void {
    if (!this.agents.has(agentId)) {
      log(`Agent ${agentId} is not running, cannot simulate failure`, 'enhanced-manager');
      return;
    }
    
    log(`Simulating failure of agent ${agentId}`, 'enhanced-manager');
    
    // Update agent health
    this.updateAgentHealth(agentId, {
      status: AgentStatus.ERROR,
      healthCheck: {
        isHealthy: false,
        lastCheckTime: Date.now(),
        consecutiveFailures: 1,
        lastError: 'Simulated failure'
      }
    });
    
    // Trigger self-healing
    this.handleAgentFailure(agentId);
  }
  
  /**
   * Shutdown the manager and all agents
   */
  public async shutdown(): Promise<void> {
    log('Shutting down enhanced agent manager', 'enhanced-manager');
    
    // Stop all health checks
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();
    
    // Cancel all pending restarts
    for (const timer of this.restartTimers.values()) {
      clearTimeout(timer);
    }
    this.restartTimers.clear();
    
    // Stop all agents
    const promises: Promise<void>[] = [];
    for (const agentId of this.agents.keys()) {
      promises.push(this.stopAgent(agentId));
    }
    
    await Promise.all(promises);
    this.agents.clear();
    
    log('Enhanced agent manager shutdown complete', 'enhanced-manager');
  }
  
  /**
   * Start health check for a specific agent
   */
  private startHealthCheck(agentId: string): void {
    // Check if health check is already running
    if (this.healthCheckTimers.has(agentId)) {
      clearInterval(this.healthCheckTimers.get(agentId)!);
    }
    
    const config = this.agentConfigs.get(agentId)!;
    const interval = config.healthCheckIntervalMs || 30000;
    
    // Set up interval for health check
    const timer = setInterval(() => {
      this.checkAgentHealth(agentId);
    }, interval);
    
    this.healthCheckTimers.set(agentId, timer);
    log(`Started health check for agent ${agentId}, interval: ${interval}ms`, 'enhanced-manager');
  }
  
  /**
   * Stop health check for a specific agent
   */
  private stopHealthCheck(agentId: string): void {
    if (this.healthCheckTimers.has(agentId)) {
      clearInterval(this.healthCheckTimers.get(agentId)!);
      this.healthCheckTimers.delete(agentId);
      log(`Stopped health check for agent ${agentId}`, 'enhanced-manager');
    }
  }
  
  /**
   * Check health of a specific agent
   */
  private async checkAgentHealth(agentId: string): Promise<void> {
    if (!this.agents.has(agentId)) {
      // Skip health check for agents that are not running
      return;
    }
    
    try {
      // In a real implementation, we would check the agent's health
      const agent = this.agents.get(agentId)!;
      
      // Update last check time
      const health = this.agentHealth.get(agentId)!;
      health.healthCheck.lastCheckTime = Date.now();
      
      // For this demo, we'll just assume the agent is healthy
      // In a real implementation, we would do something like:
      // const metrics = await agent.getMetrics();
      // const isHealthy = metrics.status === 'healthy';
      
      const isHealthy = true; // Placeholder
      
      if (isHealthy) {
        // Agent is healthy
        if (!health.healthCheck.isHealthy) {
          // Agent has recovered
          log(`Agent ${agentId} has recovered`, 'enhanced-manager');
        }
        
        // Update health
        this.updateAgentHealth(agentId, {
          status: AgentStatus.READY,
          healthCheck: {
            isHealthy: true,
            consecutiveFailures: 0
          },
          metrics: {} // Placeholder for real metrics
        });
      } else {
        // Agent is unhealthy
        health.healthCheck.consecutiveFailures++;
        
        this.updateAgentHealth(agentId, {
          status: AgentStatus.DEGRADED,
          healthCheck: {
            isHealthy: false,
            consecutiveFailures: health.healthCheck.consecutiveFailures
          }
        });
        
        log(`Agent ${agentId} health check failed, consecutive failures: ${health.healthCheck.consecutiveFailures}`, 'enhanced-manager');
        
        // If we've reached a threshold, trigger self-healing
        const config = this.agentConfigs.get(agentId)!;
        if (health.healthCheck.consecutiveFailures >= 3) {
          this.handleAgentFailure(agentId);
        }
      }
    } catch (error) {
      // Health check itself failed
      log(`Error checking health of agent ${agentId}: ${error}`, 'enhanced-manager');
      
      // Update health
      const health = this.agentHealth.get(agentId)!;
      health.healthCheck.consecutiveFailures++;
      health.healthCheck.lastError = String(error);
      
      this.updateAgentHealth(agentId, {
        status: AgentStatus.ERROR,
        healthCheck: {
          isHealthy: false,
          consecutiveFailures: health.healthCheck.consecutiveFailures,
          lastError: String(error)
        }
      });
      
      // If we've reached a threshold, trigger self-healing
      if (health.healthCheck.consecutiveFailures >= 3) {
        this.handleAgentFailure(agentId);
      }
    }
  }
  
  /**
   * Handle agent failure and trigger self-healing
   */
  private handleAgentFailure(agentId: string): void {
    const config = this.agentConfigs.get(agentId)!;
    const health = this.agentHealth.get(agentId)!;
    
    // Check if we've already reached the max retries
    if (health.healthCheck.consecutiveFailures > (config.maxRetries || 3) * 2) {
      log(`Agent ${agentId} has failed too many times, not attempting to restart`, 'enhanced-manager');
      return;
    }
    
    // Schedule a restart
    this.scheduleAgentRestart(agentId);
  }
  
  /**
   * Schedule an agent restart
   */
  private scheduleAgentRestart(agentId: string): void {
    // Cancel any existing restart
    if (this.restartTimers.has(agentId)) {
      clearTimeout(this.restartTimers.get(agentId)!);
    }
    
    const config = this.agentConfigs.get(agentId)!;
    const delay = config.retryDelayMs || 5000;
    
    log(`Scheduling restart of agent ${agentId} in ${delay}ms`, 'enhanced-manager');
    
    // Schedule restart
    const timer = setTimeout(async () => {
      this.restartTimers.delete(agentId);
      
      try {
        await this.restartAgent(agentId);
      } catch (error) {
        log(`Error restarting agent ${agentId}: ${error}`, 'enhanced-manager');
        
        // Update agent health
        this.updateAgentHealth(agentId, {
          status: AgentStatus.ERROR,
          healthCheck: {
            isHealthy: false,
            lastCheckTime: Date.now(),
            consecutiveFailures: this.agentHealth.get(agentId)!.healthCheck.consecutiveFailures + 1,
            lastError: String(error)
          }
        });
        
        // Try again with exponential backoff
        const newDelay = Math.min(delay * 2, 60000); // Cap at 1 minute
        
        // Update the retry delay in config
        this.agentConfigs.set(agentId, {
          ...config,
          retryDelayMs: newDelay
        });
        
        // Schedule another restart
        this.scheduleAgentRestart(agentId);
      }
    }, delay);
    
    this.restartTimers.set(agentId, timer);
  }
  
  /**
   * Update agent health
   */
  private updateAgentHealth(agentId: string, update: Partial<AgentHealth>): void {
    if (!this.agentHealth.has(agentId)) {
      return;
    }
    
    const currentHealth = this.agentHealth.get(agentId)!;
    
    // Check if status is changing
    const statusChanged = update.status && update.status !== currentHealth.status;
    
    // Create new health object with updates
    const newHealth: AgentHealth = {
      ...currentHealth,
      ...update,
      healthCheck: {
        ...currentHealth.healthCheck,
        ...(update.healthCheck || {})
      },
      metrics: {
        ...(currentHealth.metrics || {}),
        ...(update.metrics || {})
      }
    };
    
    // Update last status change time if status changed
    if (statusChanged) {
      newHealth.lastStatusChangeTime = Date.now();
      log(`Agent ${agentId} status changed from ${currentHealth.status} to ${update.status}`, 'enhanced-manager');
    }
    
    // Save updated health
    this.agentHealth.set(agentId, newHealth);
  }
}