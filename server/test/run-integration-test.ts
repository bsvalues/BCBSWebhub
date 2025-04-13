/**
 * Integration Test for Agent Resilience
 * 
 * This script tests the integration of all agent resilience features:
 * - Circuit breaker pattern
 * - Self-healing capabilities
 * - Health monitoring
 * 
 * Run with: tsx server/test/run-integration-test.ts
 */

import { AgentCommunicationBus } from '@shared/protocols/agent-communication';
import { EnhancedCommunicationBus } from '@shared/protocols/enhanced-agent-communication';
import { CircuitBreakerRegistry } from '../utils/circuit-breaker-registry';
import { EnhancedAgentManager } from '../agents/enhanced-agent-manager';
import { AgentResilienceTester, FailureType } from '../utils/agent-resilience-tester';
import { AgentResilienceIntegration } from '../agents/resilience-integration';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m' 
  },
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// Log with colors
function logInfo(message: string): void {
  console.log(`${colors.fg.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.fg.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message: string): void {
  console.log(`${colors.fg.yellow}[WARNING]${colors.reset} ${message}`);
}

function logError(message: string): void {
  console.log(`${colors.fg.red}[ERROR]${colors.reset} ${message}`);
}

function logSection(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}${colors.fg.magenta}${title}${colors.reset}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Run the integration test
 */
async function runIntegrationTest() {
  logSection('Starting Agent Resilience Integration Test');
  
  // Create the mock communication bus
  const mockBus = new MockCommunicationBus();
  
  // Create the circuit breaker registry
  const registry = new CircuitBreakerRegistry({
    failureThreshold: 3,
    resetTimeout: 5000, // 5 seconds for testing
    halfOpenSuccessThreshold: 1
  });
  
  // Create the enhanced communication bus
  const enhancedBus = new EnhancedCommunicationBus(mockBus as unknown as AgentCommunicationBus, registry);
  
  // Create the enhanced agent manager
  const agentManager = new EnhancedAgentManager(enhancedBus);
  
  // Create the agent resilience tester
  const resilienceTester = new AgentResilienceTester(agentManager, registry);
  
  // Create the agent resilience integration
  const resilience = new AgentResilienceIntegration(mockBus as unknown as AgentCommunicationBus);
  
  try {
    // Test 1: Basic Registration and Initialization
    logSection('Test 1: Basic Registration and Initialization');
    
    await resilience.initialize();
    logSuccess('Resilience integration initialized');
    
    // Register test agents
    resilience.registerAgent({
      agentId: 'test:data-validation',
      agentType: 'DATA_VALIDATION' as any
    });
    
    resilience.registerAgent({
      agentId: 'test:valuation',
      agentType: 'VALUATION' as any
    });
    
    logSuccess('Test agents registered');
    
    // Test 2: Start Agents
    logSection('Test 2: Start Agents');
    
    await resilience.startAllAgents();
    
    const health = resilience.getSystemHealth();
    logInfo(`System health: ${JSON.stringify(health, null, 2)}`);
    
    logSuccess('All agents started');
    
    // Test 3: Circuit Breaker Behavior
    logSection('Test 3: Circuit Breaker Behavior');
    
    logInfo('Setting mock bus to simulate failures');
    mockBus.setShouldFailNextMessage(true);
    
    // Try to send a message
    try {
      const enhancedBus = resilience.getEnhancedBus();
      await enhancedBus.sendMessage({
        messageId: 'test-1',
        correlationId: undefined,
        timestamp: new Date(),
        source: 'test:integration',
        destination: 'test:data-validation',
        eventType: 'TEST_MESSAGE' as any,
        payload: { test: true },
        metadata: { priority: 'HIGH' as any }
      });
      logWarning('Expected failure did not occur');
    } catch (error) {
      logSuccess('Message failure occurred as expected');
    }
    
    // Continue to cause failures to open the circuit
    for (let i = 0; i < 3; i++) {
      mockBus.setShouldFailNextMessage(true);
      try {
        const enhancedBus = resilience.getEnhancedBus();
        await enhancedBus.sendMessage({
          messageId: `test-${i+2}`,
          correlationId: undefined,
          timestamp: new Date(),
          source: 'test:integration',
          destination: 'test:data-validation',
          eventType: 'TEST_MESSAGE' as any,
          payload: { test: true },
          metadata: { priority: 'HIGH' as any }
        });
      } catch (error) {
        logInfo(`Failure ${i+1} occurred (expected)`);
      }
    }
    
    // Check if circuit breaker is open
    const circuitStats = registry.getStats('test:data-validation');
    logInfo(`Circuit breaker stats: ${JSON.stringify(circuitStats, null, 2)}`);
    
    if (circuitStats.state === 'OPEN') {
      logSuccess('Circuit breaker opened successfully after failures');
    } else {
      logWarning('Circuit breaker did not open as expected');
    }
    
    // Test 4: Self-healing behaviors
    logSection('Test 4: Self-healing Behaviors');
    
    // Simulate an agent failure
    logInfo('Simulating agent failure');
    resilienceTester.runTest({
      failureType: FailureType.AGENT_CRASH,
      targetAgentId: 'test:valuation'
    });
    
    logInfo('Waiting for self-healing to occur...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Check agent health after recovery
    const healthAfterRestart = resilience.getSystemHealth();
    logInfo(`System health after agent restart: ${JSON.stringify(healthAfterRestart, null, 2)}`);
    
    // Test 5: Cleanup and shutdown
    logSection('Test 5: Cleanup and Shutdown');
    
    await resilience.shutdown();
    logSuccess('Resilience integration shutdown successful');
    
    logSection('Integration Test Results');
    logSuccess('All integration tests completed');
    
    return {
      success: true,
      message: 'Integration test completed successfully'
    };
  } catch (error) {
    logError(`Integration test failed: ${error}`);
    
    // Attempt to clean up
    try {
      await resilience.shutdown();
    } catch (shutdownError) {
      logError(`Error during shutdown: ${shutdownError}`);
    }
    
    return {
      success: false,
      message: `Integration test failed: ${error}`
    };
  }
}

// Create a mock communication bus for testing
export class MockCommunicationBus {
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

// Run the test if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      const result = await runIntegrationTest();
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (error) {
      console.error('Uncaught error in integration test:', error);
      process.exit(1);
    }
  })();
}