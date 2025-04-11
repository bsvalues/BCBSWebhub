import { z } from "zod";
import { Property, waLandUseCodeEnum } from "@shared/washington-schema";

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

// Get the current year for validation
const CURRENT_YEAR = new Date().getFullYear();

// Extract landUseCode values from the enum
const landUseCodes = Object.values(waLandUseCodeEnum.enumValues);

// Comprehensive property validation schema for Washington State
export const waPropertyValidationSchema = z.object({
  // Core identifiers
  parcelNumber: waParcelNumberSchema,
  
  // Classification
  propertyType: z.enum(["residential", "commercial", "industrial", "agricultural", "timber", "open_space", "other"]),
  landUseCode: z.enum(landUseCodes as [string, ...string[]]).optional(),
  
  // Basic information
  siteAddress: z.string().optional(),
  city: z.string().optional(),
  county: z.string().default("Benton"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format").optional(),
  
  // Required assessment data
  assessmentYear: z.number()
    .int("Assessment year must be an integer")
    .min(2000, "Assessment year must be 2000 or later")
    .max(CURRENT_YEAR + 1, "Assessment year cannot be more than one year in the future"),
    
  landValue: z.number()
    .min(0, "Land value cannot be negative"),
    
  improvementValue: z.number()
    .min(0, "Improvement value cannot be negative"),
    
  totalValue: z.number()
    .min(0, "Total value cannot be negative"),
    
  // Physical characteristics - optional but with validation when present
  acres: z.number().min(0).optional(),
  landSqFt: z.number().min(0).optional(),
  buildingSqFt: z.number().min(0).optional(),
  yearBuilt: z.number().int().min(1800).max(CURRENT_YEAR).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  stories: z.number().int().min(1).optional(),
  
  // Exemption fields
  exemptionAmount: z.number().min(0).optional(),
  exemptionType: z.string().optional(),
  taxableValue: z.number().min(0).optional(),
  
}).refine(data => {
  // Ensure total value equals land value + improvement value
  // Allow for small rounding differences (less than 1 dollar)
  return Math.abs(data.totalValue - (data.landValue + data.improvementValue)) < 1;
}, {
  message: "Total value must equal the sum of land value and improvement value",
  path: ["totalValue"]
}).refine(data => {
  // If exempt, taxable value should be total value minus exemption
  if (data.exemptionAmount && data.exemptionAmount > 0 && data.taxableValue !== undefined) {
    return Math.abs((data.totalValue - data.exemptionAmount) - data.taxableValue) < 1;
  }
  return true;
}, {
  message: "Taxable value must equal total value minus exemption amount",
  path: ["taxableValue"]
}).refine(data => {
  // Property type and land use code should be compatible
  if (data.landUseCode && data.propertyType) {
    // Check if land use code matches property type prefix
    const prefix = data.landUseCode.charAt(0);
    const propertyTypeMap: Record<string, string[]> = {
      'R': ['residential'],
      'C': ['commercial'],
      'I': ['industrial'],
      'A': ['agricultural'],
      'T': ['timber'],
      'O': ['open_space']
    };
    
    return !propertyTypeMap[prefix] || propertyTypeMap[prefix].includes(data.propertyType);
  }
  return true;
}, {
  message: "Land use code must be compatible with property type",
  path: ["landUseCode"]
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
    if (property.exemptionAmount && Number(property.exemptionAmount) > 0 && !property.exemptionType) {
      return {
        field: 'exemptionType',
        isValid: false,
        rule: 'WA_EXEMPTION_DATA',
        message: 'Exemption type is required when exemption amount is provided',
        severity: 'warning'
      };
    }
    
    // If exemption type is provided, amount should be > 0
    if (property.exemptionType && (!property.exemptionAmount || Number(property.exemptionAmount) <= 0)) {
      return {
        field: 'exemptionAmount',
        isValid: false,
        rule: 'WA_EXEMPTION_DATA',
        message: 'Exemption amount should be greater than 0 when exemption type is provided',
        severity: 'warning'
      };
    }
    
    // If exemption provided, check that taxableValue = totalValue - exemptionAmount
    if (property.exemptionAmount && Number(property.exemptionAmount) > 0 && 
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
   * Validates land use code compatibility with property type
   */
  private validateLandUseCodeCompatibility(property: Partial<Property>): ValidationResult {
    if (!property.landUseCode || !property.propertyType) {
      return {
        field: 'landUseCode',
        isValid: true,
        rule: 'WA_LAND_USE_COMPATIBILITY',
        message: 'Unable to validate land use code compatibility due to missing data',
        severity: 'info'
      };
    }

    const prefix = property.landUseCode.charAt(0);
    const propertyTypeMap: Record<string, string[]> = {
      'R': ['residential'],
      'C': ['commercial'],
      'I': ['industrial'],
      'A': ['agricultural'],
      'T': ['timber'],
      'O': ['open_space']
    };
    
    const isValid = !propertyTypeMap[prefix] || propertyTypeMap[prefix].includes(property.propertyType);
    
    return {
      field: 'landUseCode',
      isValid,
      rule: 'WA_LAND_USE_COMPATIBILITY',
      message: isValid ? 'Land use code is compatible with property type' :
        `Land use code ${property.landUseCode} is not compatible with property type ${property.propertyType}`,
      severity: isValid ? 'info' : 'error'
    };
  }
  
  /**
   * Validates physical characteristics for consistency
   */
  private validatePhysicalCharacteristics(property: Partial<Property>): ValidationResult {
    const issues: string[] = [];
    
    // Check if acres and land sq ft are consistent if both are provided
    if (property.acres && property.landSqFt) {
      const acresFromSqFt = Number(property.landSqFt) / 43560; // 1 acre = 43,560 sq ft
      const difference = Math.abs(Number(property.acres) - acresFromSqFt);
      
      // Allow for 5% difference due to rounding, survey differences, etc.
      if (difference > (Number(property.acres) * 0.05)) {
        issues.push(`Acres (${property.acres}) and land square feet (${property.landSqFt}) values are inconsistent`);
      }
    }
    
    // Year built validation
    if (property.yearBuilt) {
      const currentYear = new Date().getFullYear();
      if (property.yearBuilt < 1800 || property.yearBuilt > currentYear) {
        issues.push(`Year built (${property.yearBuilt}) must be between 1800 and ${currentYear}`);
      }
    }
    
    // Check for suspicious residential values
    if (property.propertyType === 'residential') {
      if (property.bedrooms && Number(property.bedrooms) > 20) {
        issues.push(`Suspicious number of bedrooms (${property.bedrooms}) for a residential property`);
      }
      
      if (property.bathrooms && Number(property.bathrooms) > 20) {
        issues.push(`Suspicious number of bathrooms (${property.bathrooms}) for a residential property`);
      }
      
      if (property.buildingSqFt && Number(property.buildingSqFt) > 25000) {
        issues.push(`Suspicious building size (${property.buildingSqFt} sq ft) for a residential property`);
      }
    }
    
    return {
      field: 'physicalCharacteristics',
      isValid: issues.length === 0,
      rule: 'WA_PHYSICAL_CHARACTERISTICS',
      message: issues.length === 0 ? 'Physical characteristics are consistent' : issues.join('; '),
      severity: issues.length === 0 ? 'info' : 'warning'
    };
  }
  
  /**
   * Validates ZIP code format if provided
   */
  private validateZipCode(property: Partial<Property>): ValidationResult {
    if (!property.zipCode) {
      return {
        field: 'zipCode',
        isValid: true,
        rule: 'WA_ZIP_CODE_FORMAT',
        message: 'ZIP code not provided',
        severity: 'info'
      };
    }
    
    // Check ZIP code format (either 5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    const isValid = zipRegex.test(property.zipCode);
    
    return {
      field: 'zipCode',
      isValid,
      rule: 'WA_ZIP_CODE_FORMAT',
      message: isValid ? 'Valid ZIP code format' : 'Invalid ZIP code format. Must be 5 digits or 5+4 format (e.g., 99320 or 99320-1234)',
      severity: isValid ? 'info' : 'warning'
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
      this.validateExemptions(property),
      this.validateLandUseCodeCompatibility(property),
      this.validatePhysicalCharacteristics(property),
      this.validateZipCode(property)
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
    
    // Create unique field arrays without using Set spreading
    const errorFieldsSet = new Set<string>();
    const warningFieldsSet = new Set<string>();
    
    errors.forEach(e => errorFieldsSet.add(e.field));
    warnings.forEach(w => warningFieldsSet.add(w.field));
    
    return {
      isValid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errorFields: Array.from(errorFieldsSet),
      warningFields: Array.from(warningFieldsSet)
    };
  }
}