/**
 * Washington State-specific property schema
 * 
 * This file defines the data structures for property assessment
 * according to Washington State requirements and guidelines.
 */

import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Property types according to Washington State classification
 */
export const PropertyTypes = {
  RESIDENTIAL: 'RESIDENTIAL',
  COMMERCIAL: 'COMMERCIAL',
  INDUSTRIAL: 'INDUSTRIAL',
  AGRICULTURAL: 'AGRICULTURAL',
  VACANT: 'VACANT',
  MULTI_FAMILY: 'MULTI_FAMILY',
  RECREATIONAL: 'RECREATIONAL',
  FORESTRY: 'FORESTRY',
  OTHER: 'OTHER'
} as const;

/**
 * Land use codes based on Washington State standards
 */
export const LandUseCodes = {
  // Residential
  R100: '100', // Single Family Residence
  R101: '101', // Single Family Residence with Basement
  R102: '102', // Mobile Home
  R103: '103', // Manufactured Home
  R105: '105', // Condominium
  R109: '109', // Multi-Family (2-4 Units)
  R111: '111', // Multi-Family (5+ Units)
  
  // Commercial
  C200: '200', // General Commercial
  C210: '210', // Office Building
  C220: '220', // Retail
  C230: '230', // Restaurant
  C240: '240', // Hotel/Motel
  
  // Industrial
  I300: '300', // General Industrial
  I310: '310', // Manufacturing
  I320: '320', // Warehouse
  
  // Agricultural
  A400: '400', // General Agricultural
  A410: '410', // Cropland
  A420: '420', // Pasture
  A430: '430', // Orchard
  
  // Other
  O500: '500', // Vacant Land
  O600: '600', // Recreational
  O700: '700', // Forestry
} as const;

// Create enum object for land use codes to use in validators
export const waLandUseCodeEnum = {
  enumValues: [
    '100', '101', '102', '103', '105', '109', '111',
    '200', '210', '220', '230', '240',
    '300', '310', '320',
    '400', '410', '420', '430',
    '500', '600', '700'
  ]
};

/**
 * Parcel number format validator based on Washington State standard format XX-XXXX-XXX-XXXX
 */
export const parcelNumberValidator = (value: string): boolean => {
  return /^\d{2}-\d{4}-\d{3}-\d{4}$/.test(value);
};

/**
 * Property database schema definition
 */
export const properties = sqliteTable('properties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parcelNumber: text('parcel_number').notNull().unique(),
  propertyType: text('property_type').notNull(),
  landUseCode: text('land_use_code').notNull(),
  
  // Location data
  address: text('address'),
  city: text('city'),
  county: text('county').default('Benton'),
  state: text('state').default('WA'),
  zipCode: text('zip_code'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  
  // Zoning and land data
  zoneCode: text('zone_code'),
  lotSizeSqFt: real('lot_size_sq_ft'),
  floodZone: text('flood_zone'),
  
  // Building characteristics
  buildingType: text('building_type'),
  yearBuilt: integer('year_built'),
  totalSqFt: real('total_sq_ft'),
  bedrooms: integer('bedrooms'),
  bathrooms: real('bathrooms'),
  stories: integer('stories'),
  heatingCooling: text('heating_cooling'),
  foundation: text('foundation'),
  roofType: text('roof_type'),
  condition: text('condition'),
  
  // Valuation data
  assessmentYear: integer('assessment_year').notNull(),
  landValue: real('land_value').notNull(),
  improvementValue: real('improvement_value').notNull(),
  totalValue: real('total_value').notNull(),
  priorYearValue: real('prior_year_value'),
  
  // Tax information
  taxCode: text('tax_code'),
  millRate: real('mill_rate'),
  taxAmount: real('tax_amount'),
  
  // Administrative data
  lastUpdated: text('last_updated'),
  lastInspection: text('last_inspection'),
  inspectionDue: text('inspection_due'),
  
  // Notes and additional information
  notes: text('notes'),
  exemptions: text('exemptions'),
});

/**
 * Property valuation history schema
 */
