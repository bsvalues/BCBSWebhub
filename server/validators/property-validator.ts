import { z } from "zod";
import { Property } from "@shared/washington-schema";

// Interface for validation result
export interface ValidationResult {
  field: string;
  isValid: boolean;
  rule: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
  details?: any;
}

// Washington State parcel number format validation
// Format: XX-XXXX-XXX-XXXX (Benton County format)
export const waParcelNumberSchema = z.string()
  .regex(/^\d{2}-\d{4}-\d{3}-\d{4}$/, 
    "Invalid Washington State parcel number format. Must be XX-XXXX-XXX-XXXX format");

// Comprehensive property validation schema for Washington State
export const waPropertyValidationSchema = z.object({
  // Core identifiers
  parcelNumber: waParcelNumberSchema,
  
  // Classification
  propertyType: z.enum(["residential", "commercial", "industrial", "agricultural", "timber", "open_space", "other"]),
  
  // Required assessment data
  assessmentYear: z.number()
    .int("Assessment year must be an integer")
    .min(2000, "Assessment year must be 2000 or later")
    .max(new Date().getFullYear() + 1, "Assessment year cannot be more than one year in the future"),
    
  landValue: z.number()
    .min(0, "Land value cannot be negative"),
    
  improvementValue: z.number()
    .min(0, "Improvement value cannot be negative"),
    
  totalValue: z.number()
    .min(0, "Total value cannot be negative"),
}).refine(data => {
  // Ensure total value equals land value + improvement value
  // Allow for small rounding differences (less than 1 dollar)
  return Math.abs(data.totalValue - (data.landValue + data.improvementValue)) < 1;
}, {
  message: "Total value must equal the sum of land value and improvement value",
  path: ["totalValue"]
});

export class PropertyDataValidator {
  public readonly rulesVersion = '2025.1.0'; // Washington State 2025 rules
  
  /**
   * Validates a Washington State property parcel number
   */
  private validateParcelNumber(parcelNumber: string): ValidationResult {
    const regex = /^\d{2}-\d{4}-\d{3}-\d{4}$/;
    const isValid = regex.test(parcelNumber);
    
    return {
      field: 'parcelNumber',
      isValid,
      rule: 'WA_PARCEL_FORMAT',
      message: isValid ? 'Valid parcel number format' : 
        'Invalid parcel number format. Benton County requires XX-XXXX-XXX-XXXX format',
      severity: isValid ? 'info' : 'error'
    };
  }
  
  /**
   * Validates property value calculation according to Washington State rules
   */
  private validatePropertyValues(property: Partial<Property>): ValidationResult {
    if (property.landValue === undefined || 
        property.improvementValue === undefined || 
        property.totalValue === undefined) {
      return {
        field: 'totalValue',
        isValid: false,
        rule: 'WA_VALUE_CALCULATION',
        message: 'Missing required valuation fields',
        severity: 'error'
      };
    }
    
    const calculatedTotal = Number(property.landValue) + Number(property.improvementValue);
    const difference = Math.abs(Number(property.totalValue) - calculatedTotal);
    const isValid = difference < 1; // Allow for rounding differences less than $1
    
    return {
      field: 'totalValue',
      isValid,
      rule: 'WA_VALUE_CALCULATION',
      message: isValid ? 'Valid property value calculation' :
        `Total value (${property.totalValue}) must equal the sum of land value (${property.landValue}) and improvement value (${property.improvementValue})`,
      severity: isValid ? 'info' : 'error',
      details: {
        difference,
        calculatedTotal,
        providedTotal: property.totalValue
      }
    };
  }
  
