import { pgTable, text, serial, integer, numeric, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// Washington State specific property types
export const propertyTypeEnum = pgEnum("property_type", [
  "residential", 
  "commercial", 
  "industrial", 
  "agricultural", 
  "timber", 
  "open_space", 
  "other"
]);

// Washington State land use codes (based on Washington's classification system)
export const waLandUseCodeEnum = pgEnum("wa_land_use_code", [
  // Residential codes
  "R1", // Single Family
  "R2", // Multi-Family
  "R3", // Mobile Home Parks
  "R4", // Condominiums
  
  // Commercial codes
  "C1", // Retail/Service
  "C2", // Office
  "C3", // Warehouse/Storage
  "C4", // Hotel/Motel
  
  // Industrial codes
  "I1", // Light Manufacturing
  "I2", // Heavy Manufacturing
  "I3", // Technology/R&D
  
  // Agricultural codes
  "A1", // Cropland
  "A2", // Grazing
  "A3", // Orchard
  "A4", // Vineyard
  
  // Timber codes
  "T1", // Hardwood
  "T2", // Softwood
  "T3", // Mixed
  
  // Open space codes
  "O1", // Park/Recreation
  "O2", // Conservation
  "O3", // Wetland
]);

// Washington property model with WA-specific fields
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  
  // Identifiers (WA format)
  parcelNumber: text("parcel_number").notNull().unique(), // WA format: XX-XXXX-XXX-XXXX
  taxAccountNumber: text("tax_account_number"),
  
  // Location data
  siteAddress: text("site_address"),
  city: text("city"),
  county: text("county").default("Benton"), // Default to Benton County
  zipCode: text("zip_code"),
  legalDescription: text("legal_description"),
  
  // Classification (Washington State specific)
  propertyType: propertyTypeEnum("property_type").notNull(),
  landUseCode: waLandUseCodeEnum("land_use_code"),
  taxingDistrict: text("taxing_district"),
  schoolDistrict: text("school_district"),
  
  // Physical characteristics
  acres: numeric("acres"),
  landSqFt: numeric("land_sq_ft"),
  buildingSqFt: numeric("building_sq_ft"),
  yearBuilt: integer("year_built"),
  bedrooms: integer("bedrooms"),
  bathrooms: numeric("bathrooms"),
  stories: integer("stories"),
  
  // Valuation data (required for WA assessments)
  assessmentYear: integer("assessment_year").notNull(),
  landValue: numeric("land_value").notNull(),
  improvementValue: numeric("improvement_value").notNull(),
  totalValue: numeric("total_value").notNull(), // Must equal landValue + improvementValue
  taxableValue: numeric("taxable_value"), // May differ from totalValue due to exemptions
  
  // Exemption information (WA specific)
  exemptionAmount: numeric("exemption_amount").default("0"),
  exemptionType: text("exemption_type"), // Senior/disability, etc.
  exemptionExpirationDate: timestamp("exemption_expiration_date"),
  
  // Geospatial data (for GIS integration)
  geoData: jsonb("geo_data"),
  
  // Metadata for tracking changes
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  lastUpdateDate: timestamp("last_update_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property valuation history (for time-series analysis)
export const propertyValuationHistory = pgTable("property_valuation_history", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  assessmentYear: integer("assessment_year").notNull(),
  assessmentDate: timestamp("assessment_date").notNull(),
  landValue: numeric("land_value").notNull(),
  improvementValue: numeric("improvement_value").notNull(),
  totalValue: numeric("total_value").notNull(),
  taxableValue: numeric("taxable_value"),
  changeReason: text("change_reason"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Unique constraint to prevent duplicate years for same property
  unique: {
    propertyYearIdx: [propertyId, assessmentYear]
  }
});

// Data quality metrics (collected over time)
export const dataQualitySnapshots = pgTable("data_quality_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: timestamp("snapshot_date").defaultNow().notNull(),
  completenessScore: numeric("completeness_score").notNull(), // 0-1 scale
  accuracyScore: numeric("accuracy_score").notNull(), // 0-1 scale
  consistencyScore: numeric("consistency_score").notNull(), // 0-1 scale
  timelinessScore: numeric("timeliness_score").notNull(), // 0-1 scale
  overallScore: numeric("overall_score").notNull(), // 0-1 scale
  metrics: jsonb("metrics").notNull(), // Detailed metrics
  issueCounts: jsonb("issue_counts"), // Count of issues by type
  createdBy: integer("created_by").references(() => users.id),
});

// Create insert and select types for TypeScript
export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

export type PropertyValuationHistory = typeof propertyValuationHistory.$inferSelect;
export type InsertPropertyValuationHistory = typeof propertyValuationHistory.$inferInsert;

export type DataQualitySnapshot = typeof dataQualitySnapshots.$inferSelect;
export type InsertDataQualitySnapshot = typeof dataQualitySnapshots.$inferInsert;

// Create insert schemas with validation
export const insertPropertySchema = createInsertSchema(properties)
  .omit({ 
    id: true, 
    lastUpdateDate: true, 
    createdAt: true 
  });

export const insertPropertyValuationHistorySchema = createInsertSchema(propertyValuationHistory)
  .omit({ 
    id: true, 
    updatedAt: true 
  });

export const insertDataQualitySnapshotSchema = createInsertSchema(dataQualitySnapshots)
  .omit({ 
    id: true, 
    snapshotDate: true 
  });