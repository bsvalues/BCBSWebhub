/**
 * Batch Validation API Test
 * 
 * This script tests the batch validation API endpoints to ensure they're functioning correctly.
 * 
 * Usage:
 * Run with: npx tsx server/test/batch-validation-test.ts
 */

import fetch from 'node-fetch';
import { ValidationTypes, TaskPriority } from '../utils/batch-validation-manager';

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const API_ENDPOINT = '/api/batch-validation';

async function runBatchValidationTest() {
  console.log('Starting batch validation API test...');
  
  try {
    // 1. Submit a new batch validation job
    console.log('\n1. Submitting a new batch validation job...');
    
    const submissionResponse = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        validationType: ValidationTypes.PROPERTY_DATA,
        filters: {
          propertyTypes: ['RESIDENTIAL', 'COMMERCIAL'],
          limit: 100
        },
        priority: TaskPriority.HIGH,
        validationParams: {
          strictMode: true,
          requiredFields: ['parcelNumber', 'propertyType', 'landUseCode', 'totalValue']
        }
      })
    });
    
    if (!submissionResponse.ok) {
      throw new Error(`Failed to submit batch validation job: ${submissionResponse.statusText}`);
    }
    
    const submissionData = await submissionResponse.json();
    console.log('Job submission successful!');
    console.log(`Batch ID: ${submissionData.batchId}`);
    
    const batchId = submissionData.batchId;
    
    // 2. Get the job status
    console.log('\n2. Getting job status...');
    
    const statusResponse = await fetch(`${API_BASE_URL}${API_ENDPOINT}/${batchId}`, {
      method: 'GET'
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to get job status: ${statusResponse.statusText}`);
    }
    
    const statusData = await statusResponse.json();
    console.log('Job status retrieved successfully!');
    console.log(`Status: ${statusData.job.status}`);
    console.log(`Progress: ${statusData.job.progress}%`);
    
    // 3. Get all batch validation jobs
    console.log('\n3. Getting all batch validation jobs...');
    
    const allJobsResponse = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'GET'
    });
    
    if (!allJobsResponse.ok) {
      throw new Error(`Failed to get all jobs: ${allJobsResponse.statusText}`);
    }
    
    const allJobsData = await allJobsResponse.json();
    console.log('All jobs retrieved successfully!');
    console.log(`Total jobs: ${allJobsData.count}`);
    
    // 4. Get job result (this may not be available immediately if job is still running)
    console.log('\n4. Getting job result...');
    
    try {
      const resultResponse = await fetch(`${API_BASE_URL}${API_ENDPOINT}/${batchId}/result`, {
        method: 'GET'
      });
      
      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        console.log('Job result retrieved successfully!');
        console.log(`Total items: ${resultData.result.totalItems}`);
        console.log(`Valid items: ${resultData.result.validItems}`);
        console.log(`Invalid items: ${resultData.result.invalidItems}`);
      } else if (resultResponse.status === 404) {
        console.log('Job result not yet available (job still running or not completed)');
      } else {
        console.log(`Failed to get job result: ${resultResponse.statusText}`);
      }
    } catch (error) {
      console.log(`Error getting job result: ${error}`);
    }
    
    // 5. Cancel the job (only works if job is still pending)
    console.log('\n5. Attempting to cancel the job...');
    
    try {
      const cancelResponse = await fetch(`${API_BASE_URL}${API_ENDPOINT}/${batchId}`, {
        method: 'DELETE'
      });
      
      if (cancelResponse.ok) {
        const cancelData = await cancelResponse.json();
        console.log('Job cancelled successfully!');
        console.log(`Message: ${cancelData.message}`);
      } else if (cancelResponse.status === 400) {
        console.log('Job could not be cancelled (probably already completed or running)');
      } else {
        console.log(`Failed to cancel job: ${cancelResponse.statusText}`);
      }
    } catch (error) {
      console.log(`Error cancelling job: ${error}`);
    }
    
    console.log('\nBatch validation API test completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runBatchValidationTest();