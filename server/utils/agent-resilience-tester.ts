/**
 * Agent Resilience Tester
 * 
 * Provides utilities for testing agent resilience capabilities 
 * including circuit breaker and self-healing features.
 */

import { v4 as uuidv4 } from 'uuid';
import { EnhancedAgentManager } from '../agents/enhanced-agent-manager';
import { CircuitBreakerRegistry } from './circuit-breaker-registry';
import { log } from '../vite';
import { AgentMessage, MessageEventType } from '@shared/protocols/message-protocol';

/**
 * Types of failures that can be simulated for testing
 */
export enum FailureType {
  MESSAGE_TIMEOUT = 'MESSAGE_TIMEOUT',
  MESSAGE_ERROR = 'MESSAGE_ERROR',
  AGENT_CRASH = 'AGENT_CRASH',
  MEMORY_LEAK = 'MEMORY_LEAK',
  HIGH_CPU_USAGE = 'HIGH_CPU_USAGE',
  RANDOM_FAILURES = 'RANDOM_FAILURES'
}

/**
 * Options for running a resilience test
 */
export interface TestOptions {
  failureType: FailureType;
  targetAgentId: string;
  failureRate?: number;        // 0.0 to 1.0, percentage of operations that will fail
  failureCount?: number;       // Number of failures to simulate
  delayBetweenFailures?: number; // Milliseconds between failures
  durationMs?: number;         // Duration of the test in milliseconds
  recoveryTimeMs?: number;     // Time to allow for recovery after test
  specificCommand?: string;    // Specific command to target
}

/**
 * Results of a resilience test
 */
export interface TestResult {
  testId: string;
  startTime: Date;
  endTime?: Date;
  options: TestOptions;
  status: 'running' | 'completed' | 'failed';
  stats: {
    failuresSimulated: number;
    messagesProcessed: number;
    circuitBreakerEvents: {
      opened: number;
      closed: number;
      halfOpen: number;
    };
    agentEvents: {
      restarted: number;
      recovered: number;
      degraded: number;
    };
  };
  logs: string[];
}

/**
 * Agent Resilience Tester
 * 
 * Provides a way to test resilience features by simulating various
 * types of failures and monitoring the system's response.
 */
export class AgentResilienceTester {
  private testResults: Map<string, TestResult> = new Map();
  private activeTests: Map<string, NodeJS.Timeout> = new Map();
  private agentManager: EnhancedAgentManager;
  private circuitRegistry: CircuitBreakerRegistry;
  
  constructor(
    agentManager: EnhancedAgentManager,
    circuitRegistry: CircuitBreakerRegistry
  ) {
    this.agentManager = agentManager;
    this.circuitRegistry = circuitRegistry;
    
    log('Agent Resilience Tester initialized', 'resilience-tester');
  }
  
  /**
   * Run a new resilience test
   */
  public runTest(options: TestOptions): string {
    // Generate a unique test ID
    const testId = uuidv4();
    
    // Set default options
    const testOptions: TestOptions = {
      ...options,
      failureRate: options.failureRate || 1.0,
      failureCount: options.failureCount || 10,
      delayBetweenFailures: options.delayBetweenFailures || 500,
      durationMs: options.durationMs || 30000,
      recoveryTimeMs: options.recoveryTimeMs || 10000
    };
    
    // Create test result object
    const testResult: TestResult = {
      testId,
      startTime: new Date(),
      options: testOptions,
      status: 'running',
      stats: {
        failuresSimulated: 0,
        messagesProcessed: 0,
        circuitBreakerEvents: {
          opened: 0,
          closed: 0,
          halfOpen: 0
        },
        agentEvents: {
          restarted: 0,
          recovered: 0,
          degraded: 0
        }
      },
      logs: [`Test started at ${new Date().toISOString()}`]
    };
    
    // Store the test result
    this.testResults.set(testId, testResult);
    
    // Start the test
    log(`Starting resilience test ${testId} for agent ${testOptions.targetAgentId}`, 'resilience-tester');
    this.executeTest(testId);
    
    return testId;
  }
  
