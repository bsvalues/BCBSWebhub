import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./socket";
import { z } from "zod";
import { insertAuditSchema, insertAuditEventSchema, users as usersTable } from "@shared/schema";
import { db } from "./db";

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

  return httpServer;
}
