/**
 * Agent Resilience Integration Entry Point
 * 
 * This file provides an easy way to integrate the agent resilience features
 * into the main application. It initializes the circuit breaker registry,
 * enhanced agent manager, and resilience testing capabilities.
 */

import { AgentCommunicationBus, AgentType, AgentStatus } from '@shared/protocols/agent-communication';
import { AgentResilienceIntegration } from './resilience-integration';
import { DataValidationAgent } from './data-validation-agent';
import { FailureType } from '../utils/agent-resilience-tester';
import { log } from '../vite';

// List of agents to register with the resilience framework
const RESILIENT_AGENTS = [
  {
    agentId: 'data-validation:main',
    agentType: AgentType.DATA_VALIDATION,
    settings: {
      // Agent-specific settings
      rulesVersion: '2023-WA-1.2',
      strictValidation: true
    }
  },
  // Add other agents here
];

/**
 * Initialize the agent resilience features
 */
export async function initializeAgentResilience(
  communicationBus: AgentCommunicationBus
): Promise<AgentResilienceIntegration> {
  log('Initializing agent resilience features...', 'resilience');
  
  // Create resilience integration
  const resilience = new AgentResilienceIntegration(communicationBus);
  
  // Initialize it
  await resilience.initialize();
  
  // Register all agents
  RESILIENT_AGENTS.forEach(agent => {
    resilience.registerAgent({
      agentId: agent.agentId,
      agentType: agent.agentType,
      settings: agent.settings,
      // Default health check every minute
      healthCheckIntervalMs: 60000,
      // Retry 3 times with 5-second delay between attempts
      retryDelayMs: 5000,
      maxRetries: 3
    });
  });
  
  log('Agent resilience features initialized', 'resilience');
  
  return resilience;
}

/**
 * Start all registered agents
 */
export async function startResilientAgents(
  resilience: AgentResilienceIntegration
): Promise<void> {
  log('Starting resilient agents...', 'resilience');
  
  try {
    await resilience.startAllAgents();
    log('All resilient agents started successfully', 'resilience');
  } catch (error) {
    log(`Error starting resilient agents: ${error}`, 'resilience');
    throw error;
  }
}

/**
 * Run a diagnostic test on agent resilience
 */
export async function runAgentResilienceDiagnostic(
  resilience: AgentResilienceIntegration,
  agentId: string
): Promise<any> {
  log(`Running diagnostic test on agent ${agentId}...`, 'resilience');
  
  // Get agent health before test
  const initialHealth = resilience.getSystemHealth();
  
  // Run a simple message timeout test 
  const testId = await resilience.runResilienceTest({
    failureType: FailureType.MESSAGE_TIMEOUT,
    targetAgentId: agentId,
    failureRate: 1.0, // 100% failure rate for test
    failureCount: 5,  // 5 failures
    delayBetweenFailures: 100 // 100ms between failures
  });
  
  // Wait for test to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get test result
  const result = resilience.getTestResult(testId);
  
  // Get agent health after test
  const finalHealth = resilience.getSystemHealth();
  
  log(`Diagnostic test completed for agent ${agentId}`, 'resilience');
  
  return {
    testId,
    result,
    initialHealth,
    finalHealth,
    diagnosticComplete: true,
    timestamp: new Date()
  };
}

/**
 * Shutdown agent resilience features
 */
export async function shutdownAgentResilience(
  resilience: AgentResilienceIntegration
): Promise<void> {
  log('Shutting down agent resilience features...', 'resilience');
  
  try {
    await resilience.shutdown();
    log('Agent resilience features shut down successfully', 'resilience');
  } catch (error) {
    log(`Error shutting down agent resilience features: ${error}`, 'resilience');
    // Just log the error, but don't rethrow as we're shutting down
  }
}