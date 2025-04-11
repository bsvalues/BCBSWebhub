import { db } from "../db";
import { properties, Property } from "@shared/washington-schema";
import { avg, count, eq, sql, sum } from "drizzle-orm";

// Options for anomaly detection analysis
export interface AnomalyDetectionOptions {
  taxingDistrict?: string;
  propertyType?: string;
  assessmentYear?: number;
  zScoreThreshold?: number;
  percentageThreshold?: number;
  analysisMetric?: 'total_value' | 'land_value' | 'improvement_value' | 'value_per_acre' | 'value_per_sqft';
}

// Result from anomaly detection
export interface AnomalyResult {
  propertyId: number;
  parcelNumber: string;
  propertyType: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  deviationPercentage: number;
  zScore: number;
  isAnomaly: boolean;
  confidence: 'low' | 'medium' | 'high';
  factors?: string[];
}

// Area statistics for baseline comparison
interface AreaStatistics {
  propertyCount: number;
  avgTotalValue: number;
  avgLandValue: number;
  avgImprovementValue: number;
  avgValuePerAcre: number;
  avgValuePerSqFt: number;
  stdDevTotalValue: number;
  stdDevValuePerAcre: number;
  stdDevValuePerSqFt: number;
}

/**
 * Service for detecting anomalies in property valuations
 * Uses statistical methods aligned with Washington State assessment guidelines
 */
export class AnomalyDetectionService {
  
  /**
   * Detect statistical anomalies in property valuations
   */
  public async detectValueAnomalies(options: AnomalyDetectionOptions): Promise<AnomalyResult[]> {
    const { 
      taxingDistrict, 
      propertyType,
      assessmentYear = new Date().getFullYear(),
      zScoreThreshold = 2.0, // Flag properties > 2 standard deviations from mean
      percentageThreshold = 25, // Flag properties > 25% from expected value
      analysisMetric = 'total_value'
    } = options;
    
    // Calculate baseline statistics for the area
    const areaStats = await this.calculateAreaStatistics(taxingDistrict, propertyType, assessmentYear);
    
    if (areaStats.propertyCount < 5) {
      // Not enough properties in this area for meaningful statistical analysis
      return [];
    }
    
    // Prepare query conditions
    const conditions = [];
    if (taxingDistrict) {
      conditions.push(eq(properties.taxingDistrict, taxingDistrict));
    }
    if (propertyType) {
      conditions.push(eq(properties.propertyType, propertyType as any));
    }
    conditions.push(eq(properties.assessmentYear, assessmentYear));
    
    // Get all properties in the area
    const propertyList = await db
      .select()
      .from(properties)
      .where(sql`${conditions.join(' AND ')}`);
    
    // Calculate z-scores and identify anomalies
    const anomalies = propertyList
      .map(property => {
        // Calculate appropriate metrics based on analysis type
        let actualValue: number;
        let expectedValue: number;
        let stdDev: number;
        
        switch (analysisMetric) {
          case 'value_per_acre':
            actualValue = property.acres && property.acres > 0 
              ? Number(property.totalValue) / Number(property.acres)
              : Number(property.totalValue);
            expectedValue = areaStats.avgValuePerAcre;
            stdDev = areaStats.stdDevValuePerAcre;
            break;
            
          case 'value_per_sqft':
            actualValue = property.buildingSqFt && property.buildingSqFt > 0
              ? Number(property.totalValue) / Number(property.buildingSqFt)
              : Number(property.totalValue);
            expectedValue = areaStats.avgValuePerSqFt;
            stdDev = areaStats.stdDevValuePerSqFt;
            break;
            
          case 'land_value':
            actualValue = Number(property.landValue);
            expectedValue = areaStats.avgLandValue;
            // We don't currently track std dev for this, use total value std dev as approximation
            stdDev = areaStats.stdDevTotalValue * (areaStats.avgLandValue / areaStats.avgTotalValue);
            break;
            
          case 'improvement_value':
            actualValue = Number(property.improvementValue);
            expectedValue = areaStats.avgImprovementValue;
            // We don't currently track std dev for this, use total value std dev as approximation
            stdDev = areaStats.stdDevTotalValue * (areaStats.avgImprovementValue / areaStats.avgTotalValue);
            break;
            
          case 'total_value':
          default:
            actualValue = Number(property.totalValue);
            expectedValue = areaStats.avgTotalValue;
            stdDev = areaStats.stdDevTotalValue;
            break;
        }
        
        // Calculate z-score (standard deviations from mean)
        const zScore = stdDev > 0 ? Math.abs((actualValue - expectedValue) / stdDev) : 0;
        
        // Calculate absolute and percentage deviation
        const deviation = actualValue - expectedValue;
        const deviationPercentage = expectedValue > 0 ? (deviation / expectedValue) * 100 : 0;
        
        // Determine if this is an anomaly based on thresholds
        const isZScoreAnomaly = zScore > zScoreThreshold;
        const isPercentageAnomaly = Math.abs(deviationPercentage) > percentageThreshold;
        const isAnomaly = isZScoreAnomaly || isPercentageAnomaly;
        
        // Determine confidence level
        let confidence: 'low' | 'medium' | 'high' = 'medium';
        if (isZScoreAnomaly && isPercentageAnomaly) {
          confidence = 'high';
        } else if (zScore > zScoreThreshold * 1.5 || Math.abs(deviationPercentage) > percentageThreshold * 1.5) {
          confidence = 'high';
        } else if (zScore < zScoreThreshold * 0.8 && Math.abs(deviationPercentage) < percentageThreshold * 0.8) {
          confidence = 'low';
        }
        
        // Identify potential factors for the anomaly
        const factors = this.identifyAnomalyFactors(property, areaStats);
        
        return {
          propertyId: property.id,
          parcelNumber: property.parcelNumber,
          propertyType: property.propertyType,
          actualValue,
          expectedValue,
          deviation,
          deviationPercentage,
          zScore,
          isAnomaly,
          confidence,
          factors: isAnomaly ? factors : undefined
        };
      })
      .filter(result => result.isAnomaly);
    
    // Sort anomalies by confidence level and z-score
    return anomalies.sort((a, b) => {
      // First sort by confidence level
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      
      if (confidenceDiff !== 0) {
        return confidenceDiff;
      }
      
      // Then sort by z-score
      return b.zScore - a.zScore;
    });
  }
  
