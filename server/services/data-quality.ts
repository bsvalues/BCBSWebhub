import { db } from "../db";
import { properties, dataQualitySnapshots, InsertDataQualitySnapshot } from "@shared/washington-schema";
import { avg, count, sql, eq } from "drizzle-orm";

/**
 * Interface for data quality metrics
 */
export interface DataQualityMetrics {
  // Completeness metrics (% of non-null values)
  completeness: Record<string, number>;
  
  // Accuracy metrics (% of values meeting validation rules)
  accuracy: Record<string, number>;
  
  // Consistency metrics (% of values with proper relationships)
  consistency: Record<string, number>;
  
  // Timeliness metrics (age of data)
  timeliness: {
    averageDataAge: number; // Average age in days
    oldRecords: number; // Number of records older than 1 year
    recentlyUpdated: number; // Number of records updated in last 30 days
  };
  
  // Component scores (0-1 scale)
  completenessScore: number;
  accuracyScore: number;
  consistencyScore: number;
  timelinessScore: number;
  
  // Overall score (0-1 scale, weighted average)
  overallScore: number;
  
  // Summary information
  totalRecords: number;
  recordsWithIssues: number;
  criticalIssueCount: number;
  
  // Trend data (compared to previous snapshot)
  trend?: {
    direction: 'improving' | 'declining' | 'stable';
    percentChange: number;
  };
}

/**
 * Service for analyzing and monitoring data quality
 */
export class DataQualityService {
  // Weights for calculating overall score
  private readonly metricWeights = {
    completeness: 0.35,
    accuracy: 0.35,
    consistency: 0.15,
    timeliness: 0.15
  };
  
  /**
   * Calculate data quality metrics for Washington property data
   */
  public async calculateDataQualityMetrics(): Promise<DataQualityMetrics> {
    // Get total record count
    const totalRecordsResult = await db.select({ 
      count: count() 
    }).from(properties);
    
    const totalRecords = totalRecordsResult[0]?.count || 0;
    
    if (totalRecords === 0) {
      return this.getEmptyMetrics();
    }
    
    // Check for null values in critical fields
    const nullCounts = await db.select({
      parcelNumberNulls: count(sql`CASE WHEN ${properties.parcelNumber} IS NULL THEN 1 END`),
      propertyTypeNulls: count(sql`CASE WHEN ${properties.propertyType} IS NULL THEN 1 END`),
      landValueNulls: count(sql`CASE WHEN ${properties.landValue} IS NULL THEN 1 END`),
      improvementValueNulls: count(sql`CASE WHEN ${properties.improvementValue} IS NULL THEN 1 END`),
      totalValueNulls: count(sql`CASE WHEN ${properties.totalValue} IS NULL THEN 1 END`),
      assessmentYearNulls: count(sql`CASE WHEN ${properties.assessmentYear} IS NULL THEN 1 END`),
    }).from(properties);
    
    // Check for inconsistent values (Washington rules)
    const valueInconsistencies = await db.select({
      count: count()
    }).from(properties)
    .where(sql`ABS(${properties.totalValue} - (${properties.landValue} + ${properties.improvementValue})) > 1`);
    
    // Check for invalid parcel numbers (Washington format)
    const invalidParcelNumbers = await db.select({
      count: count()
    }).from(properties)
    .where(sql`${properties.parcelNumber} !~ '^\d{2}-\d{4}-\d{3}-\d{4}$'`);
    
    // Check for exemption inconsistencies
    const exemptionInconsistencies = await db.select({
      count: count()
    }).from(properties)
    .where(
      sql`(${properties.exemptionAmount} > 0 AND ${properties.exemptionType} IS NULL) OR 
          (${properties.exemptionType} IS NOT NULL AND (${properties.exemptionAmount} IS NULL OR ${properties.exemptionAmount} <= 0)) OR
          (${properties.exemptionAmount} > 0 AND ${properties.taxableValue} IS NOT NULL AND 
           ABS(${properties.taxableValue} - (${properties.totalValue} - ${properties.exemptionAmount})) > 1)`
    );
    
    // Check data age
    const dataAge = await db.select({
      avgAge: avg(sql`EXTRACT(DAY FROM NOW() - ${properties.lastUpdateDate})`),
      oldRecords: count(sql`${properties.lastUpdateDate} < NOW() - INTERVAL '1 year'`),
      recentlyUpdated: count(sql`${properties.lastUpdateDate} > NOW() - INTERVAL '30 days'`)
    }).from(properties);
    
    // Calculate completeness metrics
    const completeness = {
      parcelNumber: 1 - (nullCounts[0].parcelNumberNulls / totalRecords),
      propertyType: 1 - (nullCounts[0].propertyTypeNulls / totalRecords),
      landValue: 1 - (nullCounts[0].landValueNulls / totalRecords),
      improvementValue: 1 - (nullCounts[0].improvementValueNulls / totalRecords),
      totalValue: 1 - (nullCounts[0].totalValueNulls / totalRecords),
      assessmentYear: 1 - (nullCounts[0].assessmentYearNulls / totalRecords),
    };
    
    // Calculate accuracy metrics
    const accuracy = {
      parcelNumberFormat: 1 - (invalidParcelNumbers[0].count / totalRecords),
      valueCalculation: 1 - (valueInconsistencies[0].count / totalRecords),
      exemptionData: 1 - (exemptionInconsistencies[0].count / totalRecords),
    };
    
    // Calculate consistency metrics
    const consistency = {
      valueConsistency: 1 - (valueInconsistencies[0].count / totalRecords),
      exemptionConsistency: 1 - (exemptionInconsistencies[0].count / totalRecords),
    };
    
    // Calculate component scores
    const completenessScore = this.calculateComponentScore(completeness);
    const accuracyScore = this.calculateComponentScore(accuracy);
    const consistencyScore = this.calculateComponentScore(consistency);
    
    // Calculate timeliness score based on data age
    const avgAge = Number(dataAge[0].avgAge || 0);
    const timelinessScore = avgAge < 30 ? 1.0 : 
                           avgAge < 90 ? 0.8 : 
                           avgAge < 180 ? 0.6 : 
                           avgAge < 365 ? 0.4 : 0.2;
    
    // Calculate overall score (weighted average)
    const overallScore = 
      completenessScore * this.metricWeights.completeness + 
      accuracyScore * this.metricWeights.accuracy + 
      consistencyScore * this.metricWeights.consistency +
      timelinessScore * this.metricWeights.timeliness;
    
    // Calculate number of records with issues
    const recordsWithIssues = 
      Math.max(
        invalidParcelNumbers[0].count,
        valueInconsistencies[0].count,
        exemptionInconsistencies[0].count,
        nullCounts[0].parcelNumberNulls,
        nullCounts[0].propertyTypeNulls,
        nullCounts[0].landValueNulls,
        nullCounts[0].improvementValueNulls,
        nullCounts[0].totalValueNulls
      );
    
    // Get trend information if available
    const trend = await this.calculateTrend(overallScore);
    
    // Create metrics object
    const metrics: DataQualityMetrics = {
      completeness,
      accuracy,
      consistency,
      timeliness: {
        averageDataAge: avgAge,
        oldRecords: dataAge[0].oldRecords || 0,
        recentlyUpdated: dataAge[0].recentlyUpdated || 0
      },
      completenessScore,
      accuracyScore,
      consistencyScore,
      timelinessScore,
      overallScore,
      totalRecords,
      recordsWithIssues,
      criticalIssueCount: valueInconsistencies[0].count + invalidParcelNumbers[0].count,
      trend
    };
    
    // Save snapshot for historical tracking
    await this.saveDataQualitySnapshot(metrics);
    
    return metrics;
  }
  