export const propertyValuationHistory = sqliteTable('property_valuation_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull(),
  assessmentYear: integer('assessment_year').notNull(),
  assessmentDate: text('assessment_date').notNull(),
  landValue: real('land_value').notNull(),
  improvementValue: real('improvement_value').notNull(),
  totalValue: real('total_value').notNull(),
  reasonForChange: text('reason_for_change'),
  assessorId: integer('assessor_id'),
});

/**
 * Property inspection schema
 */
export const propertyInspections = sqliteTable('property_inspections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull(),
  inspectionDate: text('inspection_date').notNull(),
  inspectorId: integer('inspector_id').notNull(),
  inspectionType: text('inspection_type').notNull(),
  findings: text('findings'),
  photos: text('photos'),
  followUpRequired: integer('follow_up_required', { mode: 'boolean' }).default(false),
  completionStatus: text('completion_status').default('PENDING'),
});

/**
 * Property tax exemption schema
 */
export const propertyExemptions = sqliteTable('property_exemptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull(),
  exemptionType: text('exemption_type').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  exemptionAmount: real('exemption_amount'),
  exemptionPercentage: real('exemption_percentage'),
  approvedBy: integer('approved_by'),
  documentationPath: text('documentation_path'),
});

// Create insert schemas with validation
export const insertPropertySchema = createInsertSchema(properties)
  .extend({
    parcelNumber: z.string().refine(parcelNumberValidator, {
      message: 'Parcel number must be in format XX-XXXX-XXX-XXXX'
    }),
    totalValue: z.number().refine(
      (val: number, ctx: any) => {
        // Validate that total value equals land + improvement value
        const landValue = (ctx.data?.landValue as number) || 0;
        const improvementValue = (ctx.data?.improvementValue as number) || 0;
        return Math.abs(val - (landValue + improvementValue)) < 0.01;
      },
      {
        message: 'Total value must equal land value plus improvement value'
      }
    )
  })
  .omit({ id: true });

export const insertValuationHistorySchema = createInsertSchema(propertyValuationHistory)
  .omit({ id: true });

export const insertInspectionSchema = createInsertSchema(propertyInspections)
  .omit({ id: true });

export const insertExemptionSchema = createInsertSchema(propertyExemptions)
  .omit({ id: true });

// Type definitions for use in application code
export type Property = typeof properties.$inferSelect;
export type NewProperty = z.infer<typeof insertPropertySchema>;

export type PropertyValuationHistory = typeof propertyValuationHistory.$inferSelect;
export type NewPropertyValuationHistory = z.infer<typeof insertValuationHistorySchema>;

export type PropertyInspection = typeof propertyInspections.$inferSelect;
export type NewPropertyInspection = z.infer<typeof insertInspectionSchema>;

export type PropertyExemption = typeof propertyExemptions.$inferSelect;
export type NewPropertyExemption = z.infer<typeof insertExemptionSchema>;

/**
 * Data quality snapshot interface and schema for metrics tracking
 */
export interface DataQualitySnapshot {
  id?: number;
  snapshotDate: Date;
  completenessScore: string;
  accuracyScore: string;
  consistencyScore: string;
  timelinessScore: string;
  overallScore: string;
  issueCounts: Record<string, number>;
  metrics: Record<string, any>;
  createdBy: number | null;
}

/**
 * Data quality snapshots table for tracking data quality metrics over time
 */
export const dataQualitySnapshots = sqliteTable('data_quality_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotDate: text('snapshot_date').notNull(),
  completenessScore: text('completeness_score').notNull(),
  accuracyScore: text('accuracy_score').notNull(),
  consistencyScore: text('consistency_score').notNull(),
  timelinessScore: text('timeliness_score').notNull(),
  overallScore: text('overall_score').notNull(),
  issueCounts: text('issue_counts').notNull(), // JSON string
  metrics: text('metrics').notNull(), // JSON string
  createdBy: integer('created_by'),
  createdAt: text('created_at').notNull()
});

// Create insert schema for data quality snapshots
export const insertDataQualitySnapshotSchema = createInsertSchema(dataQualitySnapshots)
  .omit({ id: true });

export type InsertDataQualitySnapshot = z.infer<typeof insertDataQualitySnapshotSchema>;