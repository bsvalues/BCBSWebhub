/**
 * Agent Resilience Tester
 * 
 * Provides utilities for testing agent resilience and fault tolerance:
 * - Simulated failures
 * - Load testing
 * - Circuit breaker testing
 * - Agent recovery verification
 */

import { BaseAgent } from '../agents/base-agent';
import { AgentMessage, MessageEventType } from '@shared/protocols/message-protocol';
import { AgentStatus } from '@shared/protocols/agent-communication';
import { EnhancedAgentManager } from '../agents/enhanced-agent-manager';
import { CircuitBreakerRegistry } from './circuit-breaker-registry';

export enum FailureType {
  MESSAGE_TIMEOUT = 'MESSAGE_TIMEOUT',
  MESSAGE_ERROR = 'MESSAGE_ERROR',
  AGENT_CRASH = 'AGENT_CRASH',
  HIGH_CPU_LOAD = 'HIGH_CPU_LOAD',
  MEMORY_LEAK = 'MEMORY_LEAK',
  NETWORK_PARTITION = 'NETWORK_PARTITION'
}

export interface TestOptions {
  failureType: FailureType;
  targetAgentId: string;
  duration?: number;       // Duration in milliseconds
  failureRate?: number;    // 0.0 to 1.0 (percentage of operations that fail)
  failureCount?: number;   // Number of failures to inject
  delayBetweenFailures?: number; // Delay in ms between injected failures
  loadFactor?: number;     // Multiplier for normal load (1.0 = normal)
}

export interface TestResult {
  testId: string;
  options: TestOptions;
  startTime: Date;
  endTime: Date;
  successCount: number;
  failureCount: number;
  recoveryTime?: number;   // Time in ms to recover after test
  circuitBreakerTripped: boolean;
  agentRestarted: boolean;
  metrics: {
    messageLatencies: number[];  // Array of message latencies in ms
    cpuUsage?: number[];         // Array of CPU usage measurements
    memoryUsage?: number[];      // Array of memory usage measurements
  };
}

/**
 * Agent Resilience Tester
 */
export class AgentResilienceTester {
  private agentManager: EnhancedAgentManager;
  private circuitBreakerRegistry: CircuitBreakerRegistry;
  private activeTests: Map<string, NodeJS.Timeout> = new Map();
  private testResults: Map<string, TestResult> = new Map();

  constructor(
    agentManager: EnhancedAgentManager,
    circuitBreakerRegistry: CircuitBreakerRegistry
  ) {
    this.agentManager = agentManager;
    this.circuitBreakerRegistry = circuitBreakerRegistry;
  }

  /**
   * Run a resilience test
   */
  public async runTest(options: TestOptions): Promise<string> {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate test options
    this.validateOptions(options);
    
    // Initialize test results
    const testResult: TestResult = {
      testId,
      options,
      startTime: new Date(),
      endTime: new Date(), // Will be updated when test finishes
      successCount: 0,
      failureCount: 0,
      circuitBreakerTripped: false,
      agentRestarted: false,
      metrics: {
        messageLatencies: []
      }
    };
    
    this.testResults.set(testId, testResult);
    
    // Start the test in the background
    const testPromise = this.executeTest(testId, options);
    
    // Register a timeout to stop the test if it runs too long
    const testTimeout = setTimeout(() => {
      this.stopTest(testId);
    }, options.duration || 60000); // Default 1 minute
    
    this.activeTests.set(testId, testTimeout);
    
    // Return test ID for later reference
    return testId;
  }

  /**
   * Stop an active test
   */
  public stopTest(testId: string): void {
    const timeout = this.activeTests.get(testId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTests.delete(testId);
      
      // Update test result
      const result = this.testResults.get(testId);
      if (result) {
        result.endTime = new Date();
      }
      
      console.log(`Stopped test ${testId}`);
    } else {
      console.warn(`No active test found with ID ${testId}`);
    }
  }

