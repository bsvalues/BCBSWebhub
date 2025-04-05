import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./socket";
import { z } from "zod";
import { insertAuditSchema, insertAuditEventSchema, insertDocumentSchema, users as usersTable } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
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
  
  // Setup document upload configurations
  const documentsDir = path.join(process.cwd(), 'uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }
  
  // Configure multer for file uploads
  const storage = multer.diskStorage({
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
    storage,
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

  return httpServer;
}
