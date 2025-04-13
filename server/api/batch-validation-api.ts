/**
 * Batch Validation API
 * 
 * Provides REST endpoints for managing batch validation jobs.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { batchValidationManager, ValidationTypes, TaskPriority } from '../utils/batch-validation-manager';
import { log } from '../vite';

// Create router
const router = Router();

// Schema for batch validation request
const batchValidationRequestSchema = z.object({
  validationType: z.enum([
    ValidationTypes.PROPERTY_DATA,
    ValidationTypes.VALUATION_CALCULATION,
    ValidationTypes.LAND_USE_CODE,
    ValidationTypes.PARCEL_NUMBER_FORMAT,
    ValidationTypes.IMPROVEMENT_VALUE,
    ValidationTypes.TAX_CALCULATION,
    ValidationTypes.FULL_ASSESSMENT
  ] as [string, ...string[]]),
  filters: z.object({
    propertyTypes: z.array(z.string()).optional(),
    landUseCodes: z.array(z.string()).optional(),
    parcelNumbers: z.array(z.string()).optional(),
    assessmentYears: z.array(z.number()).optional(),
    valueRange: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional(),
    lastUpdatedRange: z.object({
      start: z.string().optional(), // ISO date string
      end: z.string().optional() // ISO date string
    }).optional(),
    limit: z.number().optional()
  }).optional(),
  priority: z.enum([
    TaskPriority.HIGH,
    TaskPriority.MEDIUM,
    TaskPriority.LOW
  ] as [string, ...string[]]).optional(),
  notifyOnCompletion: z.boolean().optional(),
  validationParams: z.object({
    strictMode: z.boolean().optional(),
    tolerancePercentage: z.number().optional(),
    useMachineLearning: z.boolean().optional(),
    maxAcceptableDeviation: z.number().optional(),
    requiredFields: z.array(z.string()).optional()
  }).optional()
});

// POST /api/batch-validation - Submit a new batch validation job
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validationResult = batchValidationRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.format()
      });
    }
    
    // Get user ID from session if available
    const userId = req.session?.userInfo?.id;
    
    // Submit batch validation job
    // Convert string validation type to enum value
    const typedOptions = {
      ...validationResult.data,
      validationType: ValidationTypes[validationResult.data.validationType as keyof typeof ValidationTypes],
      userId
    };
    
    const batchId = batchValidationManager.submitBatchValidation(typedOptions);
    
    log(`Submitted batch validation job ${batchId}`, 'api');
    
    return res.status(200).json({
      success: true,
      batchId,
      message: 'Batch validation job submitted successfully'
    });
  } catch (error) {
    log(`Error submitting batch validation job: ${error}`, 'api');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to submit batch validation job: ${error}`
    });
  }
});

// GET /api/batch-validation - Get all batch validation jobs
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get all batch validation jobs
    const jobs = batchValidationManager.getAllBatchValidations();
    
    // Filter out sensitive or internal information
    const sanitizedJobs = jobs.map(job => ({
      id: job.id,
      name: job.name,
      description: job.description,
      status: job.status,
      priority: job.priority,
      progress: job.progress,
      progressMessage: job.progressMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      userId: job.userId
    }));
    
    return res.status(200).json({
      success: true,
      count: sanitizedJobs.length,
      jobs: sanitizedJobs
    });
  } catch (error) {
    log(`Error getting batch validation jobs: ${error}`, 'api');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to get batch validation jobs: ${error}`
    });
  }
});

// GET /api/batch-validation/:batchId - Get batch validation job status
router.get('/:batchId', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    
    // Get batch validation job status
    const jobStatus = batchValidationManager.getBatchValidationStatus(batchId);
    
    if (!jobStatus) {
      return res.status(404).json({
        error: 'Not found',
        message: `Batch validation job with ID ${batchId} not found`
      });
    }
    
    // Filter out sensitive or internal information
    const sanitizedStatus = {
      id: jobStatus.id,
      name: jobStatus.name,
      description: jobStatus.description,
      status: jobStatus.status,
      priority: jobStatus.priority,
      progress: jobStatus.progress,
      progressMessage: jobStatus.progressMessage,
      createdAt: jobStatus.createdAt,
      startedAt: jobStatus.startedAt,
      completedAt: jobStatus.completedAt,
      userId: jobStatus.userId,
      metadata: jobStatus.metadata
    };
    
    return res.status(200).json({
      success: true,
      job: sanitizedStatus
    });
  } catch (error) {
    log(`Error getting batch validation job status: ${error}`, 'api');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to get batch validation job status: ${error}`
    });
  }
});

// GET /api/batch-validation/:batchId/result - Get batch validation job result
router.get('/:batchId/result', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    
    // Get batch validation job result
    const jobResult = batchValidationManager.getBatchValidationResult(batchId);
    
    if (!jobResult) {
      return res.status(404).json({
        error: 'Not found',
        message: `Batch validation job result with ID ${batchId} not found or job not completed`
      });
    }
    
    return res.status(200).json({
      success: true,
      result: jobResult
    });
  } catch (error) {
    log(`Error getting batch validation job result: ${error}`, 'api');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to get batch validation job result: ${error}`
    });
  }
});

// DELETE /api/batch-validation/:batchId - Cancel a batch validation job
router.delete('/:batchId', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    
    // Cancel batch validation job
    const cancelled = batchValidationManager.cancelBatchValidation(batchId);
    
    if (!cancelled) {
      return res.status(400).json({
        error: 'Bad request',
        message: `Failed to cancel batch validation job with ID ${batchId}. Job may not exist or is not in a cancellable state.`
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Batch validation job ${batchId} cancelled successfully`
    });
  } catch (error) {
    log(`Error cancelling batch validation job: ${error}`, 'api');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to cancel batch validation job: ${error}`
    });
  }
});

export default router;