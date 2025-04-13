/**
 * Advanced Analytics API
 * 
 * Exposes GIS and ML integration services through REST endpoints
 */

import { Express, Request, Response } from 'express';
import { log } from '../vite';
import { gisIntegration } from '../integrations/gis-integration';
import { mlIntegration } from '../integrations/ml-integration';
import { Property } from '@shared/washington-schema';

/**
 * Register advanced analytics API routes
 * 
 * @param app Express application
 */
export function registerAdvancedAnalyticsAPI(app: Express): void {
  const API_BASE = '/api/analytics';
  
  // GIS Related Endpoints
  
  /**
   * Get environmental risk assessment for a property
   */
  app.get(`${API_BASE}/property/:parcelNumber/environmental-risk`, async (req: Request, res: Response) => {
    try {
      const { parcelNumber } = req.params;
      
      if (!parcelNumber) {
        return res.status(400).json({ error: 'Parcel number is required' });
      }
      
      // In a real implementation, we would fetch the property from the database
      const mockProperty: Property = {
        id: 1,
        parcelNumber,
        propertyType: 'RESIDENTIAL',
        landUseCode: '100',
        assessmentYear: 2025,
        landValue: 100000,
        improvementValue: 250000,
        totalValue: 350000
      } as Property;
      
      const riskAssessment = await gisIntegration.getEnvironmentalRiskAssessment(mockProperty);
      
      if (!riskAssessment) {
        return res.status(404).json({ error: 'Risk assessment not available for this property' });
      }
      
      return res.json({ riskAssessment });
    } catch (error) {
      log(`Error in environmental risk API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to get environmental risk assessment' });
    }
  });
  
  /**
   * Get land use analysis for a property
   */
  app.get(`${API_BASE}/property/:parcelNumber/land-use`, async (req: Request, res: Response) => {
    try {
      const { parcelNumber } = req.params;
      
      if (!parcelNumber) {
        return res.status(400).json({ error: 'Parcel number is required' });
      }
      
      // In a real implementation, we would fetch the property from the database
      const mockProperty: Property = {
        id: 1,
        parcelNumber,
        propertyType: 'RESIDENTIAL',
        landUseCode: '100',
        assessmentYear: 2025,
        landValue: 100000,
        improvementValue: 250000,
        totalValue: 350000
      } as Property;
      
      const landUseAnalysis = await gisIntegration.analyzeLandUse(mockProperty);
      
      if (!landUseAnalysis) {
        return res.status(404).json({ error: 'Land use analysis not available for this property' });
      }
      
      return res.json({ landUseAnalysis });
    } catch (error) {
      log(`Error in land use API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to get land use analysis' });
    }
  });
  
  /**
   * Find nearby properties
   */
  app.get(`${API_BASE}/property/:parcelNumber/nearby`, async (req: Request, res: Response) => {
    try {
      const { parcelNumber } = req.params;
      const radiusMeters = parseInt(req.query.radius as string) || 1000;
      
      if (!parcelNumber) {
        return res.status(400).json({ error: 'Parcel number is required' });
      }
      
      // In a real implementation, we would fetch the property from the database
      const mockProperty: Property = {
        id: 1,
        parcelNumber,
        propertyType: 'RESIDENTIAL',
        landUseCode: '100',
        assessmentYear: 2025,
        landValue: 100000,
        improvementValue: 250000,
        totalValue: 350000
      } as Property;
      
      const nearbyProperties = await gisIntegration.findNearbyProperties(mockProperty, radiusMeters);
      
      return res.json({ 
        parcelNumber,
        radiusMeters,
        nearbyCount: nearbyProperties.length,
        nearbyProperties
      });
    } catch (error) {
      log(`Error in nearby properties API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to find nearby properties' });
    }
  });
  
  // ML Related Endpoints
  
  /**
   * Get property valuation prediction
   */
  app.get(`${API_BASE}/property/:parcelNumber/valuation-prediction`, async (req: Request, res: Response) => {
    try {
      const { parcelNumber } = req.params;
      
      if (!parcelNumber) {
        return res.status(400).json({ error: 'Parcel number is required' });
      }
      
      // In a real implementation, we would fetch the property from the database
      const mockProperty: Property = {
        id: 1,
        parcelNumber,
        propertyType: 'RESIDENTIAL',
        landUseCode: '100',
        assessmentYear: 2025,
        landValue: 100000,
        improvementValue: 250000,
        totalValue: 350000
      } as Property;
      
      const valuationPrediction = await mlIntegration.predictPropertyValuation(mockProperty);
      
      if (!valuationPrediction) {
        return res.status(404).json({ error: 'Valuation prediction not available for this property' });
      }
      
      return res.json({ valuationPrediction });
    } catch (error) {
      log(`Error in valuation prediction API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to get valuation prediction' });
    }
  });
  
  /**
   * Detect anomalies in property data
   */
  app.get(`${API_BASE}/property/:parcelNumber/anomaly-detection`, async (req: Request, res: Response) => {
    try {
      const { parcelNumber } = req.params;
      
      if (!parcelNumber) {
        return res.status(400).json({ error: 'Parcel number is required' });
      }
      
      // In a real implementation, we would fetch the property from the database
      const mockProperty: Property = {
        id: 1,
        parcelNumber,
        propertyType: 'RESIDENTIAL',
        landUseCode: '100',
        assessmentYear: 2025,
        landValue: 100000,
        improvementValue: 250000,
        totalValue: 350000
      } as Property;
      
      const anomalyDetection = await mlIntegration.detectAnomalies(mockProperty);
      
      if (!anomalyDetection) {
        return res.status(404).json({ error: 'Anomaly detection not available for this property' });
      }
      
      return res.json({ anomalyDetection });
    } catch (error) {
      log(`Error in anomaly detection API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to detect anomalies' });
    }
  });
  
  /**
   * Analyze market trends for a region
   */
  app.get(`${API_BASE}/market-trends`, async (req: Request, res: Response) => {
    try {
      const region = req.query.region as string || 'Benton County';
      const propertyType = req.query.propertyType as string || 'RESIDENTIAL';
      const timeFrameMonths = parseInt(req.query.timeFrameMonths as string) || 12;
      
      const marketTrendAnalysis = await mlIntegration.analyzeMarketTrends(
        region,
        propertyType,
        timeFrameMonths
      );
      
      if (!marketTrendAnalysis) {
        return res.status(404).json({ error: 'Market trend analysis not available' });
      }
      
      return res.json({ marketTrendAnalysis });
    } catch (error) {
      log(`Error in market trends API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to analyze market trends' });
    }
  });
  
  /**
   * Get ML model training statistics
   */
  app.get(`${API_BASE}/model-stats/:modelType`, async (req: Request, res: Response) => {
    try {
      const { modelType } = req.params;
      
      if (!modelType) {
        return res.status(400).json({ error: 'Model type is required' });
      }
      
      const trainingStats = await mlIntegration.getModelTrainingStats(modelType);
      
      if (!trainingStats) {
        return res.status(404).json({ error: 'Training statistics not available for this model' });
      }
      
      return res.json({ trainingStats });
    } catch (error) {
      log(`Error in model stats API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to get model training statistics' });
    }
  });
  
  /**
   * Check service health for GIS and ML services
   */
  app.get(`${API_BASE}/health`, async (req: Request, res: Response) => {
    try {
      const gisAvailable = await gisIntegration.isServiceAvailable();
      const mlAvailable = await mlIntegration.isServiceAvailable();
      
      return res.json({
        status: 'ok',
        services: {
          gis: {
            available: gisAvailable,
            endpoint: process.env.GIS_SERVICE_URL || 'https://gis.bentoncountywa.gov/api/v1'
          },
          ml: {
            available: mlAvailable,
            endpoint: process.env.ML_SERVICE_URL || 'https://ml-api.bentoncountywa.gov/api/v1'
          }
        }
      });
    } catch (error) {
      log(`Error in health check API: ${error}`, 'api');
      return res.status(500).json({ error: 'Failed to check service health' });
    }
  });
  
  log('Advanced analytics API routes registered', 'api');
}