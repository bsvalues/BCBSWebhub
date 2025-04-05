import { users, audits, auditEvents, type User, type InsertUser, type Audit, type InsertAudit, type AuditEvent, type InsertAuditEvent } from "@shared/schema";
import type { json } from "drizzle-orm/pg-core";
import { eq, desc, and, asc } from "drizzle-orm";
import { db } from "./db";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { Pool } from "@neondatabase/serverless";
import { IStorage } from "./storage";
import * as bcrypt from "bcrypt";

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
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
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
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
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
    
    console.log("Database seeding complete");
  }
}