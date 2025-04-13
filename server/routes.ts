import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./socket";
import { z } from "zod";
import { insertAuditSchema, insertAuditEventSchema, insertDocumentSchema, users as usersTable, Audit } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { db } from "./db";
import agentRoutes from "./routes/agent-routes";
import batchValidationApi from "./api/batch-validation-api";
import { registerAdvancedAnalyticsAPI } from "./api/advanced-analytics-api";

// Define a common error handler for API routes
const handleApiError = (res: Response, error: any) => {
  console.error("API Error:", error);
  res.status(500).json({ error: "Internal server error", message: error.message });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebSocketServer(wss);
  
  // Setup authentication routes
  setupAuth(app);
  
  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
    // During development, bypass authentication for easier testing
    // This flag will be removed before deployment
    const DEVELOPMENT_MODE = true;
    
    if (DEVELOPMENT_MODE) {
      // In development mode, if not authenticated, create a mock user
      if (!req.isAuthenticated()) {
        console.log("Development mode: bypassing authentication");
        // Add a mock user to the request object
        req.user = {
          id: 1,
          username: "dev-user",
          password: "not-a-real-password",
          fullName: "Development User",
          email: "dev@example.com",
          role: "admin",
          externalAuth: false,
          createdAt: new Date(),
          lastLogin: new Date()
        };
      }
      return next();
    }
    
    // In production, require authentication
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Unauthorized" });
  };
  
  // API Routes
  
  // Get all pending audits
  app.get("/api/audits/pending", ensureAuthenticated, async (req, res) => {
    try {
      const pendingAudits = await storage.getPendingAudits();
      res.json(pendingAudits);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get audits assigned to the current user
  app.get("/api/audits/assigned", ensureAuthenticated, async (req, res) => {
    try {
      const assignedAudits = await storage.getAssignedAudits(req.user!.id);
      res.json(assignedAudits);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get audits created by the current user
  app.get("/api/audits/created", ensureAuthenticated, async (req, res) => {
    try {
      const createdAudits = await storage.getAuditsCreatedByUser(req.user!.id);
      res.json(createdAudits);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get recent audits for GIS dashboard
  app.get("/api/audits/recent", ensureAuthenticated, async (req, res) => {
    try {
      // Get all audits and sort by most recently updated
      const allAudits = await storage.getAudits();
      const sortedAudits = allAudits.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Return the 10 most recent audits
      res.json(sortedAudits.slice(0, 10));
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get all users (for assignment)
  app.get("/api/users", ensureAuthenticated, async (req, res) => {
    try {
      const usersList = await db.select({
        id: usersTable.id,
        username: usersTable.username,
        fullName: usersTable.fullName,
        role: usersTable.role
      }).from(usersTable);
      
      res.json(usersList);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get audit by ID
  app.get("/api/audits/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      res.json(audit);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get audit events for an audit
  app.get("/api/audits/:id/events", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const events = await storage.getAuditEvents(id);
      res.json(events);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Update audit status (approve/reject/request info)
  app.post("/api/audits/:id/decision", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      // Validate the request body
      const decisionSchema = z.object({
        status: z.enum(["approved", "rejected", "needs_info", "in_progress", "pending"]),
        comment: z.string().optional(),
      });
      
      const result = decisionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request body", details: result.error });
      }
      
      const { status, comment } = result.data;
      
      // Update the audit status
      const updatedAudit = await storage.updateAudit(id, { status });
      if (!updatedAudit) {
        return res.status(500).json({ error: "Failed to update audit" });
      }
      
      // Create an audit event for this decision
      const eventType = status === "approved" ? "approved" : 
                        status === "rejected" ? "rejected" : 
                        status === "needs_info" ? "requested_info" : 
                        status === "in_progress" ? "in_progress" : "status_change";
      
      const auditEvent = await storage.createAuditEvent({
        auditId: id,
        userId: req.user!.id,
        eventType,
        comment,
        changes: {
          before: { status: audit.status },
          after: { status },
        },
        timestamp: new Date(),
      });
      
      // Broadcast the update to all connected clients
      const socketPayload = {
        type: "AUDIT_UPDATED",
        audit: updatedAudit,
        event: auditEvent,
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.json({ audit: updatedAudit, event: auditEvent });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Assign an audit to a user
  app.post("/api/audits/:id/assign", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      // Validate the request body
      const assignmentSchema = z.object({
        assignedToId: z.number(),
        comment: z.string().optional(),
      });
      
      const result = assignmentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request body", details: result.error });
      }
      
      const { assignedToId, comment } = result.data;
      
      // Check if the assigned user exists
      const assignedUser = await storage.getUser(assignedToId);
      if (!assignedUser) {
        return res.status(400).json({ error: "Assigned user not found" });
      }
      
      // Update the audit assignment
      const updatedAudit = await storage.updateAudit(id, { 
        assignedToId,
        // If the audit was previously unassigned and is now being assigned,
        // change its status to "in_progress" if it was pending
        ...(audit.status === "pending" && !audit.assignedToId ? { status: "in_progress" } : {})
      });
      
      if (!updatedAudit) {
        return res.status(500).json({ error: "Failed to update audit assignment" });
      }
      
      // Create an audit event for this assignment
      const auditEvent = await storage.createAuditEvent({
        auditId: id,
        userId: req.user!.id,
        eventType: "assigned",
        comment,
        changes: {
          before: { assignedToId: audit.assignedToId },
          after: { assignedToId }
        },
        timestamp: new Date(),
      });
      
      // Broadcast the update to all connected clients
      const socketPayload = {
        type: "AUDIT_ASSIGNED",
        audit: updatedAudit,
        event: auditEvent,
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.json({ audit: updatedAudit, event: auditEvent });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Add a comment to an audit
  app.post("/api/audits/:id/comments", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      // Validate the request body
      const commentSchema = z.object({
        comment: z.string().min(1, "Comment cannot be empty"),
      });
      
      const result = commentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid comment", details: result.error });
      }
      
      const { comment } = result.data;
      
      // Create an audit event for this comment
      const auditEvent = await storage.createAuditEvent({
        auditId: id,
        userId: req.user!.id,
        eventType: "comment",
        comment,
        timestamp: new Date(),
      });
      
      // Broadcast the comment to all connected clients
      const socketPayload = {
        type: "AUDIT_COMMENT",
        audit,
        event: auditEvent,
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.json({ success: true, event: auditEvent });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get recent audit events for the live audit log
  app.get("/api/events/recent", ensureAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const events = await storage.getRecentAuditEvents(limit);
      res.json(events);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get analytics data
  app.get("/api/analytics", ensureAuthenticated, async (req, res) => {
    try {
      const allAudits = await storage.getAudits();
      
      // Calculate basic analytics
      const analytics = {
        pendingCount: allAudits.filter(a => a.status === "pending").length,
        inProgressCount: allAudits.filter(a => a.status === "in_progress").length,
        approvedCount: allAudits.filter(a => a.status === "approved").length,
        rejectedCount: allAudits.filter(a => a.status === "rejected").length,
        needsInfoCount: allAudits.filter(a => a.status === "needs_info").length,
        totalCount: allAudits.length,
        
        // Performance metrics
        completionRate: allAudits.length > 0 ? 
          ((allAudits.filter(a => a.status !== "pending" && a.status !== "in_progress").length / allAudits.length) * 100).toFixed(1) : "0",
        approvalRate: allAudits.filter(a => a.status !== "pending" && a.status !== "in_progress").length > 0 ?
          ((allAudits.filter(a => a.status === "approved").length / allAudits.filter(a => a.status !== "pending" && a.status !== "in_progress").length) * 100).toFixed(1) : "0",
        
        // Other sample analytics
        priorityBreakdown: {
          urgent: allAudits.filter(a => a.priority === "urgent").length,
          high: allAudits.filter(a => a.priority === "high").length,
          normal: allAudits.filter(a => a.priority === "normal").length,
          low: allAudits.filter(a => a.priority === "low").length,
        }
      };
      
      res.json(analytics);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Workflow Definition Endpoints
  
  // Get all workflow definitions
  app.get("/api/workflows/definitions", ensureAuthenticated, async (req, res) => {
    try {
      const { auditType } = req.query;
      const definitions = await storage.getWorkflowDefinitions(auditType as string);
      res.json(definitions);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Get workflow definition by ID
  app.get("/api/workflows/definitions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid workflow definition ID" });
      }
      
      const definition = await storage.getWorkflowDefinitionById(id);
      if (!definition) {
        return res.status(404).json({ error: "Workflow definition not found" });
      }
      
      res.json(definition);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Create a new workflow definition
  app.post("/api/workflows/definitions", ensureAuthenticated, async (req, res) => {
    try {
      // Check if user has admin role
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only administrators can create workflow definitions" });
      }
      
      // Validate the request body
      const definitionSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        auditType: z.enum(["standard", "complex", "commercial", "residential", "agriculture", "appeal", "correction"]),
        thresholdAmount: z.number().optional(),
        steps: z.array(z.any()).min(1), // Using any for steps as it's a complex structure
      });
      
      const result = definitionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid workflow definition", details: result.error });
      }
      
      // Create workflow definition
      const workflowDef = await storage.createWorkflowDefinition({
        ...result.data,
        createdById: req.user!.id,
        createdAt: new Date(),
        isActive: true
      });
      
      res.status(201).json(workflowDef);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Update a workflow definition
  app.put("/api/workflows/definitions/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Check if user has admin role
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only administrators can update workflow definitions" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid workflow definition ID" });
      }
      
      const existingDefinition = await storage.getWorkflowDefinitionById(id);
      if (!existingDefinition) {
        return res.status(404).json({ error: "Workflow definition not found" });
      }
      
      // Validate the request body
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        auditType: z.enum(["standard", "complex", "commercial", "residential", "agriculture", "appeal", "correction"]).optional(),
        thresholdAmount: z.number().optional(),
        steps: z.array(z.any()).min(1).optional(), // Using any for steps as it's a complex structure
        isActive: z.boolean().optional()
      });
      
      const result = updateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid update data", details: result.error });
      }
      
      // Update workflow definition
      const updatedDefinition = await storage.updateWorkflowDefinition(id, {
        ...result.data,
        updatedAt: new Date()
      });
      
      res.json(updatedDefinition);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Delete (deactivate) a workflow definition
  app.delete("/api/workflows/definitions/:id", ensureAuthenticated, async (req, res) => {
    try {
      // Check if user has admin role
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only administrators can delete workflow definitions" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid workflow definition ID" });
      }
      
      const success = await storage.deleteWorkflowDefinition(id);
      if (!success) {
        return res.status(404).json({ error: "Workflow definition not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Workflow Instance Endpoints
  
  // Get workflow instance for an audit
  app.get("/api/audits/:id/workflow", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      // Get the workflow instance for this audit
      const instance = await storage.getWorkflowInstance(id);
      if (!instance) {
        return res.status(404).json({ error: "No workflow instance found for this audit" });
      }
      
      // Get the workflow definition
      const definition = await storage.getWorkflowDefinitionById(instance.workflowDefinitionId);
      if (!definition) {
        return res.status(500).json({ error: "Workflow definition not found" });
      }
      
      res.json({
        instance,
        definition,
        currentStep: (definition.steps as any[])[instance.currentStepIndex]
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Create a workflow instance for an audit
  app.post("/api/audits/:id/workflow", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      // Check if a workflow instance already exists for this audit
      const existingInstance = await storage.getWorkflowInstance(id);
      if (existingInstance) {
        return res.status(400).json({ error: "Workflow instance already exists for this audit" });
      }
      
      // Validate the request body
      const instanceSchema = z.object({
        workflowDefinitionId: z.number(),
        initialData: z.record(z.any()).optional()
      });
      
      const result = instanceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid workflow instance data", details: result.error });
      }
      
      const { workflowDefinitionId, initialData } = result.data;
      
      // Verify the workflow definition exists
      const definition = await storage.getWorkflowDefinitionById(workflowDefinitionId);
      if (!definition) {
        return res.status(404).json({ error: "Workflow definition not found" });
      }
      
      // Create the workflow instance
      const instance = await storage.createWorkflowInstance({
        auditId: id,
        workflowDefinitionId,
        data: initialData || {},
        startedAt: new Date()
      });
      
      // Update the audit to mark it as using a workflow
      await storage.updateAudit(id, {
        workflowEnabled: true,
        status: (definition.steps as any[])[0].statusMapping || "in_progress"
      });
      
      // Create an audit event for workflow initiation
      const auditEvent = await storage.createAuditEvent({
        auditId: id,
        userId: req.user!.id,
        eventType: "workflow_started",
        comment: `Started "${definition.name}" workflow`,
        timestamp: new Date(),
      });
      
      // Broadcast the update
      const socketPayload = {
        type: "WORKFLOW_STARTED",
        audit,
        instance,
        definition,
        event: auditEvent
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.status(201).json({
        instance,
        definition,
        currentStep: (definition.steps as any[])[0]
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Advance a workflow to the next step
  app.post("/api/audits/:id/workflow/advance", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      // Check if a workflow instance exists for this audit
      const existingInstance = await storage.getWorkflowInstance(id);
      if (!existingInstance) {
        return res.status(404).json({ error: "No workflow instance found for this audit" });
      }
      
      // Validate the request body
      const advanceSchema = z.object({
        nextStepId: z.string(),
        formData: z.record(z.any()).optional(),
        comment: z.string().optional()
      });
      
      const result = advanceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid workflow advancement data", details: result.error });
      }
      
      const { nextStepId, formData, comment } = result.data;
      
      // Get the workflow definition
      const definition = await storage.getWorkflowDefinitionById(existingInstance.workflowDefinitionId);
      if (!definition) {
        return res.status(500).json({ error: "Workflow definition not found" });
      }
      
      const steps = definition.steps as any[];
      const currentStep = steps[existingInstance.currentStepIndex];
      
      // Check if the user has the required role for the current step
      if (currentStep.role && currentStep.role !== req.user!.role) {
        return res.status(403).json({ 
          error: `Only users with the ${currentStep.role} role can advance this workflow step`
        });
      }
      
      // Advance the workflow
      const updatedInstance = await storage.advanceWorkflow(id, nextStepId, formData);
      if (!updatedInstance) {
        return res.status(500).json({ error: "Failed to advance workflow" });
      }
      
      // Find the new current step
      const newCurrentStep = steps[updatedInstance.currentStepIndex];
      
      // Create an audit event for the workflow advancement
      const auditEvent = await storage.createAuditEvent({
        auditId: id,
        userId: req.user!.id,
        eventType: "workflow_advanced",
        comment: comment || `Advanced workflow to "${newCurrentStep.name}" step`,
        timestamp: new Date(),
      });
      
      // Get the updated audit
      const updatedAudit = await storage.getAuditById(id);
      
      // Broadcast the update
      const socketPayload = {
        type: "WORKFLOW_ADVANCED",
        audit: updatedAudit,
        instance: updatedInstance,
        definition,
        event: auditEvent
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.json({
        instance: updatedInstance,
        definition,
        currentStep: newCurrentStep,
        audit: updatedAudit
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Analytics endpoint for workload metrics
  app.get("/api/analytics/workload", ensureAuthenticated, async (req, res) => {
    try {
      // Validate query parameters
      const { start, end, type } = req.query;
      
      if (!start || !end || !type) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      // Different response based on type
      if (type === "users") {
        // Get all audits completed in the date range
        const allAudits = await storage.getAudits();
        const completedAudits = allAudits.filter(audit => {
          // Skip audits without an updatedAt timestamp
          if (!audit.updatedAt) return false;
          const updatedAt = new Date(audit.updatedAt);
          return (
            updatedAt >= startDate && 
            updatedAt <= endDate && 
            (audit.status === "approved" || audit.status === "rejected")
          );
        });
        
        // Get all users
        const users = await Promise.all(
          Array.from(new Set(completedAudits.map(a => a.assignedToId)))
            .filter(id => id !== null)
            .map(async id => await storage.getUser(id as number))
        );
        
        // Calculate metrics per user
        const userMetrics = await Promise.all(users.map(async user => {
          if (!user) return null;
          
          // Get audits assigned to this user
          const userAudits = allAudits.filter(a => a.assignedToId === user.id);
          
          // Get completed audits (approved or rejected) in date range
          const userCompletedAudits = completedAudits.filter(a => a.assignedToId === user.id);
          
          // Calculate average processing time in seconds
          let totalProcessingTime = 0;
          for (const audit of userCompletedAudits) {
            const assignedEvent = await storage.getAuditEvents(audit.id)
              .then(events => events.find(e => e.eventType === "assigned"));
            
            if (assignedEvent && audit.updatedAt) {
              const assignedTimestamp = new Date(assignedEvent.timestamp).getTime();
              const completedTimestamp = new Date(audit.updatedAt).getTime();
              totalProcessingTime += (completedTimestamp - assignedTimestamp) / 1000; // in seconds
            }
          }
          
          const averageProcessingTime = userCompletedAudits.length > 0 
            ? totalProcessingTime / userCompletedAudits.length 
            : 0;
          
          // Calculate completion rate
          const assigned = userAudits.length;
          const completed = userCompletedAudits.length;
          const completionRate = assigned > 0 ? completed / assigned : 0;
          
          // Count pending audits
          const pendingCount = userAudits.filter(a => 
            a.status === "pending" || a.status === "in_progress" || a.status === "needs_info"
          ).length;
          
          return {
            userId: user.id,
            userName: user.fullName,
            totalProcessed: userCompletedAudits.length,
            averageProcessingTime,
            completionRate,
            pendingCount
          };
        }));
        
        // Filter out null values from userMetrics
        const filteredUserMetrics = userMetrics.filter(m => m !== null);
        
        // Calculate overall metrics
        const totalProcessed = completedAudits.length;
        const averageProcessingSeconds = filteredUserMetrics.reduce((acc, user) => {
          return acc + (user!.averageProcessingTime * user!.totalProcessed);
        }, 0) / (totalProcessed || 1); // Avoid division by zero
        
        // Get pending audit count
        const pendingCount = allAudits.filter(a => 
          a.status === "pending" || a.status === "in_progress" || a.status === "needs_info"
        ).length;
        
        res.json({
          users: filteredUserMetrics,
          totalProcessed,
          averageProcessingHours: Math.round(averageProcessingSeconds / 3600 * 10) / 10, // Convert to hours with 1 decimal
          pendingCount
        });
      } 
      else if (type === "time") {
        // Get all completed audits in the date range
        const allAudits = await storage.getAudits();
        const completedAudits = allAudits.filter(audit => {
          // Skip audits without an updatedAt timestamp
          if (!audit.updatedAt) return false;
          const updatedAt = new Date(audit.updatedAt);
          return (
            updatedAt >= startDate && 
            updatedAt <= endDate && 
            (audit.status === "approved" || audit.status === "rejected")
          );
        });
        
        // Group by day and calculate average processing time
        const auditsByDay = new Map();
        
        for (const audit of completedAudits) {
          // We know updatedAt exists because we filtered on it above
          const date = new Date(audit.updatedAt!);
          const dateStr = date.toISOString().substring(0, 10); // YYYY-MM-DD
          
          if (!auditsByDay.has(dateStr)) {
            auditsByDay.set(dateStr, []);
          }
          
          // Find when this audit was assigned
          const events = await storage.getAuditEvents(audit.id);
          const assignEvent = events.find(e => e.eventType === "assigned");
          
          if (assignEvent && audit.updatedAt) {
            const assignDate = new Date(assignEvent.timestamp);
            const completedDate = new Date(audit.updatedAt!);
            const processingTime = (completedDate.getTime() - assignDate.getTime()) / 1000; // in seconds
            
            auditsByDay.get(dateStr).push({
              processingTime,
              audit
            });
          }
        }
        
        // Calculate daily averages
        const processingTimes = Array.from(auditsByDay.entries()).map(([date, audits]) => {
          const totalTime = audits.reduce((total: number, current: {processingTime: number}) => total + current.processingTime, 0);
          const count = audits.length;
          const averageTime = count > 0 ? totalTime / count : 0;
          
          return {
            date,
            averageTime,
            count
          };
        });
        
        // Sort by date
        processingTimes.sort((a, b) => a.date.localeCompare(b.date));
        
        // Calculate overall average
        const totalTime = processingTimes.reduce((total: number, current: {averageTime: number, count: number}) => 
          total + (current.averageTime * current.count), 0);
        const totalCount = processingTimes.reduce((count: number, current: {count: number}) => count + current.count, 0);
        const overallAverage = totalCount > 0 ? totalTime / totalCount : 0;
        
        res.json({
          processingTimes,
          averageProcessingHours: Math.round(overallAverage / 3600 * 10) / 10 // Convert to hours with 1 decimal
        });
      } 
      else {
        return res.status(400).json({ error: "Invalid type parameter. Use 'users' or 'time'." });
      }
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Create a new audit (for testing purposes)
  app.post("/api/audits", ensureAuthenticated, async (req, res) => {
    try {
      const result = insertAuditSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request body", details: result.error });
      }
      
      const audit = await storage.createAudit(result.data);
      
      // Create an audit event for the creation
      const auditEvent = await storage.createAuditEvent({
        auditId: audit.id,
        userId: req.user!.id,
        eventType: "created",
        timestamp: new Date(),
      });
      
      // Broadcast the new audit to all connected clients
      const socketPayload = {
        type: "AUDIT_CREATED",
        audit,
        event: auditEvent,
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.status(201).json(audit);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Setup document upload configurations
  const documentsDir = path.join(process.cwd(), 'uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }
  
  // Configure multer for file uploads
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename to prevent collisions
      const uniqueId = randomUUID();
      const fileExt = path.extname(file.originalname);
      cb(null, `${uniqueId}${fileExt}`);
    }
  });
  
  const upload = multer({ 
    storage: diskStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
      // Accept common document types
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only documents, images, and PDFs are allowed.'));
      }
    }
  });
  
  // Get documents for an audit
  app.get("/api/audits/:id/documents", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const documents = await storage.getDocuments(id);
      res.json(documents);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Upload a document for an audit
  app.post("/api/audits/:id/documents", ensureAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Create a document record in the database
      const document = await storage.createDocument({
        auditId: id,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        fileKey: req.file.filename, // Use the generated filename as the key
        uploadedById: req.user!.id,
        uploadedAt: new Date(),
      });
      
      // Create an audit event for the document upload
      const auditEvent = await storage.createAuditEvent({
        auditId: id,
        userId: req.user!.id,
        eventType: "document_uploaded",
        comment: `Document uploaded: ${req.file.originalname}`,
        timestamp: new Date(),
      });
      
      // Broadcast the document upload to all connected clients
      const socketPayload = {
        type: "DOCUMENT_UPLOADED",
        audit,
        event: auditEvent,
        document,
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.status(201).json(document);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Download a document
  app.get("/api/documents/:id/download", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const filePath = path.join(documentsDir, document.fileKey);
      
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on the server" });
      }
      
      // Set the appropriate headers
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
      
      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Delete a document
  app.delete("/api/documents/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Delete the file from the filesystem
      const filePath = path.join(documentsDir, document.fileKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete the document record from the database
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete document" });
      }
      
      // Create an audit event for the document deletion
      const auditEvent = await storage.createAuditEvent({
        auditId: document.auditId,
        userId: req.user!.id,
        eventType: "document_deleted",
        comment: `Document deleted: ${document.filename}`,
        timestamp: new Date(),
      });
      
      // Broadcast the document deletion to all connected clients
      const socketPayload = {
        type: "DOCUMENT_DELETED",
        auditId: document.auditId,
        documentId: id,
        event: auditEvent,
      };
      global.io?.customEmit("audit-update", socketPayload);
      
      res.json({ success: true });
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Advanced search for audits with fuzzy search capabilities
  app.post("/api/audits/search", ensureAuthenticated, async (req, res) => {
    try {
      // Validate the request body with a flexible schema to allow partial criteria
      const searchSchema = z.object({
        auditNumber: z.string().optional(),
        propertyId: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        reason: z.string().optional(),
        status: z.enum(["pending", "in_progress", "approved", "rejected", "needs_info"]).optional(),
        priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
        submittedDateStart: z.string().optional().transform(val => val ? new Date(val) : undefined),
        submittedDateEnd: z.string().optional().transform(val => val ? new Date(val) : undefined),
        dueDateStart: z.string().optional().transform(val => val ? new Date(val) : undefined),
        dueDateEnd: z.string().optional().transform(val => val ? new Date(val) : undefined),
        assignedToId: z.number().optional(),
        submittedById: z.number().optional(),
        assessmentMin: z.number().optional(),
        assessmentMax: z.number().optional(),
      });
      
      const result = searchSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid search criteria", details: result.error });
      }
      
      // Get all audits and filter them based on criteria
      const allAudits = await storage.getAudits();
      
      const { 
        auditNumber, propertyId, title, description, address, reason,
        status, priority, 
        submittedDateStart, submittedDateEnd, 
        dueDateStart, dueDateEnd,
        assignedToId, submittedById,
        assessmentMin, assessmentMax
      } = result.data;
      
      // Helper function for fuzzy search matching
      const fuzzyMatch = (text: string, searchTerm: string): boolean => {
        if (!text || !searchTerm) return false;
        
        // Convert both to lowercase for case-insensitive matching
        const textLower = text.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // Exact match or includes test first (fastest)
        if (textLower.includes(searchLower)) return true;
        
        // Split search term into words for multi-word matching
        const searchWords = searchLower.split(/\s+/).filter(word => word.length > 1);
        
        // Check if all words appear somewhere in the text (in any order)
        if (searchWords.length > 1) {
          return searchWords.every(word => textLower.includes(word));
        }
        
        // For single words, check for partial word matches with tolerance
        if (searchLower.length > 3) {
          // For longer search terms, try to match parts (simulate typo tolerance)
          for (let i = 0; i < searchLower.length - 2; i++) {
            const fragment = searchLower.substring(i, i + 3);
            if (textLower.includes(fragment)) return true;
          }
        }
        
        return false;
      };
      
      const filteredAudits = allAudits.filter(audit => {
        // Text-based fuzzy search fields
        if (auditNumber) {
          if (!fuzzyMatch(audit.auditNumber, auditNumber)) {
            return false;
          }
        }
        
        if (propertyId) {
          if (!fuzzyMatch(audit.propertyId, propertyId)) {
            return false;
          }
        }
        
        if (title) {
          if (!fuzzyMatch(audit.title, title)) {
            return false;
          }
        }
        
        if (description) {
          if (!fuzzyMatch(audit.description, description)) {
            return false;
          }
        }
        
        if (address) {
          if (!fuzzyMatch(audit.address, address)) {
            return false;
          }
        }
        
        if (reason) {
          if (!fuzzyMatch(audit.reason || "", reason)) {
            return false;
          }
        }
        
        // Exact match fields
        if (status && audit.status !== status) {
          return false;
        }
        
        if (priority && audit.priority !== priority) {
          return false;
        }
        
        if (submittedDateStart) {
          const auditDate = new Date(audit.submittedAt);
          if (auditDate < submittedDateStart) {
            return false;
          }
        }
        
        if (submittedDateEnd) {
          const auditDate = new Date(audit.submittedAt);
          if (auditDate > submittedDateEnd) {
            return false;
          }
        }
        
        if (dueDateStart) {
          const dueDate = new Date(audit.dueDate);
          if (dueDate < dueDateStart) {
            return false;
          }
        }
        
        if (dueDateEnd) {
          const dueDate = new Date(audit.dueDate);
          if (dueDate > dueDateEnd) {
            return false;
          }
        }
        
        if (assignedToId !== undefined) {
          if (assignedToId === null) {
            // Special case for unassigned audits
            if (audit.assignedToId !== null) {
              return false;
            }
          } else if (audit.assignedToId !== assignedToId) {
            return false;
          }
        }
        
        if (submittedById !== undefined && audit.submittedById !== submittedById) {
          return false;
        }
        
        if (assessmentMin !== undefined && audit.currentAssessment < assessmentMin) {
          return false;
        }
        
        if (assessmentMax !== undefined && audit.currentAssessment > assessmentMax) {
          return false;
        }
        
        return true;
      });
      
      // Return the filtered results
      res.json(filteredAudits);
      
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Bulk actions for audits
  app.post("/api/audits/bulk-action", ensureAuthenticated, async (req, res) => {
    try {
      // Validate the request body
      const bulkActionSchema = z.object({
        auditIds: z.array(z.number()).min(1, "Must provide at least one audit ID"),
        action: z.enum(["approve", "reject", "request_info", "set_priority", "assign"]),
        comment: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        assignedToId: z.number().optional(),
      });
      
      const result = bulkActionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request body", details: result.error });
      }
      
      const { auditIds, action, comment, priority, assignedToId } = result.data;
      
      // Process each audit
      const results = await Promise.all(auditIds.map(async (auditId) => {
        try {
          const audit = await storage.getAuditById(auditId);
          if (!audit) {
            return { id: auditId, success: false, error: "Audit not found" };
          }
          
          let updateData: Partial<Audit> = {};
          let eventType = "";
          
          // Set update data based on action
          switch (action) {
            case "approve":
              updateData.status = "approved";
              eventType = "approved";
              break;
            case "reject":
              updateData.status = "rejected";
              eventType = "rejected";
              break;
            case "request_info":
              updateData.status = "needs_info";
              eventType = "requested_info";
              break;
            case "set_priority":
              if (priority) {
                updateData.priority = priority;
                eventType = "priority_changed";
              }
              break;
            case "assign":
              if (assignedToId) {
                // Validate that the assigned user exists
                const user = await storage.getUser(assignedToId);
                if (!user) {
                  return { id: auditId, success: false, error: "Assigned user not found" };
                }
                
                updateData.assignedToId = assignedToId;
                
                // If the audit is currently pending and being assigned, set it to in_progress
                if (audit.status === "pending") {
                  updateData.status = "in_progress";
                }
                
                eventType = "assigned";
              }
              break;
          }
          
          // Update the audit
          if (Object.keys(updateData).length === 0) {
            return { id: auditId, success: false, error: "No valid update data" };
          }
          
          const updatedAudit = await storage.updateAudit(auditId, updateData);
          if (!updatedAudit) {
            return { id: auditId, success: false, error: "Failed to update audit" };
          }
          
          // Create an audit event
          const auditEvent = await storage.createAuditEvent({
            auditId,
            userId: req.user!.id,
            eventType,
            comment,
            changes: {
              before: action === "set_priority" ? { priority: audit.priority } : 
                     action === "assign" ? { assignedToId: audit.assignedToId } : { status: audit.status },
              after: action === "set_priority" ? { priority } : 
                     action === "assign" ? { assignedToId } : { status: updateData.status },
            },
            timestamp: new Date(),
          });
          
          // Broadcast the update to all connected clients
          const socketPayload = {
            type: "AUDIT_UPDATED",
            audit: updatedAudit,
            event: auditEvent,
            bulkAction: true,
          };
          global.io?.customEmit("audit-update", socketPayload);
          
          return { id: auditId, success: true, audit: updatedAudit, event: auditEvent };
        } catch (error) {
          console.error(`Error processing audit ID ${auditId}:`, error);
          return { id: auditId, success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
      }));
      
      // Check if all updates were successful
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        res.json({ success: true, results });
      } else {
        res.status(207).json({
          partialSuccess: true,
          message: "Some audits could not be processed",
          results
        });
      }
    } catch (error) {
      handleApiError(res, error);
    }
  });
  
  // Export audit as PDF or CSV
  app.get("/api/audits/:id/export", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }
      
      const format = req.query.format as string || 'pdf';
      if (format !== 'pdf' && format !== 'csv') {
        return res.status(400).json({ error: "Invalid export format. Use 'pdf' or 'csv'." });
      }
      
      const audit = await storage.getAuditById(id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      // Get related data for the report
      const events = await storage.getAuditEvents(id);
      const submitter = await storage.getUser(audit.submittedById);
      const assignee = audit.assignedToId ? await storage.getUser(audit.assignedToId) : null;
      
      if (format === 'csv') {
        // Generate CSV
        const csvData = [
          // Headers
          ["Audit Number", "Title", "Status", "Priority", "Property ID", "Address", 
           "Current Assessment", "Proposed Assessment", "Tax Impact", "Submitted By", 
           "Submitted Date", "Due Date", "Assigned To"],
          // Data row
          [
            audit.auditNumber,
            audit.title,
            audit.status,
            audit.priority,
            audit.propertyId,
            audit.address,
            audit.currentAssessment.toString(),
            audit.proposedAssessment.toString(),
            audit.taxImpact?.toString() || '',
            submitter?.fullName || `ID: ${audit.submittedById}`,
            new Date(audit.submittedAt).toISOString().split('T')[0],
            new Date(audit.dueDate).toISOString().split('T')[0],
            assignee?.fullName || ''
          ]
        ];
        
        // Add events as additional rows
        csvData.push([]);
        csvData.push(["Event History"]);
        csvData.push(["Type", "User", "Date", "Comment"]);
        
        for (const event of events) {
          const user = await storage.getUser(event.userId);
          csvData.push([
            event.eventType,
            user?.fullName || `ID: ${event.userId}`,
            new Date(event.timestamp).toISOString().split('T')[0],
            event.comment || ''
          ]);
        }
        
        // Convert to CSV string
        const csvContent = csvData.map(row => row.map(cell => {
          // Escape quotes and wrap in quotes if needed
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-${audit.auditNumber}.csv`);
        res.send(csvContent);
        
      } else {
        // For PDF, we'll generate a simple HTML representation and send it as text/html
        // In a production app, you would use a PDF generation library like PDFKit
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Audit Report: ${audit.auditNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .section { margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            .property { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .assessment { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .label { color: #666; font-size: 0.9em; }
            .value { font-weight: bold; }
            .events { margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f1f1; text-align: left; padding: 8px; }
            td { padding: 8px; border-top: 1px solid #eee; }
            .status { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 0.8em; }
            .status.pending { background: #e6f0ff; color: #0066cc; }
            .status.in_progress { background: #e6e6ff; color: #3333cc; }
            .status.approved { background: #e6ffe6; color: #008800; }
            .status.rejected { background: #ffe6e6; color: #cc0000; }
            .status.needs_info { background: #fff2e6; color: #cc7700; }
          </style>
        </head>
        <body>
          <h1>Audit Report: ${audit.auditNumber}</h1>
          
          <div class="section">
            <h2>${audit.title}</h2>
            <p>${audit.description}</p>
            
            <div class="row">
              <span class="label">Status:</span>
              <span class="value status ${audit.status}">${audit.status.replace('_', ' ').toUpperCase()}</span>
            </div>
            
            <div class="row">
              <span class="label">Priority:</span>
              <span class="value">${audit.priority.toUpperCase()}</span>
            </div>
            
            <div class="row">
              <span class="label">Due Date:</span>
              <span class="value">${new Date(audit.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div class="section property">
            <div>
              <h3>Property Details</h3>
              <div class="row">
                <span class="label">Property ID:</span>
                <span class="value">${audit.propertyId}</span>
              </div>
              <div class="row">
                <span class="label">Address:</span>
                <span class="value">${audit.address}</span>
              </div>
            </div>
            
            <div class="assessment">
              <h3>Assessment Changes</h3>
              <div class="row">
                <span class="label">Current Assessment:</span>
                <span class="value">$${audit.currentAssessment.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">Proposed Assessment:</span>
                <span class="value">$${audit.proposedAssessment.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">Difference:</span>
                <span class="value">$${(audit.proposedAssessment - audit.currentAssessment).toLocaleString()} (${((audit.proposedAssessment - audit.currentAssessment) / audit.currentAssessment * 100).toFixed(1)}%)</span>
              </div>
              <div class="row">
                <span class="label">Tax Impact:</span>
                <span class="value">${audit.taxImpact ? '$' + audit.taxImpact.toLocaleString() + '/year' : 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3>Reason for Amendment</h3>
            <p>${audit.reason || 'No reason provided.'}</p>
          </div>
          
          <div class="section">
            <h3>Submission Information</h3>
            <div class="row">
              <span class="label">Submitted By:</span>
              <span class="value">${submitter?.fullName || 'Unknown'}</span>
            </div>
            <div class="row">
              <span class="label">Submission Date:</span>
              <span class="value">${new Date(audit.submittedAt).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span class="label">Assigned To:</span>
              <span class="value">${assignee?.fullName || 'Unassigned'}</span>
            </div>
          </div>
          
          <div class="section events">
            <h3>Event History</h3>
            <table>
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                ${events.map(event => `
                    <tr>
                      <td>${event.eventType.replace('_', ' ')}</td>
                      <td>ID: ${event.userId}</td>
                      <td>${new Date(event.timestamp).toLocaleDateString()}</td>
                      <td>${event.comment || ''}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <p>Generated on ${new Date().toLocaleDateString()} by County Audit Hub</p>
          </div>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename=audit-${audit.auditNumber}.html`);
        res.send(htmlContent);
      }
      
      // Create an audit event for the export
      await storage.createAuditEvent({
        auditId: id,
        userId: req.user!.id,
        eventType: "exported",
        comment: `Audit exported as ${format.toUpperCase()}`,
        timestamp: new Date(),
      });
      
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Register AI agent system routes
  console.log('Registering AI agent system routes...');
  app.use('/api/agents', ensureAuthenticated, agentRoutes);
  
  // Register batch validation API
  app.use('/api/batch-validation', ensureAuthenticated, batchValidationApi);
  
  // Register advanced analytics API routes
  console.log('Registering advanced analytics API routes...');
  registerAdvancedAnalyticsAPI(app);

  return httpServer;
}