  /**
   * Calculate baseline statistics for an area
   */
  private async calculateAreaStatistics(
    taxingDistrict?: string, 
    propertyType?: string,
    assessmentYear?: number
  ): Promise<AreaStatistics> {
    // Prepare query conditions
    const conditions = [];
    if (taxingDistrict) {
      conditions.push(eq(properties.taxingDistrict, taxingDistrict));
    }
    if (propertyType) {
      conditions.push(eq(properties.propertyType, propertyType as any));
    }
    if (assessmentYear) {
      conditions.push(eq(properties.assessmentYear, assessmentYear));
    }
    
    // Basic statistics
    const basicStats = await db
      .select({
        propertyCount: count(),
        avgTotalValue: avg(properties.totalValue),
        avgLandValue: avg(properties.landValue),
        avgImprovementValue: avg(properties.improvementValue),
        avgValuePerAcre: avg(sql`CASE WHEN ${properties.acres} > 0 THEN ${properties.totalValue} / ${properties.acres} ELSE NULL END`),
        avgValuePerSqFt: avg(sql`CASE WHEN ${properties.buildingSqFt} > 0 THEN ${properties.totalValue} / ${properties.buildingSqFt} ELSE NULL END`)
      })
      .from(properties)
      .where(sql`${conditions.join(' AND ')}`);
    
    // Standard deviation calculations require a second query
    // This is a simplified approach for standard deviation calculation
    // In a real-world app, we would use database-specific functions for this
    
    // Get standard deviation for total value
    const totalValueVariance = await db
      .select({
        variance: sql`AVG(POWER(${properties.totalValue} - ${basicStats[0].avgTotalValue}, 2))`
      })
      .from(properties)
      .where(sql`${conditions.join(' AND ')}`);
    
    // Get standard deviation for value per acre
    const valuePerAcreVariance = await db
      .select({
        variance: sql`AVG(POWER(
          CASE WHEN ${properties.acres} > 0
          THEN ${properties.totalValue} / ${properties.acres}
          ELSE ${basicStats[0].avgValuePerAcre}
          END - ${basicStats[0].avgValuePerAcre}, 2))`
      })
      .from(properties)
      .where(sql`${conditions.join(' AND ')}`);
    
    // Get standard deviation for value per square foot
    const valuePerSqFtVariance = await db
      .select({
        variance: sql`AVG(POWER(
          CASE WHEN ${properties.buildingSqFt} > 0
          THEN ${properties.totalValue} / ${properties.buildingSqFt}
          ELSE ${basicStats[0].avgValuePerSqFt}
          END - ${basicStats[0].avgValuePerSqFt}, 2))`
      })
      .from(properties)
      .where(sql`${conditions.join(' AND ')}`);
    
    // Calculate standard deviations from variances
    const stdDevTotalValue = Math.sqrt(Number(totalValueVariance[0]?.variance || 0));
    const stdDevValuePerAcre = Math.sqrt(Number(valuePerAcreVariance[0]?.variance || 0));
    const stdDevValuePerSqFt = Math.sqrt(Number(valuePerSqFtVariance[0]?.variance || 0));
    
    return {
      propertyCount: basicStats[0]?.propertyCount || 0,
      avgTotalValue: Number(basicStats[0]?.avgTotalValue || 0),
      avgLandValue: Number(basicStats[0]?.avgLandValue || 0),
      avgImprovementValue: Number(basicStats[0]?.avgImprovementValue || 0),
      avgValuePerAcre: Number(basicStats[0]?.avgValuePerAcre || 0),
      avgValuePerSqFt: Number(basicStats[0]?.avgValuePerSqFt || 0),
      stdDevTotalValue,
      stdDevValuePerAcre,
      stdDevValuePerSqFt
    };
  }
  
  /**
   * Identify potential factors contributing to an anomalous property valuation
   */
  private identifyAnomalyFactors(property: Property, areaStats: AreaStatistics): string[] {
    const factors: string[] = [];
    
    // Check land value ratio
    const landValueRatio = Number(property.landValue) / Number(property.totalValue);
    const avgLandValueRatio = areaStats.avgLandValue / areaStats.avgTotalValue;
    
    if (Math.abs(landValueRatio - avgLandValueRatio) > 0.2) {
      if (landValueRatio > avgLandValueRatio) {
        factors.push('Land value is unusually high compared to total value');
      } else {
        factors.push('Land value is unusually low compared to total value');
      }
    }
    
    // Check improvement value
    const improvementValueRatio = Number(property.improvementValue) / Number(property.totalValue);
    const avgImprovementValueRatio = areaStats.avgImprovementValue / areaStats.avgTotalValue;
    
    if (Math.abs(improvementValueRatio - avgImprovementValueRatio) > 0.2) {
      if (improvementValueRatio > avgImprovementValueRatio) {
        factors.push('Improvement value is unusually high compared to total value');
      } else {
        factors.push('Improvement value is unusually low compared to total value');
      }
    }
    
    // Check value per acre (if applicable)
    if (property.acres && property.acres > 0) {
      const valuePerAcre = Number(property.totalValue) / Number(property.acres);
      const avgValuePerAcre = areaStats.avgValuePerAcre;
      
      if (avgValuePerAcre > 0 && Math.abs((valuePerAcre - avgValuePerAcre) / avgValuePerAcre) > 0.3) {
        if (valuePerAcre > avgValuePerAcre) {
          factors.push('Value per acre is significantly higher than area average');
        } else {
          factors.push('Value per acre is significantly lower than area average');
        }
      }
    }
    
    // Check age of property
    if (property.yearBuilt) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - property.yearBuilt;
      
      if (age < 5) {
        factors.push('Property is new construction (less than 5 years old)');
      } else if (age > 50) {
        factors.push('Property is significantly older than typical for the area');
      }
    }
    
