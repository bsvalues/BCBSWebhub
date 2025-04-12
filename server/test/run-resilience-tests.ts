/**
 * Agent Resilience Test Runner
 * 
 * This script runs the agent resilience tests to verify that the
 * circuit breaker pattern and self-healing capabilities work as expected.
 */

import { runAgentResilienceTests } from './agent-resilience-test';

console.log('Starting Agent Resilience Tests...');
console.log('==================================');
console.log('These tests verify that the circuit breaker pattern and');
console.log('self-healing capabilities in the agent system are working correctly.');
console.log('');

// Run the tests
runAgentResilienceTests()
  .then(() => {
    console.log('');
    console.log('All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });