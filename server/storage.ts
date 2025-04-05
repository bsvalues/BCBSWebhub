import { users, audits, auditEvents, type User, type InsertUser, type Audit, type InsertAudit, type AuditEvent, type InsertAuditEvent } from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from "./database-storage";

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
  
  // Database seeding (optional)
  seed?: () => Promise<void>;
}

export const storage = new DatabaseStorage();