  /**
   * Get test results
   */
  public getTestResult(testId: string): TestResult | undefined {
    return this.testResults.get(testId);
  }

  /**
   * Get all test results
   */
  public getAllTestResults(): TestResult[] {
    return Array.from(this.testResults.values());
  }

  /**
   * Execute a resilience test based on options
   */
  private async executeTest(testId: string, options: TestOptions): Promise<void> {
    const { failureType, targetAgentId } = options;
    
    try {
      console.log(`Starting ${failureType} test on agent ${targetAgentId} (${testId})`);
      
      // Track initial agent state
      const initialAgentHealth = this.agentManager.getAgentHealth(targetAgentId);
      const initialCircuitState = this.circuitBreakerRegistry.getBreaker(targetAgentId)?.getStats();
      
      switch (failureType) {
        case FailureType.MESSAGE_TIMEOUT:
          await this.runMessageTimeoutTest(testId, options);
          break;
          
        case FailureType.MESSAGE_ERROR:
          await this.runMessageErrorTest(testId, options);
          break;
          
        case FailureType.AGENT_CRASH:
          await this.runAgentCrashTest(testId, options);
          break;
          
        case FailureType.HIGH_CPU_LOAD:
          await this.runHighCpuLoadTest(testId, options);
          break;
          
        case FailureType.MEMORY_LEAK:
          await this.runMemoryLeakTest(testId, options);
          break;
          
        case FailureType.NETWORK_PARTITION:
          await this.runNetworkPartitionTest(testId, options);
          break;
          
        default:
          throw new Error(`Unknown failure type: ${failureType}`);
      }
      
      // Check for recovery
      await this.verifyRecovery(testId, targetAgentId, initialAgentHealth, initialCircuitState);
      
    } catch (error) {
      console.error(`Error during test ${testId}:`, error);
      
      // Update test result with error
      const result = this.testResults.get(testId);
      if (result) {
        result.failureCount++;
        result.endTime = new Date();
      }
    }
  }

