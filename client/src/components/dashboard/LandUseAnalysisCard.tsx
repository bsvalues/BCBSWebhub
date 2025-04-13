import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Trees, 
  Factory, 
  Home, 
  ShoppingCart, 
  Mountain, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

interface LandUseAnalysis {
  parcelNumber: string;
  currentZoning: string;
  bestUseCategory: string;
  permittedUses: string[];
  restrictedUses: string[];
  attributes: {
    slope: number;
    soilType: string;
    floodRisk: number;
    proximityToWater: number;
    proximityToRoads: number;
    [key: string]: any;
  };
  recommendedUse: string;
  confidenceScore: number;
}

interface LandUseAnalysisCardProps {
  analysis: LandUseAnalysis;
}

export function LandUseAnalysisCard({ analysis }: LandUseAnalysisCardProps) {
  const getZoningIcon = (zoning: string): React.ReactNode => {
    const zoningLower = zoning.toLowerCase();
    if (zoningLower.includes('residential')) {
      return <Home className="h-5 w-5 text-blue-500" />;
    } else if (zoningLower.includes('commercial')) {
      return <ShoppingCart className="h-5 w-5 text-green-500" />;
    } else if (zoningLower.includes('industrial')) {
      return <Factory className="h-5 w-5 text-orange-500" />;
    } else if (zoningLower.includes('agricultural')) {
      return <Trees className="h-5 w-5 text-green-700" />;
    } else if (zoningLower.includes('mixed')) {
      return <Building className="h-5 w-5 text-purple-500" />;
    } else {
      return <Mountain className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold">Current Zoning</h3>
              <Badge className="ml-auto">{analysis.currentZoning}</Badge>
            </div>
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold">Best Use Category</h3>
              <Badge className="ml-auto">{analysis.bestUseCategory}</Badge>
            </div>
            <div className="flex items-center">
              <h3 className="text-lg font-semibold">Recommended Use</h3>
              <div className="ml-auto flex items-center">
                {getZoningIcon(analysis.recommendedUse)}
                <span className="ml-2">{analysis.recommendedUse}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Recommendation Confidence</h3>
            <div className="mb-2">
              <Progress value={analysis.confidenceScore * 100} className="h-3 bg-gray-200" />
            </div>
            <div className="flex justify-between text-sm">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
            
            <div className="mt-6">
              <p className="text-center text-xl font-bold">
                {(analysis.confidenceScore * 100).toFixed(1)}% Confidence
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Permitted Uses</h3>
            {analysis.permittedUses.length > 0 ? (
              <ul className="space-y-2">
                {analysis.permittedUses.map((use, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                    <span>{use}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No permitted uses specified</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Restricted Uses</h3>
            {analysis.restrictedUses.length > 0 ? (
              <ul className="space-y-2">
                {analysis.restrictedUses.map((use, index) => (
                  <li key={index} className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span>{use}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No restricted uses specified</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Land Attributes</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Slope</p>
              <p className="font-medium">{analysis.attributes.slope}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Soil Type</p>
              <p className="font-medium">{analysis.attributes.soilType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Flood Risk</p>
              <p className="font-medium">{analysis.attributes.floodRisk * 100}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proximity to Water</p>
              <p className="font-medium">{analysis.attributes.proximityToWater}m</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proximity to Roads</p>
              <p className="font-medium">{analysis.attributes.proximityToRoads}m</p>
            </div>
            {Object.entries(analysis.attributes)
              .filter(([key]) => !['slope', 'soilType', 'floodRisk', 'proximityToWater', 'proximityToRoads'].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-gray-500">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}