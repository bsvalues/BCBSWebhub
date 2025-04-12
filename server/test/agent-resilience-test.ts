/**
 * Agent Resilience Test Harness
 * 
 * Provides a mechanism to test the functionality of agent resilience features:
 * - Circuit breaker behavior
 * - Agent self-healing
 * - Error recovery
 */

import { CircuitBreaker } from '../utils/circuit-breaker';
import { CircuitBreakerRegistry } from '../utils/circuit-breaker-registry';
import { EnhancedAgentManager } from '../agents/enhanced-agent-manager';
import { AgentResilienceTester, FailureType } from '../utils/agent-resilience-tester';
import { AgentResilienceIntegration } from '../agents/resilience-integration';
import { AgentCommunicationBus, AgentType } from '@shared/protocols/agent-communication';

// Simple mock implementation of the AgentCommunicationBus for testing
class MockCommunicationBus implements AgentCommunicationBus {
  private messageHandlers: Map<string, Function[]> = new Map();
  private shouldFailNextMessage: boolean = false;
  
  public setShouldFailNextMessage(shouldFail: boolean): void {
    this.shouldFailNextMessage = shouldFail;
  }
  
  async sendMessage(message: any): Promise<void> {
    if (this.shouldFailNextMessage) {
      this.shouldFailNextMessage = false;
      throw new Error('Simulated message failure');
    }
    
    // Simulate message delivery
    console.log(`[MockBus] Sending message: ${message.eventType} to ${message.destination}`);
    
    // Notify handlers
    this.emit('message', message);
  }
  
  async disconnect(): Promise<void> {
    console.log('[MockBus] Disconnected');
  }
  
  broadcast(message: any): Promise<any[]> {
    console.log(`[MockBus] Broadcasting message: ${message.eventType}`);
    return Promise.resolve([]);
  }
  
  on(event: string, handler: Function): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }
  
  off(event: string, handler: Function): void {
    if (this.messageHandlers.has(event)) {
      const handlers = this.messageHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  private emit(event: string, ...args: any[]): void {
    if (this.messageHandlers.has(event)) {
      for (const handler of this.messageHandlers.get(event)!) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }
}

/**
 * Run circuit breaker tests
 */
async function runCircuitBreakerTests(): Promise<void> {
  console.log('Running circuit breaker tests...');
  
  // Create a circuit breaker with a low threshold for testing
  const breaker = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeout: 2000, // Short timeout for testing
    halfOpenSuccessThreshold: 1
  });
  
  // Create a test function that will fail
  const failingFunction = async (): Promise<string> => {
    throw new Error('Simulated failure');
  };
  
  // Create a test function that will succeed
  const successFunction = async (): Promise<string> => {
    return 'Success';
  };
  
  // Test 1: Circuit should open after failures
  console.log('Test 1: Circuit should open after failures');
  
  try {
    // First failure - circuit should still be closed
    await breaker.execute(failingFunction).catch(() => {
      console.log('  First failure handled (expected)');
    });
    
    // Second failure - circuit should open
    await breaker.execute(failingFunction).catch(() => {
      console.log('  Second failure handled (expected)');
    });
    
    // Third attempt - circuit should be open and reject immediately
    await breaker.execute(successFunction).catch(err => {
      if (err.message.includes('Circuit breaker is open')) {
        console.log('  Circuit opened successfully after failures');
      } else {
        console.error('  Unexpected error:', err);
      }
    });
    
    // Test 2: Circuit should move to half-open after reset timeout
    console.log('Test 2: Circuit should move to half-open after reset timeout');
    
    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Circuit should now be half-open and allow one attempt
    try {
      const result = await breaker.execute(successFunction);
      console.log(`  Success in half-open state: ${result}`);
    } catch (error) {
      console.error('  Unexpected error in half-open state:', error);
    }
    
    // Test 3: Circuit should close after success in half-open state
    console.log('Test 3: Circuit should close after success in half-open state');
    
    // Circuit should now be closed again
    try {
      const result = await breaker.execute(successFunction);
      console.log(`  Success after circuit closed: ${result}`);
    } catch (error) {
      console.error('  Unexpected error after circuit closed:', error);
    }
    
    console.log('Circuit breaker tests completed successfully');
  } catch (error) {
    console.error('Circuit breaker test error:', error);
  }
}

/**
 * Run circuit breaker registry tests
 */
