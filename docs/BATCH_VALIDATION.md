# Batch Validation System

This document provides technical information about the Batch Validation System implemented in Phase 2 of the County Audit Hub project.

## Overview

The Batch Validation System is a robust solution for processing large datasets of property records asynchronously without impacting the main application performance. It enables:

- Validation of property data according to Washington State requirements
- Identification of data quality issues and compliance violations
- Efficient processing of large batches of properties
- Detailed reporting of validation results
- Background processing with progress tracking

## Architecture

The system consists of the following components:

### 1. Background Processor (`background-processor.ts`)

A generic asynchronous task processing framework that provides:

- Priority-based queuing of tasks
- Concurrent task execution
- Progress tracking and event notifications
- Task lifecycle management (creation, execution, completion, cancellation)
- Result persistence

### 2. Batch Validation Manager (`batch-validation-manager.ts`)

A specialized service that leverages the background processor to:

- Manage property validation jobs
- Support various validation types (property data, valuation calculation, land use code, etc.)
- Filter properties for validation based on flexible criteria
- Process properties in manageable batches to avoid memory issues
- Generate comprehensive validation reports
- Integrate with the Circuit Breaker pattern for resilience

### 3. Batch Validation API (`batch-validation-api.ts`)

RESTful API endpoints for interacting with the batch validation system:

- Submit new validation jobs
- Get status of running jobs
- Retrieve validation results
- List all jobs
- Cancel pending jobs

## Validation Types

The system supports several validation types:

- `PROPERTY_DATA`: Validates completeness and consistency of property data
- `VALUATION_CALCULATION`: Validates property valuation calculations
- `LAND_USE_CODE`: Validates land use codes against Washington State standards
- `PARCEL_NUMBER_FORMAT`: Validates parcel number format (XX-XXXX-XXX-XXXX)
- `IMPROVEMENT_VALUE`: Validates improvement values based on property type
- `TAX_CALCULATION`: Validates tax calculations
- `FULL_ASSESSMENT`: Runs all validation types

## API Endpoints

### Submit a Batch Validation Job

```
POST /api/batch-validation
```

Request body:
```json
{
  "validationType": "PROPERTY_DATA",
  "filters": {
    "propertyTypes": ["RESIDENTIAL", "COMMERCIAL"],
    "landUseCodes": ["100", "101"],
    "parcelNumbers": ["12-3456-789-0123"],
    "assessmentYears": [2023, 2024],
    "valueRange": {
      "min": 100000,
      "max": 500000
    },
    "lastUpdatedRange": {
      "start": "2023-01-01T00:00:00Z",
      "end": "2023-12-31T23:59:59Z"
    },
    "limit": 1000
  },
  "priority": "HIGH",
  "notifyOnCompletion": true,
  "validationParams": {
    "strictMode": true,
    "tolerancePercentage": 0.5,
    "useMachineLearning": false,
    "maxAcceptableDeviation": 1000,
    "requiredFields": ["parcelNumber", "propertyType", "landUseCode", "totalValue"]
  }
}
```

### Get All Batch Validation Jobs

```
GET /api/batch-validation
```

### Get Batch Validation Job Status

```
GET /api/batch-validation/:batchId
```

### Get Batch Validation Job Result

```
GET /api/batch-validation/:batchId/result
```

### Cancel a Batch Validation Job

```
DELETE /api/batch-validation/:batchId
```

## Example Usage

```typescript
// Submit a batch validation job
const response = await fetch('/api/batch-validation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    validationType: 'PROPERTY_DATA',
    filters: {
      propertyTypes: ['RESIDENTIAL'],
      limit: 100
    },
    priority: 'HIGH'
  })
});

const data = await response.json();
const batchId = data.batchId;

// Get job status
const statusResponse = await fetch(`/api/batch-validation/${batchId}`);
const statusData = await statusResponse.json();
console.log(`Status: ${statusData.job.status}, Progress: ${statusData.job.progress}%`);

// Get job result
const resultResponse = await fetch(`/api/batch-validation/${batchId}/result`);
const resultData = await resultResponse.json();
console.log(`Valid items: ${resultData.result.validItems}, Invalid: ${resultData.result.invalidItems}`);
```

## Integration with Resilience Framework

The Batch Validation System integrates with the resilience framework implemented in Phase 1:

1. The `batch-validation-manager.ts` can accept an `AgentResilienceIntegration` in its constructor, allowing it to leverage the resilience capabilities.
2. Validation operations can use circuit breakers when calling external services or agents.
3. Batch processing is designed to be resilient to failures, with individual property validation errors contained and not affecting the entire batch.

## Future Enhancements

Potential future enhancements to the Batch Validation System include:

1. **Machine Learning Integration**: Add ML capabilities for anomaly detection and valuation prediction.
2. **GIS Integration**: Integrate with GIS data for spatial validation of properties.
3. **Real-time Notifications**: Enhance notification capabilities with WebSocket updates to the UI.
4. **Automated Correction**: Implement automatic correction suggestions for common issues.
5. **Enhanced Reporting**: Add more detailed reporting and analytics on validation results.
6. **Database Persistence**: Store validation results in the database for historical tracking and reporting.

## Technical Details

- Written in TypeScript for type safety
- Uses EventEmitter for internal event communication
- Leverages async/await for clean asynchronous code
- Implements a priority queue for task processing
- Provides comprehensive error handling
- Supports progress tracking for long-running tasks