  /**
   * Run a test that simulates message timeouts
   */
  private async runMessageTimeoutTest(testId: string, options: TestOptions): Promise<void> {
    const { targetAgentId, failureRate = 0.5, failureCount = 10, delayBetweenFailures = 1000 } = options;
    const result = this.testResults.get(testId)!;
    
    // Create a mock agent for sending test messages
    const mockAgentId = `tester:${testId}`;
    
    for (let i = 0; i < failureCount; i++) {
      // Wait between failures if specified
      if (i > 0 && delayBetweenFailures) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenFailures));
      }
      
      // Check if test was stopped
      if (!this.activeTests.has(testId)) {
        break;
      }
      
      // Decide whether this message should time out (based on failure rate)
      const shouldFail = Math.random() < failureRate;
      
      if (shouldFail) {
        // Create a message that will cause a timeout
        // Here we're simulating by creating a message with special marker
        const message: AgentMessage = {
          id: `timeout_test_${Date.now()}_${i}`,
          source: mockAgentId,
          destination: targetAgentId,
          eventType: '__TEST_TIMEOUT__',
          correlationId: null,
          timestamp: new Date(),
          payload: {
            testId,
            iteration: i,
            shouldTimeout: true
          }
        };
        
        const startTime = Date.now();
        
        try {
          // In a real implementation, we'd use our enhanced bus with a low timeout value
          // Here we're just simulating the timeout
          await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Simulated timeout')), 1000);
          });
          
          result.successCount++;
        } catch (error) {
          const latency = Date.now() - startTime;
          result.failureCount++;
          result.metrics.messageLatencies.push(latency);
          
          // Check if circuit breaker was tripped
          const breakerStats = this.circuitBreakerRegistry.getBreaker(targetAgentId)?.getStats();
          if (breakerStats && breakerStats.state === 'OPEN') {
            result.circuitBreakerTripped = true;
          }
        }
      } else {
        // Send a normal message that should succeed
        const message: AgentMessage = {
          id: `normal_test_${Date.now()}_${i}`,
          source: mockAgentId,
          destination: targetAgentId,
          eventType: MessageEventType.PING,
          correlationId: null,
          timestamp: new Date(),
          payload: {
            testId,
            iteration: i
          }
        };
        
        const startTime = Date.now();
        
        try {
          // We'd use our real enhanced bus here in a real implementation
          // For now, we're just simulating success
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const latency = Date.now() - startTime;
          result.successCount++;
          result.metrics.messageLatencies.push(latency);
        } catch (error) {
          result.failureCount++;
        }
      }
    }
  }

  /**
   * Run a test that simulates message errors
   */
  private async runMessageErrorTest(testId: string, options: TestOptions): Promise<void> {
    // Similar to timeout test but with error responses instead of timeouts
    await this.runMessageTimeoutTest(testId, options);
  }

  /**
   * Run a test that simulates agent crashes
   */
  private async runAgentCrashTest(testId: string, options: TestOptions): Promise<void> {
    const { targetAgentId, failureCount = 1, delayBetweenFailures = 5000 } = options;
    const result = this.testResults.get(testId)!;
    
    for (let i = 0; i < failureCount; i++) {
      // Wait between failures if specified
      if (i > 0 && delayBetweenFailures) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenFailures));
      }
      
      // Check if test was stopped
      if (!this.activeTests.has(testId)) {
        break;
      }
      
      console.log(`Simulating crash of agent ${targetAgentId} (iteration ${i + 1}/${failureCount})`);
      
      try {
        // In a real implementation, we would either:
        // 1. Force the agent to throw an unhandled exception, or
        // 2. Call a method on the agent that simulates a crash
        
        // For now, we'll just stop the agent to simulate a crash
        await this.agentManager.stopAgent(targetAgentId);
        
        // Record that the "crash" happened
        result.failureCount++;
        
        // Wait a bit to let the system detect the "crash"
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // The agent manager should auto-restart the agent
        // We'll check if this happened in verifyRecovery
      } catch (error) {
        console.error(`Error during agent crash test (${targetAgentId}):`, error);
      }
    }
  }

  /**
   * Run a test that simulates high CPU load
   */
  private async runHighCpuLoadTest(testId: string, options: TestOptions): Promise<void> {
    const { targetAgentId, duration = 10000, loadFactor = 5 } = options;
    const result = this.testResults.get(testId)!;
    
    console.log(`Simulating high CPU load on agent ${targetAgentId} for ${duration}ms (load factor: ${loadFactor})`);
    
    try {
      // In a real implementation, we would inject code that creates high CPU usage
      // For now, we'll just record that we simulated it
      
      // Record CPU measurements at intervals
      const startTime = Date.now();
      const endTime = startTime + duration;
      
      while (Date.now() < endTime && this.activeTests.has(testId)) {
        // Simulate a CPU usage measurement
        const cpuUsage = Math.min(0.9, Math.random() * loadFactor);
        result.metrics.cpuUsage = result.metrics.cpuUsage || [];
        result.metrics.cpuUsage.push(cpuUsage);
        
        // Wait a bit before next measurement
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error during high CPU load test (${targetAgentId}):`, error);
    }
  }

  /**
   * Run a test that simulates memory leaks
   */
  private async runMemoryLeakTest(testId: string, options: TestOptions): Promise<void> {
    const { targetAgentId, duration = 10000 } = options;
    const result = this.testResults.get(testId)!;
    
    console.log(`Simulating memory leak on agent ${targetAgentId} for ${duration}ms`);
    
    try {
      // In a real implementation, we would inject code that creates memory leaks
      // For now, we'll just record that we simulated it
      
      // Record memory measurements at intervals
      const startTime = Date.now();
      const endTime = startTime + duration;
      
      let simulatedMemoryUsage = 100; // Starting point in MB
      
      while (Date.now() < endTime && this.activeTests.has(testId)) {
        // Simulate increasing memory usage
        simulatedMemoryUsage += 10; // Add 10MB each iteration
        result.metrics.memoryUsage = result.metrics.memoryUsage || [];
        result.metrics.memoryUsage.push(simulatedMemoryUsage);
        
        // Wait a bit before next measurement
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error during memory leak test (${targetAgentId}):`, error);
    }
  }

  /**
   * Run a test that simulates network partitions
   */
  private async runNetworkPartitionTest(testId: string, options: TestOptions): Promise<void> {
    const { targetAgentId, duration = 5000 } = options;
    const result = this.testResults.get(testId)!;
    
    console.log(`Simulating network partition for agent ${targetAgentId} for ${duration}ms`);
    
    try {
      // In a real implementation, we would block messages to/from the agent
      // For now, we'll just record that we simulated it
      
      // Record the start of the partition
      result.failureCount++;
      
      // Wait for the partition duration
      await new Promise(resolve => setTimeout(resolve, duration));
      
      // Record the end of the partition (if test is still running)
      if (this.activeTests.has(testId)) {
        result.successCount++;
      }
    } catch (error) {
      console.error(`Error during network partition test (${targetAgentId}):`, error);
    }
  }

  /**
   * Verify that the system recovered after a test
   */
  private async verifyRecovery(
    testId: string,
    targetAgentId: string,
    initialAgentHealth: any,
    initialCircuitState: any
  ): Promise<void> {
    const result = this.testResults.get(testId)!;
    const startTime = Date.now();
    
    console.log(`Verifying recovery for agent ${targetAgentId} after test ${testId}`);
    
    // Wait for a little bit to allow recovery processes to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check recovery for up to 30 seconds
    const maxCheckTime = 30000;
    let recovered = false;
    
    while (Date.now() - startTime < maxCheckTime && !recovered) {
      // Get current agent health
      const currentHealth = this.agentManager.getAgentHealth(targetAgentId);
      
      // Check if agent is back to healthy state
      if (currentHealth && currentHealth.status === AgentStatus.READY && currentHealth.healthCheck.isHealthy) {
        // Get current circuit breaker state
        const currentCircuitState = this.circuitBreakerRegistry.getBreaker(targetAgentId)?.getStats();
        
        // Check if circuit breaker is closed again (if it was tripped)
        if (!result.circuitBreakerTripped || (currentCircuitState && currentCircuitState.state === 'CLOSED')) {
          recovered = true;
          
          // Record recovery time
          result.recoveryTime = Date.now() - startTime;
          
          // Check if agent was restarted
          result.agentRestarted = initialAgentHealth && 
            currentHealth && 
            currentHealth.healthCheck.restartAttempts > initialAgentHealth.healthCheck.restartAttempts;
            
          console.log(`Agent ${targetAgentId} recovered after ${result.recoveryTime}ms (restarted: ${result.agentRestarted})`);
          break;
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!recovered) {
      console.warn(`Agent ${targetAgentId} did not recover within ${maxCheckTime}ms after test ${testId}`);
    }
    
    // Update test end time
    result.endTime = new Date();
  }

  /**
   * Validate test options
   */
  private validateOptions(options: TestOptions): void {
    const { failureType, targetAgentId, failureRate, failureCount, duration } = options;
    
    if (!Object.values(FailureType).includes(failureType as any)) {
      throw new Error(`Invalid failure type: ${failureType}`);
    }
    
    if (!targetAgentId) {
      throw new Error('Target agent ID is required');
    }
    
    if (failureRate !== undefined && (failureRate < 0 || failureRate > 1)) {
      throw new Error('Failure rate must be between 0 and 1');
    }
    
    if (failureCount !== undefined && failureCount < 0) {
      throw new Error('Failure count must be non-negative');
    }
    
    if (duration !== undefined && duration < 0) {
      throw new Error('Duration must be non-negative');
    }
  }
}