  /**
   * Calculate the score for a component (average of all metrics)
   */
  private calculateComponentScore(metrics: Record<string, number>): number {
    const values = Object.values(metrics);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  
  /**
   * Calculate trend by comparing with last snapshot
   */
  private async calculateTrend(currentScore: number): Promise<{ direction: 'improving' | 'declining' | 'stable'; percentChange: number } | undefined> {
    // Get the most recent snapshot before this one
    const previousSnapshots = await db
      .select({ 
        overallScore: dataQualitySnapshots.overallScore 
      })
      .from(dataQualitySnapshots)
      .orderBy(sql`${dataQualitySnapshots.snapshotDate} DESC`)
      .limit(1);
    
    if (previousSnapshots.length === 0) {
      return undefined; // No previous snapshot to compare
    }
    
    const previousScore = previousSnapshots[0].overallScore;
    const difference = Number(currentScore) - Number(previousScore);
    const percentChange = (difference / Number(previousScore)) * 100;
    
    // Determine trend direction (with 1% threshold for stability)
    let direction: 'improving' | 'declining' | 'stable';
    if (Math.abs(percentChange) < 1) {
      direction = 'stable';
    } else if (difference > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }
    
    return {
      direction,
      percentChange: Math.abs(percentChange)
    };
  }
  
  /**
   * Save data quality snapshot for historical tracking
   */
  private async saveDataQualitySnapshot(metrics: DataQualityMetrics): Promise<void> {
    const snapshot: InsertDataQualitySnapshot = {
      completenessScore: String(metrics.completenessScore),
      accuracyScore: String(metrics.accuracyScore),
      consistencyScore: String(metrics.consistencyScore),
      timelinessScore: String(metrics.timelinessScore),
      overallScore: String(metrics.overallScore),
      metrics: metrics,
      issueCounts: {
        totalIssues: metrics.recordsWithIssues,
        criticalIssues: metrics.criticalIssueCount
      }
    };
    
    await db.insert(dataQualitySnapshots).values(snapshot);
  }
  
  /**
   * Get empty metrics object (for when no data exists)
   */
  private getEmptyMetrics(): DataQualityMetrics {
    return {
      completeness: {},
      accuracy: {},
      consistency: {},
      timeliness: {
        averageDataAge: 0,
        oldRecords: 0,
        recentlyUpdated: 0
      },
      completenessScore: 0,
      accuracyScore: 0,
      consistencyScore: 0,
      timelinessScore: 0,
      overallScore: 0,
      totalRecords: 0,
      recordsWithIssues: 0,
      criticalIssueCount: 0
    };
  }
  
  /**
   * Get historical data quality metrics for trend analysis
   */
  public async getHistoricalMetrics(days: number = 30): Promise<{ date: Date; score: number }[]> {
    const results = await db
      .select({
        date: dataQualitySnapshots.snapshotDate,
        score: dataQualitySnapshots.overallScore
      })
      .from(dataQualitySnapshots)
      .where(sql`${dataQualitySnapshots.snapshotDate} > NOW() - INTERVAL '${days} days'`)
      .orderBy(dataQualitySnapshots.snapshotDate);
    
    return results.map(r => ({
      date: r.date,
      score: Number(r.score)
    }));
  }
  
  /**
   * Analyze data quality - main interface for external calls
   */
  public async analyzeDataQuality(options: { 
    limit?: number; 
    offset?: number; 
    propertyId?: number;
    includeMetrics?: boolean;
    includeFieldAnalysis?: boolean;
    thresholds?: Record<string, number>;
  }): Promise<{
    metrics: DataQualityMetrics;
    fieldAnalysis?: Record<string, any>;
    recommendations: string[];
    overallScore: number;
  }> {
    // Calculate data quality metrics
    const metrics = await this.calculateDataQualityMetrics();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      qualityAnalysis: metrics,
      analysisType: 'all',
      propertyId: options.propertyId
    });
    