  /**
   * Get the result of a test
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
   * Cancel a running test
   */
  public cancelTest(testId: string): boolean {
    if (this.activeTests.has(testId)) {
      clearInterval(this.activeTests.get(testId)!);
      this.activeTests.delete(testId);
      
      const testResult = this.testResults.get(testId);
      if (testResult) {
        testResult.status = 'failed';
        testResult.endTime = new Date();
        testResult.logs.push(`Test cancelled at ${testResult.endTime.toISOString()}`);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Clean up all tests
   */
  public dispose(): void {
    // Cancel all active tests
    for (const [testId, timer] of this.activeTests.entries()) {
      clearInterval(timer);
      
      const testResult = this.testResults.get(testId);
      if (testResult && testResult.status === 'running') {
        testResult.status = 'failed';
        testResult.endTime = new Date();
        testResult.logs.push(`Test aborted during tester disposal at ${testResult.endTime.toISOString()}`);
      }
    }
    
    this.activeTests.clear();
    
    log('Agent Resilience Tester disposed', 'resilience-tester');
  }
  
  /**
   * Execute a test based on the failure type
   */
  private executeTest(testId: string): void {
    const testResult = this.testResults.get(testId);
    if (!testResult) {
      log(`Test ${testId} not found`, 'resilience-tester');
      return;
    }
    
    const { failureType, targetAgentId, failureCount, delayBetweenFailures } = testResult.options;
    
    // Create an interval to simulate failures
    let count = 0;
    const timer = setInterval(() => {
      // Check if we've reached the failure count
      if (count >= failureCount!) {
        this.completeTest(testId);
        return;
      }
      
      // Simulate the failure
      this.simulateFailure(testId, failureType, targetAgentId);
      
      // Increment the count
      count++;
      
    }, delayBetweenFailures);
    
    // Store the timer
    this.activeTests.set(testId, timer);
    
    // Set a timeout to complete the test if it runs too long
    setTimeout(() => {
      if (this.activeTests.has(testId)) {
        this.completeTest(testId);
      }
    }, testResult.options.durationMs);
  }
  
  /**
   * Complete a test
   */
  private completeTest(testId: string): void {
    if (this.activeTests.has(testId)) {
      clearInterval(this.activeTests.get(testId)!);
      this.activeTests.delete(testId);
      
      const testResult = this.testResults.get(testId);
      if (testResult) {
        testResult.status = 'completed';
        testResult.endTime = new Date();
        testResult.logs.push(`Test completed at ${testResult.endTime.toISOString()}`);
        
        log(`Resilience test ${testId} completed. Simulated ${testResult.stats.failuresSimulated} failures.`, 'resilience-tester');
      }
    }
  }
  
  /**
   * Simulate a specific type of failure
   */
  private simulateFailure(testId: string, failureType: FailureType, targetAgentId: string): void {
    const testResult = this.testResults.get(testId)!;
    testResult.stats.failuresSimulated++;
    
    switch (failureType) {
      case FailureType.MESSAGE_TIMEOUT:
        this.simulateMessageTimeout(testId, targetAgentId);
        break;
      case FailureType.MESSAGE_ERROR:
        this.simulateMessageError(testId, targetAgentId);
        break;
      case FailureType.AGENT_CRASH:
        this.simulateAgentCrash(testId, targetAgentId);
        break;
      case FailureType.MEMORY_LEAK:
        this.simulateMemoryLeak(testId, targetAgentId);
        break;
      case FailureType.HIGH_CPU_USAGE:
        this.simulateHighCpuUsage(testId, targetAgentId);
        break;
      case FailureType.RANDOM_FAILURES:
        this.simulateRandomFailure(testId, targetAgentId);
        break;
    }
  }
  
  /**
   * Simulate a message timeout
   */
  private simulateMessageTimeout(testId: string, targetAgentId: string): void {
    const testResult = this.testResults.get(testId)!;
    
    // Create a test message that will time out
    const message: AgentMessage = {
      messageId: `test-${testId}-${Date.now()}`,
      correlationId: undefined,
      timestamp: new Date(),
      source: 'resilience-tester',
      destination: targetAgentId,
      eventType: "__TEST_TIMEOUT__" as unknown as MessageEventType,
      payload: {
        testId,
        simulatedFailure: FailureType.MESSAGE_TIMEOUT
      },
      metadata: {
        priority: 'LOW'
      },
      requiresResponse: true
    };
    
    // Attempt to send the message
    // In a real scenario, we would intercept this message in a test adapter
    // that would simulate a timeout by never responding
    try {
      // In a real implementation, we might emit a message on a test bus
      log(`Simulating message timeout to ${targetAgentId}`, 'resilience-tester');
      
      // Track in the test logs
      testResult.logs.push(`Simulated timeout message ${message.messageId} to ${targetAgentId}`);
      
    } catch (error) {
      log(`Error simulating message timeout: ${error}`, 'resilience-tester');
      testResult.logs.push(`Error simulating timeout: ${error}`);
    }
  }
  
  /**
   * Simulate a message error
   */
  private simulateMessageError(testId: string, targetAgentId: string): void {
    const testResult = this.testResults.get(testId)!;
    
    // Create a test message that will cause an error
    const message: AgentMessage = {
      messageId: `test-${testId}-${Date.now()}`,
      correlationId: undefined,
      timestamp: new Date(),
      source: 'resilience-tester',
      destination: targetAgentId,
      eventType: 'PING' as unknown as MessageEventType,
      payload: {
        testId,
        simulatedFailure: FailureType.MESSAGE_ERROR,
        triggerError: true
      },
      metadata: {
        priority: 'LOW'
      },
      requiresResponse: true
    };
    
    // Attempt to send the message
    try {
      // In a real implementation, we would use a test hook to inject an error
      log(`Simulating message error for ${targetAgentId}`, 'resilience-tester');
      
      // Track in the test logs
      testResult.logs.push(`Simulated error message ${message.messageId} to ${targetAgentId}`);
      
      // Force the circuit breaker to register a failure
      const breaker = this.circuitRegistry.getBreaker(targetAgentId);
      breaker.registerFailure(new Error('Simulated message error'));
      
    } catch (error) {
      log(`Error simulating message error: ${error}`, 'resilience-tester');
      testResult.logs.push(`Error in error simulation: ${error}`);
    }
  }
  
  /**
   * Simulate an agent crash
   */
  private simulateAgentCrash(testId: string, targetAgentId: string): void {
    const testResult = this.testResults.get(testId)!;
    
    try {
      log(`Simulating agent crash for ${targetAgentId}`, 'resilience-tester');
      testResult.logs.push(`Simulating crash of agent ${targetAgentId}`);
      
      // In a real scenario, we would have a hook to trigger agent termination
      // Here we just force the agent manager to mark the agent as failed
      this.agentManager.simulateAgentFailure(targetAgentId);
      
    } catch (error) {
      log(`Error simulating agent crash: ${error}`, 'resilience-tester');
      testResult.logs.push(`Error simulating crash: ${error}`);
    }
  }
  
  /**
   * Simulate a memory leak (not fully implemented in this version)
   */
  private simulateMemoryLeak(testId: string, targetAgentId: string): void {
    const testResult = this.testResults.get(testId)!;
    
    log(`Simulating memory leak for ${targetAgentId} (placeholder)`, 'resilience-tester');
    testResult.logs.push(`Simulating memory leak in agent ${targetAgentId} (placeholder)`);
    
    // In a real scenario, we would inject a memory leak in the agent
    // For this demo, we just log it as a placeholder
  }
  
  /**
   * Simulate high CPU usage (not fully implemented in this version)
   */
  private simulateHighCpuUsage(testId: string, targetAgentId: string): void {
    const testResult = this.testResults.get(testId)!;
    
    log(`Simulating high CPU usage for ${targetAgentId} (placeholder)`, 'resilience-tester');
    testResult.logs.push(`Simulating high CPU in agent ${targetAgentId} (placeholder)`);
    
    // In a real scenario, we would trigger high CPU usage in the agent
    // For this demo, we just log it as a placeholder
  }
  
  /**
   * Simulate a random failure
   */
  private simulateRandomFailure(testId: string, targetAgentId: string): void {
    const testResult = this.testResults.get(testId)!;
    
    // Pick a random failure type to simulate
    const failureTypes = [
      FailureType.MESSAGE_TIMEOUT,
      FailureType.MESSAGE_ERROR,
      FailureType.AGENT_CRASH
    ];
    
    const randomType = failureTypes[Math.floor(Math.random() * failureTypes.length)];
    
    log(`Simulating random failure (${randomType}) for ${targetAgentId}`, 'resilience-tester');
    testResult.logs.push(`Simulating random failure (${randomType}) for ${targetAgentId}`);
    
    // Simulate the selected failure type
    this.simulateFailure(testId, randomType, targetAgentId);
  }
}