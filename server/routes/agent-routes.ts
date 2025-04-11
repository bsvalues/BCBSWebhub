import { Router } from "express";
import { agentController } from "../controllers/agent-controller";

const router = Router();

// Agent System Endpoints

/**
 * @route   POST /api/agents/tasks
 * @desc    Submit a task to an agent
 * @access  Protected
 */
router.post("/tasks", agentController.submitTask.bind(agentController));

/**
 * @route   DELETE /api/agents/tasks/:taskId
 * @desc    Cancel a task
 * @access  Protected
 */
router.delete("/tasks/:taskId", agentController.cancelTask.bind(agentController));

/**
 * @route   GET /api/agents/tasks/:taskId
 * @desc    Get task status
 * @access  Protected
 */
router.get("/tasks/:taskId", agentController.getTaskStatus.bind(agentController));

/**
 * @route   GET /api/agents/:agentType/status
 * @desc    Get agent status
 * @access  Protected
 */
router.get("/:agentType/status", agentController.getAgentStatus.bind(agentController));

/**
 * @route   GET /api/agents/system/status
 * @desc    Get overall agent system status
 * @access  Protected
 */
router.get("/system/status", agentController.getSystemStatus.bind(agentController));

// Property Validation Endpoints

/**
 * @route   POST /api/agents/validation/property
 * @desc    Validate a property
 * @access  Protected
 */
router.post("/validation/property", agentController.validateProperty.bind(agentController));

/**
 * @route   POST /api/agents/validation/data-quality
 * @desc    Analyze data quality
 * @access  Protected
 */
router.post("/validation/data-quality", agentController.analyzeDataQuality.bind(agentController));

// Property Valuation Endpoints

/**
 * @route   POST /api/agents/valuation/calculate
 * @desc    Calculate property value
 * @access  Protected
 */
router.post("/valuation/calculate", agentController.calculatePropertyValue.bind(agentController));

/**
 * @route   POST /api/agents/valuation/comparables
 * @desc    Find comparable properties
 * @access  Protected
 */
router.post("/valuation/comparables", agentController.findComparableProperties.bind(agentController));

/**
 * @route   POST /api/agents/valuation/anomalies
 * @desc    Detect valuation anomalies
 * @access  Protected
 */
router.post("/valuation/anomalies", agentController.detectValuationAnomalies.bind(agentController));

export default router;