  /**
   * Validates property assessment year is within acceptable range
   */
  private validateAssessmentYear(assessmentYear?: number): ValidationResult {
    const currentYear = new Date().getFullYear();
    
    if (assessmentYear === undefined) {
      return {
        field: 'assessmentYear',
        isValid: false,
        rule: 'WA_ASSESSMENT_YEAR',
        message: 'Assessment year is required',
        severity: 'error'
      };
    }
    
    const isValid = assessmentYear >= 2000 && assessmentYear <= currentYear + 1;
    
    return {
      field: 'assessmentYear',
      isValid,
      rule: 'WA_ASSESSMENT_YEAR',
      message: isValid ? 'Valid assessment year' :
        `Assessment year must be between 2000 and ${currentYear + 1}`,
      severity: isValid ? 'info' : 'error'
    };
  }
  
  /**
   * Validates exemption data is correctly structured
   */
  private validateExemptions(property: Partial<Property>): ValidationResult {
    // If exemption amount is provided, exemption type should also be provided
    if (property.exemptionAmount && property.exemptionAmount > 0 && !property.exemptionType) {
      return {
        field: 'exemptionType',
        isValid: false,
        rule: 'WA_EXEMPTION_DATA',
        message: 'Exemption type is required when exemption amount is provided',
        severity: 'warning'
      };
    }
    
    // If exemption type is provided, amount should be > 0
    if (property.exemptionType && (!property.exemptionAmount || property.exemptionAmount <= 0)) {
      return {
        field: 'exemptionAmount',
        isValid: false,
        rule: 'WA_EXEMPTION_DATA',
        message: 'Exemption amount should be greater than 0 when exemption type is provided',
        severity: 'warning'
      };
    }
    
    // If exemption provided, check that taxableValue = totalValue - exemptionAmount
    if (property.exemptionAmount && property.exemptionAmount > 0 && 
        property.totalValue !== undefined && property.taxableValue !== undefined) {
      
      const expectedTaxable = Number(property.totalValue) - Number(property.exemptionAmount);
      const difference = Math.abs(Number(property.taxableValue) - expectedTaxable);
      const isValid = difference < 1; // Allow for rounding differences
      
      if (!isValid) {
        return {
          field: 'taxableValue',
          isValid: false,
          rule: 'WA_EXEMPTION_CALCULATION',
          message: `Taxable value (${property.taxableValue}) should equal total value (${property.totalValue}) minus exemption amount (${property.exemptionAmount})`,
          severity: 'error',
          details: {
            difference,
            expectedTaxable,
            providedTaxable: property.taxableValue
          }
        };
      }
    }
    
    return {
      field: 'exemptions',
      isValid: true,
      rule: 'WA_EXEMPTION_DATA',
      message: 'Valid exemption data',
      severity: 'info'
    };
  }
  
  /**
   * Comprehensive property validation
   * Returns an array of validation results
   */
  public validateProperty(property: Partial<Property>): ValidationResult[] {
    const validations = [
      this.validateParcelNumber(property.parcelNumber || ''),
      this.validatePropertyValues(property),
      this.validateAssessmentYear(property.assessmentYear),
      this.validateExemptions(property)
    ];
    
    return validations;
  }
  
  /**
   * Validate property using Zod schema
   * Returns detailed validation errors
   */
  public validatePropertyWithZod(property: any): { 
    isValid: boolean; 
    errors?: z.ZodIssue[];
    data?: any;
  } {
    try {
      const validatedData = waPropertyValidationSchema.parse(property);
      return { 
        isValid: true, 
        data: validatedData 
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          isValid: false, 
          errors: error.errors 
        };
      }
      return { 
        isValid: false, 
        errors: [{ 
          code: 'custom', 
          path: ['unknown'], 
          message: String(error) 
        }] 
      };
    }
  }
  
  /**
   * Helper to create user-friendly validation summary
   */
  public getValidationSummary(results: ValidationResult[]): {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    errorFields: string[];
    warningFields: string[];
  } {
    const errors = results.filter(r => !r.isValid && r.severity === 'error');
    const warnings = results.filter(r => !r.isValid && r.severity === 'warning');
    
    return {
      isValid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errorFields: [...new Set(errors.map(e => e.field))],
      warningFields: [...new Set(warnings.map(w => w.field))]
    };
  }
}