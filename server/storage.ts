import { users, audits, auditEvents, documents, type User, type InsertUser, type Audit, type InsertAudit, type AuditEvent, type InsertAuditEvent, type Document, type InsertDocument } from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from "./database-storage";

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
  
  // Session store
  sessionStore: any; // This avoids the type error with session.SessionStore
  
  // Database seeding (optional)
  seed?: () => Promise<void>;
}

export const storage = new DatabaseStorage();
