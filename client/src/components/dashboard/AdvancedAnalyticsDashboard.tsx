import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, FileDown, MapPin, LineChart, BarChart3, Trees } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

import { EnvironmentalRiskCard } from './EnvironmentalRiskCard';
import { LandUseAnalysisCard } from './LandUseAnalysisCard';
import { MarketTrendsChart } from './MarketTrendsChart';
import { ModelStatsCard } from './ModelStatsCard';

// Sample data for demonstration purposes
const sampleEnvironmentalRisk = {
  parcelNumber: '12-3456-789-0000',
  floodRisk: {
    riskLevel: 'medium' as const
  },
  erosionRisk: {
    riskLevel: 'low' as const
  },
  watershedImpact: {
    sensitivity: 'high' as const
  },
  criticalHabitat: true,
  wetlands: false,
  overallRiskScore: 45
};

const sampleLandUseAnalysis = {
  parcelNumber: '12-3456-789-0000',
  currentZoning: 'R-1 Residential',
  bestUseCategory: 'Residential - Medium Density',
  permittedUses: ['Single Family Housing', 'Duplex Housing', 'Community Facilities'],
  restrictedUses: ['Commercial', 'Industrial', 'High-Density Residential'],
  attributes: {
    slope: 5.2,
    soilType: 'Sandy Loam',
    floodRisk: 0.25,
    proximityToWater: 350,
    proximityToRoads: 15,
    treeCanopy: '35%',
    sunExposure: 'South-facing'
  },
  recommendedUse: 'Single Family Housing',
  confidenceScore: 0.84
};

const sampleMarketTrends = {
  region: 'benton central',
  propertyType: 'residential',
  timeFrame: {
    start: '2025-01-01',
    end: '2025-04-01'
  },
  overallTrend: 0.054,
  monthlyTrends: [
    { month: '2025-01-01', changePercent: 0.015 },
    { month: '2025-02-01', changePercent: 0.022 },
    { month: '2025-03-01', changePercent: 0.017 },
    { month: '2025-04-01', changePercent: -0.003 }
  ],
  forecastedTrend: {
    threeMonth: 0.042,
    sixMonth: 0.075,
    twelveMonth: 0.125
  },
  confidenceScore: 0.87,
  influencingFactors: [
    { factor: 'interest rates', impact: -0.035 },
    { factor: 'inventory levels', impact: 0.062 },
    { factor: 'seasonal demand', impact: 0.027 },
    { factor: 'economic growth', impact: 0.045 }
  ],
  modelVersion: '2.4.1'
};

const sampleModelStats = {
  modelId: 'propvalue-ml-345',
  modelType: 'residential valuation',
  dataPoints: 14523,
  features: [
    'lot size',
    'living area',
    'bedrooms',
    'bathrooms',
    'age',
    'school district',
    'proximity to amenities',
    'recent comparable sales'
  ],
  metrics: {
    rmse: 15243.22,
    mae: 9876.54,
    r2: 0.892,
    medianAbsoluteError: 8234.12
  },
  trainingDate: '2025-03-15',
  version: '2.3.4'
};

export function AdvancedAnalyticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parcelNumber, setParcelNumber] = useState('12-3456-789-0000');
  
  // Simulated data loading
  const refreshData = () => {
    setLoading(true);
    setError(null);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Randomly show an error sometimes to demonstrate error handling
      if (Math.random() > 0.9) {
        setError('Unable to fetch data from ML analysis service. Please try again.');
      }
    }, 1500);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered analysis and visualization for property data
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select defaultValue={parcelNumber} onValueChange={setParcelNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Select parcel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12-3456-789-0000">12-3456-789-0000</SelectItem>
                <SelectItem value="14-7890-123-0000">14-7890-123-0000</SelectItem>
                <SelectItem value="22-3344-555-0000">22-3344-555-0000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="environmental">
        <TabsList className="mb-6 grid grid-cols-4 md:w-[600px] w-full">
          <TabsTrigger value="environmental" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Environmental</span>
            <span className="sm:hidden">Env</span>
          </TabsTrigger>
          <TabsTrigger value="landUse" className="flex items-center">
            <Trees className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Land Use</span>
            <span className="sm:hidden">Land</span>
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Market Trends</span>
            <span className="sm:hidden">Market</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Model Stats</span>
            <span className="sm:hidden">Models</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="environmental" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                Environmental Risk Assessment
              </CardTitle>
              <CardDescription>
                AI analysis of environmental factors and risks for parcel {parcelNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              ) : (
                <EnvironmentalRiskCard assessment={sampleEnvironmentalRisk} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="landUse" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trees className="h-5 w-5 mr-2 text-green-600" />
                Land Use Analysis
              </CardTitle>
              <CardDescription>
                AI-powered land use analysis and recommendations for parcel {parcelNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                </div>
              ) : (
                <LandUseAnalysisCard analysis={sampleLandUseAnalysis} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="market" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-blue-600" />
                Market Trend Analysis
              </CardTitle>
              <CardDescription>
                Property market trends and forecasts for Benton County regions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                </div>
              ) : (
                <MarketTrendsChart trends={sampleMarketTrends} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="models" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                ML Model Statistics
              </CardTitle>
              <CardDescription>
                Performance metrics for machine learning models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                </div>
              ) : (
                <ModelStatsCard stats={sampleModelStats} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}