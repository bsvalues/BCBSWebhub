import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("auditor"), // auditor, supervisor, admin
  createdAt: timestamp("created_at").defaultNow(),
});

// Create user schema
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
});

// Audit status enum
export const auditStatusEnum = pgEnum("audit_status", [
  "pending", 
  "in_progress",
  "approved", 
  "rejected", 
  "needs_info"
]);

// Priority enum
export const priorityEnum = pgEnum("priority", [
  "low",
  "normal",
  "high",
  "urgent"
]);

// Audit model
export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  auditNumber: text("audit_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  propertyId: text("property_id").notNull(),
  address: text("address").notNull(),
  currentAssessment: integer("current_assessment").notNull(),
  proposedAssessment: integer("proposed_assessment").notNull(),
  taxImpact: integer("tax_impact"),
  reason: text("reason"),
  status: auditStatusEnum("status").notNull().default("pending"),
  priority: priorityEnum("priority").notNull().default("normal"),
  submittedById: integer("submitted_by_id").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  assignedToId: integer("assigned_to_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create audit schema
export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  updatedAt: true,
});

// Audit event model for activity log
export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull(),
  userId: integer("user_id").notNull(),
  eventType: text("event_type").notNull(), // approved, rejected, commented, etc.
  comment: text("comment"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  changes: json("changes"), // Store before/after data as JSON
});

// Create audit event schema
export const insertAuditEventSchema = createInsertSchema(auditEvents).omit({
  id: true,
});

// Document model for storing audit documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileKey: text("file_key").notNull(), // For cloud storage reference
  uploadedById: integer("uploaded_by_id").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Create document schema
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
