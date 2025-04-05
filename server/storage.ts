import { users, audits, auditEvents, type User, type InsertUser, type Audit, type InsertAudit, type AuditEvent, type InsertAuditEvent } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Audit operations
  getAudits(filters?: Partial<Audit>): Promise<Audit[]>;
  getPendingAudits(): Promise<Audit[]>;
  getAuditById(id: number): Promise<Audit | undefined>;
  getAuditByNumber(auditNumber: string): Promise<Audit | undefined>;
  createAudit(audit: InsertAudit): Promise<Audit>;
  updateAudit(id: number, update: Partial<Audit>): Promise<Audit | undefined>;
  
  // Audit event operations
  getAuditEvents(auditId: number): Promise<AuditEvent[]>;
  getRecentAuditEvents(limit?: number): Promise<AuditEvent[]>;
  createAuditEvent(event: InsertAuditEvent): Promise<AuditEvent>;
  
  // Session store
  sessionStore: any; // This avoids the type error with session.SessionStore
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private audits: Map<number, Audit>;
  private auditEvents: Map<number, AuditEvent>;
  private currentUserId: number;
  private currentAuditId: number;
  private currentEventId: number;
  sessionStore: any; // Using any to avoid SessionStore type error

  constructor() {
    this.users = new Map();
    this.audits = new Map();
    this.auditEvents = new Map();
    this.currentUserId = 1;
    this.currentAuditId = 1;
    this.currentEventId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Add some default users for testing
    this.createUser({
      username: "admin",
      password: "password",
      fullName: "Admin User",
      role: "admin"
    });
    
    this.createUser({
      username: "auditor",
      password: "password",
      fullName: "Sarah Johnson",
      role: "auditor"
    });

    // Add some sample audits for testing
    const user1 = this.users.get(1);
    const user2 = this.users.get(2);
    
    if (user1 && user2) {
      // Create some sample audits
      this.createAudit({
        auditNumber: "A-100001",
        title: "Property Tax Assessment Review - 123 Main St",
        description: "Residential property assessment review for recent improvements",
        propertyId: "P-12345",
        address: "123 Main St, County, State 12345",
        currentAssessment: 250000,
        proposedAssessment: 285000,
        taxImpact: 875,
        reason: "Property improvements including new addition and renovated kitchen",
        status: "pending",
        priority: "high",
        submittedById: user1.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        assignedToId: user2.id
      });
      
      this.createAudit({
        auditNumber: "A-100002",
        title: "Commercial Property Classification - 500 Market Ave",
        description: "Review of commercial property classification change request",
        propertyId: "C-54321",
        address: "500 Market Ave, County, State 12345",
        currentAssessment: 1200000,
        proposedAssessment: 1200000,
        taxImpact: 0,
        reason: "Owner requesting review of property classification from commercial to mixed-use",
        status: "pending",
        priority: "normal",
        submittedById: user2.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        assignedToId: user1.id
      });
      
      this.createAudit({
        auditNumber: "A-100003",
        title: "Appeal Review - 789 Oak Drive",
        description: "Property owner appealing recent assessment increase",
        propertyId: "P-67890",
        address: "789 Oak Drive, County, State 12345",
        currentAssessment: 475000,
        proposedAssessment: 420000,
        taxImpact: -1350,
        reason: "Owner disputes comparable properties used in assessment",
        status: "pending",
        priority: "urgent",
        submittedById: user1.id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        assignedToId: user2.id
      });
      
      this.createAudit({
        auditNumber: "A-100004",
        title: "Agricultural Land Exemption - 1500 Rural Road",
        description: "Review of agricultural land exemption application",
        propertyId: "A-98765",
        address: "1500 Rural Road, County, State 12345",
        currentAssessment: 350000,
        proposedAssessment: 180000,
        taxImpact: -4200,
        reason: "Owner applying for agricultural use exemption on 25 acres",
        status: "approved",
        priority: "normal",
        submittedById: user2.id,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        assignedToId: user1.id
      });
      
      this.createAudit({
        auditNumber: "A-100005",
        title: "Historical Property Designation - 300 Heritage Lane",
        description: "Review of historical property designation application",
        propertyId: "H-13579",
        address: "300 Heritage Lane, County, State 12345",
        currentAssessment: 550000,
        proposedAssessment: 495000,
        taxImpact: -1375,
        reason: "Owner applying for historical property tax reduction based on landmark status",
        status: "rejected",
        priority: "low",
        submittedById: user1.id,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        assignedToId: user2.id
      });
      
      // Create audit events for the completed audits
      this.createAuditEvent({
        auditId: 4,
        userId: user1.id,
        eventType: "approved",
        comment: "All documentation verified. Property qualifies for agricultural exemption.",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 5 days ago + 2 hours
        changes: {
          before: { status: "pending" },
          after: { status: "approved" }
        }
      });
      
      this.createAuditEvent({
        auditId: 5,
        userId: user2.id,
        eventType: "rejected",
        comment: "Property does not meet minimum age requirement for historical designation.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 2 days ago + 4 hours
        changes: {
          before: { status: "pending" },
          after: { status: "rejected" }
        }
      });
      
      // Add some activity events
      this.createAuditEvent({
        auditId: 3,
        userId: user2.id,
        eventType: "commented",
        comment: "Requested additional documentation from property owner",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });
      
      this.createAuditEvent({
        auditId: 2,
        userId: user1.id,
        eventType: "status_update",
        comment: "Documentation review in progress",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Audit operations
  async getAudits(filters?: Partial<Audit>): Promise<Audit[]> {
    let audits = Array.from(this.audits.values());
    
    if (filters) {
      audits = audits.filter(audit => {
        for (const [key, value] of Object.entries(filters)) {
          if (audit[key as keyof Audit] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    return audits.sort((a, b) => {
      // Sort by priority and then by submission date
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
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

  async getAuditById(id: number): Promise<Audit | undefined> {
    return this.audits.get(id);
  }

  async getAuditByNumber(auditNumber: string): Promise<Audit | undefined> {
    return Array.from(this.audits.values()).find(
      (audit) => audit.auditNumber === auditNumber,
    );
  }

  async createAudit(insertAudit: InsertAudit): Promise<Audit> {
    const id = this.currentAuditId++;
    const now = new Date();
    
    // Generate an audit number if not provided
    const auditNumber = insertAudit.auditNumber || `A-${100000 + id}`;
    
    const audit: Audit = {
      ...insertAudit,
      id,
      auditNumber,
      submittedAt: now,
      updatedAt: now,
    };
    
    this.audits.set(id, audit);
    return audit;
  }

  async updateAudit(id: number, update: Partial<Audit>): Promise<Audit | undefined> {
    const audit = await this.getAuditById(id);
    if (!audit) return undefined;
    
    const updatedAudit = {
      ...audit,
      ...update,
      id,
      updatedAt: new Date(),
    };
    
    this.audits.set(id, updatedAudit);
    return updatedAudit;
  }

  // Audit event operations
  async getAuditEvents(auditId: number): Promise<AuditEvent[]> {
    return Array.from(this.auditEvents.values())
      .filter(event => event.auditId === auditId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getRecentAuditEvents(limit: number = 10): Promise<AuditEvent[]> {
    return Array.from(this.auditEvents.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createAuditEvent(insertEvent: InsertAuditEvent): Promise<AuditEvent> {
    const id = this.currentEventId++;
    const now = new Date();
    
    const event: AuditEvent = {
      ...insertEvent,
      id,
      timestamp: now,
    };
    
    this.auditEvents.set(id, event);
    return event;
  }
}

export const storage = new MemStorage();