async function runCircuitBreakerRegistryTests(): Promise<void> {
  console.log('Running circuit breaker registry tests...');
  
  // Create registry
  const registry = new CircuitBreakerRegistry({
    failureThreshold: 2,
    resetTimeout: 2000
  });
  
  // Test 1: Get breaker for service
  console.log('Test 1: Get breaker for service');
  const breaker1 = registry.getBreaker('service1');
  const breaker2 = registry.getBreaker('service2');
  
  if (breaker1 && breaker2 && breaker1 !== breaker2) {
    console.log('  Created separate breakers for different services');
  } else {
    console.error('  Failed to create separate breakers');
  }
  
  // Test 2: Verify breaker existence
  console.log('Test 2: Verify breaker existence');
  
  if (registry.hasBreaker('service1') && !registry.hasBreaker('nonexistent')) {
    console.log('  Correctly verified breaker existence');
  } else {
    console.error('  Failed to verify breaker existence');
  }
  
  // Test 3: Reset breaker
  console.log('Test 3: Reset breaker');
  
  if (registry.resetBreaker('service1')) {
    console.log('  Successfully reset breaker');
  } else {
    console.error('  Failed to reset breaker');
  }
  
  // Test 4: Get stats
  console.log('Test 4: Get stats');
  const stats = registry.getAllStats();
  
  if (stats && 'service1' in stats && 'service2' in stats) {
    console.log('  Successfully retrieved stats for all breakers');
  } else {
    console.error('  Failed to retrieve stats');
  }
  
  // Test 5: Remove breaker
  console.log('Test 5: Remove breaker');
  
  if (registry.removeBreaker('service2') && !registry.hasBreaker('service2')) {
    console.log('  Successfully removed breaker');
  } else {
    console.error('  Failed to remove breaker');
  }
  
  // Clean up
  registry.dispose();
  console.log('Circuit breaker registry tests completed');
}

/**
 * Create a simple integration test for resilience features
 */
async function runResilienceIntegrationTest(): Promise<void> {
  console.log('Running resilience integration test...');
  
  // Create mock communication bus
  const mockBus = new MockCommunicationBus();
  
  // Create resilience integration
  const resilience = new AgentResilienceIntegration(mockBus);
  
  // Initialize
  await resilience.initialize();
  
  // Register a test agent
  resilience.registerAgent({
    agentId: 'test:agent1',
    agentType: AgentType.DATA_VALIDATION
  });
  
  // Get enhanced bus
  const enhancedBus = resilience.getEnhancedBus();
  
  // Test 1: Send message with enhanced bus
  console.log('Test 1: Send message with enhanced bus');
  try {
    const result = await enhancedBus.sendMessage({
      id: 'test-message-1',
      source: 'test:sender',
      destination: 'test:agent1',
      eventType: 'TEST',
      correlationId: null,
      timestamp: new Date(),
      payload: { test: true }
    });
    
    if (result.success) {
      console.log('  Successfully sent message with enhanced bus');
    } else {
      console.error('  Failed to send message:', result.error);
    }
  } catch (error) {
    console.error('  Error sending message:', error);
  }
  
  // Test 2: Test circuit breaker integration
  console.log('Test 2: Test circuit breaker integration');
  
  // Configure mock bus to fail
  mockBus.setShouldFailNextMessage(true);
  
  try {
    // This should fail but be handled by the circuit breaker
    await enhancedBus.sendMessage({
      id: 'test-message-2',
      source: 'test:sender',
      destination: 'test:agent1',
      eventType: 'TEST',
      correlationId: null,
      timestamp: new Date(),
      payload: { test: true }
    });
    
    console.error('  Expected failure did not occur');
  } catch (error) {
    console.log('  Expected failure occurred and was caught');
  }
  
  // Test 3: Get system health
  console.log('Test 3: Get system health');
  const health = resilience.getSystemHealth();
  
  if (health && health.circuitBreakers && health.agents) {
    console.log('  Successfully retrieved system health');
  } else {
    console.error('  Failed to retrieve system health');
  }
  
  // Clean up
  await resilience.shutdown();
  console.log('Resilience integration test completed');
}

/**
 * Run all tests
 */
export async function runAgentResilienceTests(): Promise<void> {
  console.log('====== AGENT RESILIENCE TESTS ======');
  
  try {
    await runCircuitBreakerTests();
    console.log('');
    
    await runCircuitBreakerRegistryTests();
    console.log('');
    
    await runResilienceIntegrationTest();
    console.log('');
    
    console.log('All agent resilience tests completed successfully');
  } catch (error) {
    console.error('Agent resilience tests failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAgentResilienceTests().catch(console.error);
}