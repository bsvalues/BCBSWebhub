import { Router } from "express";
import { agentController } from "../controllers/agent-controller";

const router = Router();

// General agent system routes
router.post("/tasks", agentController.submitTask.bind(agentController));
router.delete("/tasks/:id", agentController.cancelTask.bind(agentController));
router.get("/tasks/:id", agentController.getTaskStatus.bind(agentController));
router.get("/agents/:type", agentController.getAgentStatus.bind(agentController));
router.get("/system", agentController.getSystemStatus.bind(agentController));

// Specialized task routes
router.post("/validate-property", agentController.validateProperty.bind(agentController));
router.post("/calculate-property-value", agentController.calculatePropertyValue.bind(agentController));
router.post("/find-comparable-properties", agentController.findComparableProperties.bind(agentController));
router.post("/detect-anomalies", agentController.detectValuationAnomalies.bind(agentController));
router.get("/data-quality", agentController.analyzeDataQuality.bind(agentController));

export default router;