    // Check if exemptions are present
    if (property.exemptionAmount && Number(property.exemptionAmount) > 0) {
      factors.push('Property has tax exemptions that may affect valuation');
    }
    
    // If no specific factors identified, add a general note
    if (factors.length === 0) {
      factors.push('Multiple small factors may be contributing to the unusual valuation');
    }
    
    return factors;
  }
  
  /**
   * Analyze time-series trends for a specific property
   */
  public async analyzePropertyValueTrend(propertyId: number, yearRange: number = 5): Promise<{
    property: Property;
    valuationHistory: Array<{ year: number; totalValue: number; }>;
    annualChangePercent: Array<{ year: number; changePercent: number; }>;
    averageAnnualIncrease: number;
    isPotentialAnomaly: boolean;
    anomalyReason?: string;
  }> {
    // Get the property details
    const propertyResults = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));
    
    if (propertyResults.length === 0) {
      throw new Error(`Property not found with ID: ${propertyId}`);
    }
    
    const property = propertyResults[0];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - yearRange;
    
    // Get historical valuation data for this property
    // Normally we would get this from a valuation_history table
    // For this example, we'll simulate by generating data
    // In a real implementation, you would query the actual historical data
    
    // Simulated historical data based on current value
    // This would typically come from a property_valuation_history table
    const simulatedHistory = [];
    const baseValue = Number(property.totalValue);
    let previousValue = baseValue;
    
    for (let year = currentYear; year >= startYear; year--) {
      // Simulated 3-5% annual increase with some random variation
      const randomFactor = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1
      const annualChange = year === currentYear ? 0 : -(0.03 + (Math.random() * 0.02)) * randomFactor;
      
      const yearValue = year === currentYear 
        ? baseValue 
        : previousValue / (1 + annualChange);
      
      simulatedHistory.push({
        year,
        totalValue: yearValue
      });
      
      previousValue = yearValue;
    }
    
    // Sort by year ascending
    simulatedHistory.sort((a, b) => a.year - b.year);
    
    // Calculate annual percentage changes
    const annualChangePercent = [];
    for (let i = 1; i < simulatedHistory.length; i++) {
      const prevValue = simulatedHistory[i-1].totalValue;
      const currValue = simulatedHistory[i].totalValue;
      const changePercent = ((currValue - prevValue) / prevValue) * 100;
      
      annualChangePercent.push({
        year: simulatedHistory[i].year,
        changePercent
      });
    }
    
    // Calculate average annual increase
    const totalPercentChange = annualChangePercent.reduce((sum, item) => sum + item.changePercent, 0);
    const averageAnnualIncrease = annualChangePercent.length > 0 
      ? totalPercentChange / annualChangePercent.length 
      : 0;
    
    // Detect anomalies in the trend
    let isPotentialAnomaly = false;
    let anomalyReason = undefined;
    
    // Check for unusual recent increase/decrease
    const recentChange = annualChangePercent.length > 0 ? 
      annualChangePercent[annualChangePercent.length - 1].changePercent : 0;
    
    if (Math.abs(recentChange) > 15) {
      isPotentialAnomaly = true;
      anomalyReason = recentChange > 0 
        ? `Unusually large value increase of ${recentChange.toFixed(1)}% in the last year` 
        : `Unusually large value decrease of ${Math.abs(recentChange).toFixed(1)}% in the last year`;
    }
    
    // Check for unusual variation between years
    for (let i = 1; i < annualChangePercent.length; i++) {
      const prevChange = annualChangePercent[i-1].changePercent;
      const currChange = annualChangePercent[i].changePercent;
      const changeDiff = Math.abs(currChange - prevChange);
      
      if (changeDiff > 10) {
        isPotentialAnomaly = true;
        anomalyReason = `Unusual variation in annual value changes between ${annualChangePercent[i-1].year} and ${annualChangePercent[i].year}`;
        break;
      }
    }
    
    return {
      property,
      valuationHistory: simulatedHistory,
      annualChangePercent,
      averageAnnualIncrease,
      isPotentialAnomaly,
      anomalyReason
    };
  }
}