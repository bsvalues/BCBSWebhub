import { users, audits, auditEvents, documents, workflowDefinitions, workflowInstances, 
  type User, type InsertUser, type Audit, type InsertAudit, type AuditEvent, type InsertAuditEvent, 
  type Document, type InsertDocument, type WorkflowDefinition, type InsertWorkflowDefinition, 
  type WorkflowInstance, type InsertWorkflowInstance, type WorkflowStep } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import connectPg from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import * as bcrypt from "bcrypt";
import { eq, desc, and, asc, gt, lt, gte, lte, isNull, isNotNull } from "drizzle-orm";

// Document interface with URL
export interface DocumentWithUrl extends Document {
  url: string;
}

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined>;
  updateUserEmail(userId: number, email: string): Promise<User | undefined>;
  
  // Audit operations
  getAudits(filters?: Partial<Audit>): Promise<Audit[]>;
  getPendingAudits(): Promise<Audit[]>;
  getAssignedAudits(userId: number): Promise<Audit[]>;
  getAuditsCreatedByUser(userId: number): Promise<Audit[]>;
  getAuditById(id: number): Promise<Audit | undefined>;
  getAuditByNumber(auditNumber: string): Promise<Audit | undefined>;
  createAudit(audit: InsertAudit): Promise<Audit>;
  updateAudit(id: number, update: Partial<Audit>): Promise<Audit | undefined>;
  
  // Audit event operations
  getAuditEvents(auditId: number): Promise<AuditEvent[]>;
  getRecentAuditEvents(limit?: number): Promise<AuditEvent[]>;
  createAuditEvent(event: InsertAuditEvent): Promise<AuditEvent>;
  
  // Document operations
  getDocuments(auditId: number): Promise<DocumentWithUrl[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Workflow operations
  getWorkflowDefinitions(auditType?: string): Promise<WorkflowDefinition[]>;
  getWorkflowDefinitionById(id: number): Promise<WorkflowDefinition | undefined>;
  createWorkflowDefinition(definition: InsertWorkflowDefinition): Promise<WorkflowDefinition>;
  updateWorkflowDefinition(id: number, update: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | undefined>;
  deleteWorkflowDefinition(id: number): Promise<boolean>;
  
  // Workflow instance operations
  getWorkflowInstance(auditId: number): Promise<WorkflowInstance | undefined>;
  createWorkflowInstance(instance: InsertWorkflowInstance): Promise<WorkflowInstance>;
  updateWorkflowInstance(id: number, update: Partial<WorkflowInstance>): Promise<WorkflowInstance | undefined>;
  advanceWorkflow(auditId: number, nextStepId: string, userData?: any): Promise<WorkflowInstance | undefined>;
  
  // Session store
  sessionStore: any; // This avoids the type error with session.SessionStore
  
  // Database seeding (optional)
  seed?: () => Promise<void>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any to avoid SessionStore type error
  
  constructor() {
    // Set up the session store using PostgreSQL
    const PostgresSessionStore = connectPg(session);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'sessions'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results.length > 0 ? results[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure role has a default
    const user = { ...insertUser, role: insertUser.role || "auditor" };
    
    const results = await db.insert(users).values(user).returning();
    return results[0];
  }
  
  async updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined> {
    // First check if the user exists
    const existingUser = await this.getUser(userId);
    if (!existingUser) return undefined;
    
    const results = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        // Update last login timestamp when password is reset
        lastLogin: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
      
    return results.length > 0 ? results[0] : undefined;
  }
  
  async updateUserEmail(userId: number, email: string): Promise<User | undefined> {
    // First check if the user exists
    const existingUser = await this.getUser(userId);
    if (!existingUser) return undefined;
    
    const results = await db
      .update(users)
      .set({ email })
      .where(eq(users.id, userId))
      .returning();
      
    return results.length > 0 ? results[0] : undefined;
  }

  // Audit operations
  async getAudits(filters?: Partial<Audit>): Promise<Audit[]> {
    let query = db.select().from(audits);
    
    // Apply filters if specified
    if (filters) {
      // Handle each filter individually to avoid type issues
      if (filters.status) {
        query = query.where(eq(audits.status, filters.status));
      }
      if (filters.priority) {
        query = query.where(eq(audits.priority, filters.priority));
      }
      if (filters.submittedById) {
        query = query.where(eq(audits.submittedById, filters.submittedById));
      }
      if (filters.assignedToId) {
        query = query.where(eq(audits.assignedToId, filters.assignedToId));
      }
    }
    
    // Add ordering - first by priority, then by submission date
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const results = await query;
    
    // Sort the results in memory since complex sorting with drizzle can be challenging
    return results.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }

  async getPendingAudits(): Promise<Audit[]> {
    return this.getAudits({ status: "pending" });
  }
  
  async getAssignedAudits(userId: number): Promise<Audit[]> {
    return this.getAudits({ assignedToId: userId });
  }
  
  async getAuditsCreatedByUser(userId: number): Promise<Audit[]> {
    return this.getAudits({ submittedById: userId });
  }

  async getAuditById(id: number): Promise<Audit | undefined> {
    const results = await db.select().from(audits).where(eq(audits.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getAuditByNumber(auditNumber: string): Promise<Audit | undefined> {
    const results = await db.select().from(audits).where(eq(audits.auditNumber, auditNumber));
    return results.length > 0 ? results[0] : undefined;
  }

  async createAudit(insertAudit: InsertAudit): Promise<Audit> {
    // Provide defaults for nullable fields
    const audit = {
      ...insertAudit,
      status: insertAudit.status || "pending",
      auditNumber: insertAudit.auditNumber || `A-${Date.now().toString().slice(-6)}`,
      taxImpact: insertAudit.taxImpact ?? null,
      reason: insertAudit.reason ?? null,
      assignedToId: insertAudit.assignedToId ?? null
    };
    
    const results = await db.insert(audits).values(audit).returning();
    return results[0];
  }

  async updateAudit(id: number, update: Partial<Audit>): Promise<Audit | undefined> {
    // First check if the audit exists
    const existingAudit = await this.getAuditById(id);
    if (!existingAudit) return undefined;
    
    // Add updatedAt timestamp
    const updatedValues = {
      ...update,
      updatedAt: new Date()
    };
    
    const results = await db
      .update(audits)
      .set(updatedValues)
      .where(eq(audits.id, id))
      .returning();
      
    return results.length > 0 ? results[0] : undefined;
  }

  // Audit event operations
  async getAuditEvents(auditId: number): Promise<AuditEvent[]> {
    return db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.auditId, auditId))
      .orderBy(desc(auditEvents.timestamp));
  }

  async getRecentAuditEvents(limit: number = 10): Promise<AuditEvent[]> {
    return db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.timestamp))
      .limit(limit);
  }

  async createAuditEvent(insertEvent: InsertAuditEvent): Promise<AuditEvent> {
    // Handle optional fields
    const event = {
      ...insertEvent,
      comment: insertEvent.comment ?? null,
      changes: insertEvent.changes ?? {}
    };
    
    const results = await db.insert(auditEvents).values(event).returning();
    return results[0];
  }
  
  // Document operations
  async getDocuments(auditId: number): Promise<DocumentWithUrl[]> {
    const results = await db
      .select()
      .from(documents)
      .where(eq(documents.auditId, auditId))
      .orderBy(desc(documents.uploadedAt));
      
    // Add URL to each document
    return results.map(doc => ({
      ...doc,
      url: `/api/documents/${doc.id}/download` // URL for downloading the document
    }));
  }
  
  async getDocumentById(id: number): Promise<Document | undefined> {
    const results = await db.select().from(documents).where(eq(documents.id, id));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const results = await db.insert(documents).values(insertDocument).returning();
    return results[0];
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    const results = await db.delete(documents).where(eq(documents.id, id)).returning();
    return results.length > 0;
  }
  
  // Workflow operations
  async getWorkflowDefinitions(auditType?: string): Promise<WorkflowDefinition[]> {
    let query = db.select().from(workflowDefinitions);
    
    if (auditType) {
      query = query.where(eq(workflowDefinitions.auditType, auditType as any));
    }
    
    // Only return active workflow definitions by default
    query = query.where(eq(workflowDefinitions.isActive, true));
    
    return query.orderBy(asc(workflowDefinitions.name));
  }
  
  async getWorkflowDefinitionById(id: number): Promise<WorkflowDefinition | undefined> {
    const results = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, id));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createWorkflowDefinition(definition: InsertWorkflowDefinition): Promise<WorkflowDefinition> {
    const results = await db.insert(workflowDefinitions).values(definition).returning();
    return results[0];
  }
  
  async updateWorkflowDefinition(id: number, update: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | undefined> {
    // First check if the workflow definition exists
    const existingDef = await this.getWorkflowDefinitionById(id);
    if (!existingDef) return undefined;
    
    // Add updatedAt timestamp
    const updatedValues = {
      ...update,
      updatedAt: new Date()
    };
    
    const results = await db
      .update(workflowDefinitions)
      .set(updatedValues)
      .where(eq(workflowDefinitions.id, id))
      .returning();
      
    return results.length > 0 ? results[0] : undefined;
  }
  
  async deleteWorkflowDefinition(id: number): Promise<boolean> {
    // We don't actually delete workflows, just mark them as inactive
    const results = await db
      .update(workflowDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(workflowDefinitions.id, id))
      .returning();
      
    return results.length > 0;
  }
  
  // Workflow instance operations
  async getWorkflowInstance(auditId: number): Promise<WorkflowInstance | undefined> {
    const results = await db.select().from(workflowInstances).where(eq(workflowInstances.auditId, auditId));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createWorkflowInstance(instance: InsertWorkflowInstance): Promise<WorkflowInstance> {
    const results = await db.insert(workflowInstances).values(instance).returning();
    return results[0];
  }
  
  async updateWorkflowInstance(id: number, update: Partial<WorkflowInstance>): Promise<WorkflowInstance | undefined> {
    const results = await db
      .update(workflowInstances)
      .set(update)
      .where(eq(workflowInstances.id, id))
      .returning();
      
    return results.length > 0 ? results[0] : undefined;
  }
  
  async advanceWorkflow(auditId: number, nextStepId: string, userData: any = {}): Promise<WorkflowInstance | undefined> {
    // Get the workflow instance and related workflow definition
    const instance = await this.getWorkflowInstance(auditId);
    if (!instance) return undefined;
    
    // Get the workflow definition
    const definition = await this.getWorkflowDefinitionById(instance.workflowDefinitionId);
    if (!definition) return undefined;
    
    // Get the current step and find the target next step
    const steps = definition.steps as WorkflowStep[];
    const currentStep = steps[instance.currentStepIndex];
    
    // Make sure the requested next step is allowed from current step
    if (!currentStep.nextSteps.includes(nextStepId)) {
      throw new Error(`Step '${nextStepId}' is not a valid next step from '${currentStep.id}'`);
    }
    
    // Find the index of the next step
    const nextStepIndex = steps.findIndex(step => step.id === nextStepId);
    if (nextStepIndex === -1) {
      throw new Error(`Step '${nextStepId}' not found in workflow definition`);
    }
    
    // Add the current step to completed steps
    const completedSteps = [...(instance.completedStepIndexes as number[]), instance.currentStepIndex];
    
    // Update the workflow instance
    const nextStep = steps[nextStepIndex];
    const existingData = instance.data || {};
    const updatedData = {
      ...existingData,
      ...(userData || {}),
      [`step_${currentStep.id}_completed_at`]: new Date(),
      [`step_${nextStep.id}_started_at`]: new Date()
    };
    
    // Determine if the workflow is completed
    const isComplete = nextStep.nextSteps.length === 0;
    
    const updatedInstance = await this.updateWorkflowInstance(instance.id, {
      currentStepIndex: nextStepIndex,
      completedStepIndexes: completedSteps,
      status: isComplete ? "completed" : "active",
      completedAt: isComplete ? new Date() : null,
      data: updatedData
    });
    
    // If the step has a status mapping, update the audit status
    if (nextStep.statusMapping) {
      await this.updateAudit(auditId, {
        status: nextStep.statusMapping as any
      });
    }
    
    return updatedInstance;
  }
  
  // Initialize the database with seed data
  async seed() {
    // Check if users exist already
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed");
      return;
    }
    
    console.log("Seeding database with initial data...");
    
    // Create users with proper bcrypt hashing
    const admin = await this.createUser({
      username: "admin",
      password: await bcrypt.hash("password123", 10), // Simple test password
      fullName: "Administrator",
      role: "admin"
    });
    
    // Create auditor user
    const auditor = await this.createUser({
      username: "auditor",
      password: await bcrypt.hash("password123", 10), // Simple test password
      fullName: "John Doe",
      role: "auditor"
    });
    
    // Create some sample audits
    const audit1 = await this.createAudit({
      title: "123 Main St Tax Assessment",
      description: "Review of the residential property assessment for 123 Main St",
      propertyId: "R10045982",
      address: "123 Main St, County Seat, ST 12345",
      currentAssessment: 350000,
      proposedAssessment: 410000,
      submittedById: auditor.id,
      priority: "normal",
      status: "pending",
      auditNumber: "A-1001",
      taxImpact: 750,
      reason: "Remodeled kitchen and bathroom",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      auditType: "standard",
      propertyType: "residential"
    });
    
    await this.createAudit({
      title: "Commercial Property 555 Business Ave",
      description: "Appeal of commercial property valuation",
      propertyId: "C20078945",
      address: "555 Business Ave, County Seat, ST 12345",
      currentAssessment: 1250000,
      proposedAssessment: 980000,
      submittedById: auditor.id,
      priority: "high",
      status: "needs_info",
      auditNumber: "A-1002",
      taxImpact: -3400,
      reason: "Recent vacancy and market downturn",
      assignedToId: admin.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      auditType: "commercial",
      propertyType: "commercial"
    });
    
    await this.createAudit({
      title: "Agricultural Land Assessment",
      description: "Review of 50-acre agricultural parcel",
      propertyId: "A30012587",
      address: "Rural Route 5, County Seat, ST 12345",
      currentAssessment: 780000,
      proposedAssessment: 820000,
      submittedById: admin.id,
      priority: "urgent",
      status: "pending",
      auditNumber: "A-1003",
      taxImpact: 650,
      auditType: "complex",
      propertyType: "agricultural",
      reason: "Land use change on portion of property",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    });
    
    // Add some audit events
    await this.createAuditEvent({
      auditId: audit1.id,
      userId: admin.id,
      eventType: "status_change",
      comment: "Audit assigned for review",
      changes: { status: { from: null, to: "pending" } }
    });
    
    await this.createAuditEvent({
      auditId: audit1.id,
      userId: auditor.id,
      eventType: "comment",
      comment: "Need to check recent comparable sales in the area"
    });
    
    // Create a sample workflow definition for residential properties
    const residentialWorkflow = await this.createWorkflowDefinition({
      name: "Residential Property Assessment",
      description: "Standard workflow for residential property assessment reviews",
      auditType: "residential",
      createdById: admin.id,
      steps: [
        {
          id: "initial_review",
          name: "Initial Review",
          description: "Initial assessment of the property value and tax impact",
          role: "auditor",
          nextSteps: ["supervisor_review", "request_additional_info"],
          statusMapping: "in_progress",
          formFields: ["notes", "initial_findings"]
        },
        {
          id: "request_additional_info",
          name: "Request Additional Information",
          description: "Request additional documentation or information from the property owner",
          role: "auditor",
          nextSteps: ["initial_review"],
          statusMapping: "needs_info",
          formFields: ["requested_information", "due_date"]
        },
        {
          id: "supervisor_review",
          name: "Supervisor Review",
          description: "Review by a supervisor to ensure accuracy and compliance",
          role: "admin",
          nextSteps: ["final_approval", "initial_review", "request_additional_info"],
          statusMapping: "waiting_for_supervisor",
          isApprovalStep: true,
          formFields: ["supervisor_notes"]
        },
        {
          id: "final_approval",
          name: "Final Approval",
          description: "Final approval of the assessment",
          role: "admin",
          nextSteps: [],
          statusMapping: "approved",
          isApprovalStep: true,
          formFields: ["approval_notes"]
        }
      ]
    });
    
    // Create a sample workflow for commercial properties with conditional logic
    await this.createWorkflowDefinition({
      name: "Commercial Property Assessment",
      description: "Enhanced workflow for commercial property assessments",
      auditType: "commercial",
      thresholdAmount: 1000000, // Properties over $1M have additional review steps
      createdById: admin.id,
      steps: [
        {
          id: "initial_review",
          name: "Initial Review",
          description: "Initial assessment of the commercial property",
          role: "auditor",
          nextSteps: ["financial_analysis", "market_comparison"],
          statusMapping: "in_progress",
          formFields: ["notes", "property_class", "zoning_info"]
        },
        {
          id: "financial_analysis",
          name: "Financial Analysis",
          description: "Detailed financial analysis of the property income and expenses",
          role: "auditor",
          nextSteps: ["market_comparison"],
          statusMapping: "in_progress",
          formFields: ["cap_rate", "noi", "vacancy_rate"]
        },
        {
          id: "market_comparison",
          name: "Market Comparison",
          description: "Comparison with similar commercial properties",
          role: "auditor",
          nextSteps: ["supervisor_review"],
          statusMapping: "in_progress",
          formFields: ["comparable_properties", "price_per_sqft"]
        },
        {
          id: "supervisor_review",
          name: "Supervisor Review",
          description: "Review by a supervisor",
          role: "admin",
          nextSteps: ["final_approval", "specialist_review"],
          statusMapping: "waiting_for_supervisor",
          isApprovalStep: true,
          conditionalLogic: [
            {
              field: "proposedAssessment",
              operator: "greaterThan",
              value: 1000000,
              nextStepOnMatch: "specialist_review",
              nextStepOnFail: "final_approval"
            }
          ]
        },
        {
          id: "specialist_review",
          name: "Specialist Review",
          description: "Special review for high-value properties",
          role: "admin",
          nextSteps: ["final_approval"],
          statusMapping: "under_review",
          isApprovalStep: true,
          requiredApprovals: 2
        },
        {
          id: "final_approval",
          name: "Final Approval",
          description: "Final approval of the commercial assessment",
          role: "admin",
          nextSteps: [],
          statusMapping: "approved",
          isApprovalStep: true
        }
      ]
    });
    
    // Create a workflow instance for the first audit
    await this.createWorkflowInstance({
      auditId: audit1.id,
      workflowDefinitionId: residentialWorkflow.id,
      data: {
        initial_findings: "Property appears to be accurately assessed based on recent renovations."
      }
    });
    
    // Update the audit to use the workflow
    await this.updateAudit(audit1.id, {
      workflowEnabled: true,
      status: "in_progress"
    });
    
    console.log("Database seeding complete with workflow definitions");
  }
}

export const storage = new DatabaseStorage();