    // If requested, generate field-level analysis
    let fieldAnalysis: Record<string, any> | undefined;
    if (options.includeFieldAnalysis) {
      fieldAnalysis = await this.analyzeFieldStatistics(options.propertyId);
    }
    
    return {
      metrics,
      fieldAnalysis,
      recommendations,
      overallScore: metrics.overallScore
    };
  }
  
  /**
   * Analyze field-level statistics
   */
  private async analyzeFieldStatistics(propertyId?: number): Promise<Record<string, any>> {
    // Build query with property filter if needed
    let query = db.select().from(properties);
    if (propertyId) {
      query = query.where(eq(properties.id, propertyId));
    }
    
    // Execute query
    const results = await query.limit(1000); // Limit for performance
    
    // Calculate field-level statistics
    const analysis: Record<string, any> = {};
    
    // Skip if no results
    if (results.length === 0) {
      return analysis;
    }
    
    // Analyze each field
    const sampleProperty = results[0];
    for (const field in sampleProperty) {
      // Count distinct values
      const distinctValues = new Set();
      for (const property of results) {
        if (property[field] !== null && property[field] !== undefined) {
          distinctValues.add(property[field]);
        }
      }
      
      // Calculate nulls
      const nullCount = results.filter(p => p[field] === null || p[field] === undefined).length;
      
      // Add to analysis
      analysis[field] = {
        distinctValueCount: distinctValues.size,
        nullCount,
        nullPercentage: (nullCount / results.length) * 100,
        hasVariety: distinctValues.size > 1
      };
    }
    
    return analysis;
  }
  
  /**
   * Generate data quality recommendations based on current metrics
   */
  public generateRecommendations(params: { 
    qualityAnalysis: any; 
    analysisType?: string; 
    propertyId?: number;
  }): string[] {
    // Extract metrics from the quality analysis
    const metrics = params.qualityAnalysis.metrics || params.qualityAnalysis;
    const recommendations: string[] = [];
    
    // Add recommendations based on component scores
    if (metrics.completenessScore < 0.95) {
      const incompleteFields = Object.entries(metrics.completeness)
        .filter(([_, value]) => value < 0.95)
        .map(([field]) => field);
      
      if (incompleteFields.length > 0) {
        recommendations.push(
          `Improve data completeness by focusing on these fields: ${incompleteFields.join(', ')}`
        );
      }
    }
    
    if (metrics.accuracyScore < 0.98) {
      const inaccurateFields = Object.entries(metrics.accuracy)
        .filter(([_, value]) => value < 0.98)
        .map(([field]) => field);
      
      if (inaccurateFields.length > 0) {
        recommendations.push(
          `Address accuracy issues in these areas: ${inaccurateFields.join(', ')}`
        );
      }
    }
    
    if (metrics.consistencyScore < 0.98) {
      recommendations.push(
        'Improve data consistency by ensuring property values follow Washington State calculation rules'
      );
    }
    
    if (metrics.timelinessScore < 0.7) {
      recommendations.push(
        `Update ${metrics.timeliness.oldRecords} property records that haven't been reviewed in over a year`
      );
    }
    
    // If no specific recommendations, add general one
    if (recommendations.length === 0) {
      recommendations.push(
        'Data quality is good. Continue regular monitoring and validation.'
      );
    }
    
    return recommendations;
  }
}