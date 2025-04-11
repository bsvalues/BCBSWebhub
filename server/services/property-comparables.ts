import { db } from "../db";
import { properties, Property } from "@shared/washington-schema";
import { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";

// Options for finding comparable properties
export interface ComparableOptions {
  propertyId: number;
  propertyType?: string;
  maxResults?: number;
  maxAgeDifference?: number; // years
  maxSizeDifference?: number; // percent
  maxValueDifference?: number; // percent
  sameNeighborhood?: boolean;
  sameTaxingDistrict?: boolean;
  maxDistanceMiles?: number;
}

// Result from comparable property analysis
export interface ComparableResult {
  reference: Property;
  comparables: (Property & { similarityScore: number })[];
}

/**
 * Service for finding and analyzing comparable properties
 * Implements Washington State guidelines for property comparisons
 */
export class PropertyComparableService {
  
  /**
   * Find comparable properties based on Washington State assessor guidelines
   */
  public async findComparableProperties(options: ComparableOptions): Promise<ComparableResult> {
    const { 
      propertyId, 
      propertyType,
      maxResults = 10, 
      maxAgeDifference = 10, // years
      maxSizeDifference = 20, // percent
      maxValueDifference = 30, // percent
      sameNeighborhood = true,
      sameTaxingDistrict = true,
      maxDistanceMiles = 5
    } = options;
    
    // Get reference property
    const referenceResults = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));
    
    if (referenceResults.length === 0) {
      throw new Error(`Reference property not found: ${propertyId}`);
    }
    
    const reference = referenceResults[0];
    
    // Base query for comparables - exclude the reference property itself
    const baseQuery = db
      .select()
      .from(properties)
      .where(and(
        sql`${properties.id} != ${propertyId}`,
        propertyType ? eq(properties.propertyType, propertyType as any) : 
                     eq(properties.propertyType, reference.propertyType)
      ));
    
    // Add age filter if the reference property has a year built
    let query = baseQuery;
    if (reference.yearBuilt) {
      const minYear = reference.yearBuilt - maxAgeDifference;
      const maxYear = reference.yearBuilt + maxAgeDifference;
      
      query = query.where(and(
        gte(properties.yearBuilt, minYear),
        lte(properties.yearBuilt, maxYear)
      ));
    }
    
    // Add size filter if the reference property has size data
    if (reference.acres && reference.acres > 0) {
      const minAcres = Number(reference.acres) * (1 - maxSizeDifference/100);
      const maxAcres = Number(reference.acres) * (1 + maxSizeDifference/100);
      
      query = query.where(and(
        gte(properties.acres, minAcres),
        lte(properties.acres, maxAcres)
      ));
    }
    
    // Add value range filter
    if (reference.totalValue) {
      const minValue = Number(reference.totalValue) * (1 - maxValueDifference/100);
      const maxValue = Number(reference.totalValue) * (1 + maxValueDifference/100);
      
      query = query.where(and(
        gte(properties.totalValue, minValue),
        lte(properties.totalValue, maxValue)
      ));
    }
    
    // Add location filters
    if (sameNeighborhood && reference.city) {
      query = query.where(eq(properties.city, reference.city));
    }
    
    if (sameTaxingDistrict && reference.taxingDistrict) {
      query = query.where(eq(properties.taxingDistrict, reference.taxingDistrict));
    }
    
    // If we have geospatial data, filter by distance
    // This would use PostGIS in a full implementation
    if (reference.geoData && maxDistanceMiles) {
      // This is a simplified approach. In a real implementation, we would use 
      // PostGIS functions to calculate distance properly.
      // Something like:
      // query = query.where(
      //   sql`ST_Distance(${properties.geoData}::geography, ST_SetSRID(ST_Point(${reference.geoData.longitude}, ${reference.geoData.latitude}), 4326)::geography) <= ${maxDistanceMiles * 1609.34}`
      // );
    }
    
    // Add sorting by similarity (most similar first)
    // This is a simplified approach, in a real implementation we would use more sophisticated
    // similarity calculation in the database query directly
    const compareResults = await query.limit(maxResults * 2);
    
    // Calculate similarity scores and sort
    const comparables = compareResults
      .map(property => ({
        ...property,
        similarityScore: this.calculateSimilarityScore(reference, property)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, maxResults);
    
    return {
      reference,
      comparables
    };
  }
  
  /**
   * Calculate similarity score based on Washington assessor guidelines
   * Returns a value between 0-1, where 1 is identical
   */
  private calculateSimilarityScore(reference: Property, comparable: Property): number {
    let totalWeight = 0;
    let weightedScore = 0;
    
    // Property type (exact match required, highest weight)
    const typeWeight = 0.25;
    totalWeight += typeWeight;
    weightedScore += reference.propertyType === comparable.propertyType ? typeWeight : 0;
    
    // Size similarity (high weight)
    if (reference.acres && comparable.acres) {
      const sizeWeight = 0.20;
      totalWeight += sizeWeight;
      
      const sizeDiff = Math.abs(Number(reference.acres) - Number(comparable.acres));
      const sizeRatio = Math.min(Number(reference.acres), Number(comparable.acres)) / 
                        Math.max(Number(reference.acres), Number(comparable.acres));
      const sizeSimilarity = sizeRatio * sizeWeight;
      
      weightedScore += sizeSimilarity;
    }
    
    // Age similarity (medium weight)
    if (reference.yearBuilt && comparable.yearBuilt) {
      const ageWeight = 0.15;
      totalWeight += ageWeight;
      
      const ageDiff = Math.abs(reference.yearBuilt - comparable.yearBuilt);
      const maxAgeDiff = 30; // Consider properties more than 30 years apart as completely dissimilar
      const ageSimilarity = Math.max(0, 1 - (ageDiff / maxAgeDiff)) * ageWeight;
      
      weightedScore += ageSimilarity;
    }
    
    // Value similarity (medium weight)
    if (reference.totalValue && comparable.totalValue) {
      const valueWeight = 0.15;
      totalWeight += valueWeight;
      
      const valueRatio = Math.min(Number(reference.totalValue), Number(comparable.totalValue)) / 
                         Math.max(Number(reference.totalValue), Number(comparable.totalValue));
      const valueSimilarity = valueRatio * valueWeight;
      
      weightedScore += valueSimilarity;
    }
    
    // Location similarity (high weight)
    const locationWeight = 0.25;
    totalWeight += locationWeight;
    
    let locationScore = 0;
    // Same taxing district is very important
    if (reference.taxingDistrict && comparable.taxingDistrict && 
        reference.taxingDistrict === comparable.taxingDistrict) {
      locationScore += 0.5;
    }
    
    // Same city is important
    if (reference.city && comparable.city && reference.city === comparable.city) {
      locationScore += 0.3;
    }
    
    // Same zip code is important
    if (reference.zipCode && comparable.zipCode && reference.zipCode === comparable.zipCode) {
      locationScore += 0.2;
    }
    
    weightedScore += locationScore * locationWeight;
    
    // Normalize score if we had missing data
    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }
  
  /**
   * Calculate price per square foot/acre for comparing properties
   */
  public calculateValueMetrics(property: Property): { 
    valuePerAcre: number | null;
    valuePerSqFt: number | null;
    improvementPercent: number | null;
  } {
    const valuePerAcre = property.acres && property.acres > 0 ? 
      Number(property.totalValue) / Number(property.acres) : null;
      
    const valuePerSqFt = property.buildingSqFt && property.buildingSqFt > 0 ? 
      Number(property.totalValue) / Number(property.buildingSqFt) : null;
      
    const improvementPercent = property.totalValue && Number(property.totalValue) > 0 ? 
      (Number(property.improvementValue) / Number(property.totalValue)) * 100 : null;
    
    return {
      valuePerAcre,
      valuePerSqFt,
      improvementPercent
    };
  }
  
  /**
   * Analyze value distribution among comparable properties
   */
  public analyzeComparables(result: ComparableResult): {
    medianValue: number;
    averageValue: number;
    standardDeviation: number;
    recommendedValueRange: [number, number];
    outliers: Property[];
  } {
    const { reference, comparables } = result;
    
    if (comparables.length === 0) {
      return {
        medianValue: Number(reference.totalValue),
        averageValue: Number(reference.totalValue),
        standardDeviation: 0,
        recommendedValueRange: [Number(reference.totalValue), Number(reference.totalValue)],
        outliers: []
      };
    }
    
    // Extract values and calculate statistics
    const values = comparables.map(c => Number(c.totalValue));
    
    // Calculate average
    const averageValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate median
    const sortedValues = [...values].sort((a, b) => a - b);
    const medianValue = sortedValues.length % 2 === 0 ?
      (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2 :
      sortedValues[Math.floor(sortedValues.length / 2)];
    
    // Calculate standard deviation
    const squareDiffs = values.map(val => Math.pow(val - averageValue, 2));
    const standardDeviation = Math.sqrt(squareDiffs.reduce((sum, val) => sum + val, 0) / values.length);
    
    // Define recommended value range (within 1 standard deviation of median)
    const recommendedValueRange: [number, number] = [
      Math.max(0, medianValue - standardDeviation),
      medianValue + standardDeviation
    ];
    
    // Identify outliers (more than 2 standard deviations from average)
    const outliers = comparables.filter(c => 
      Math.abs(Number(c.totalValue) - averageValue) > 2 * standardDeviation
    );
    
    return {
      medianValue,
      averageValue,
      standardDeviation,
      recommendedValueRange,
      outliers
    };
  }
}