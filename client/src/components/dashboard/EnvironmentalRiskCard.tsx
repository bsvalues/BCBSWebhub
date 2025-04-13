import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface EnvironmentalRiskAssessment {
  parcelNumber: string;
  floodRisk: {
    riskLevel: 'none' | 'low' | 'medium' | 'high' | 'severe';
  };
  erosionRisk: {
    riskLevel: 'none' | 'low' | 'medium' | 'high' | 'severe';
  };
  watershedImpact: {
    sensitivity: 'low' | 'medium' | 'high';
  };
  criticalHabitat: boolean;
  wetlands: boolean;
  overallRiskScore: number;
}

interface EnvironmentalRiskCardProps {
  assessment: EnvironmentalRiskAssessment;
}

export function EnvironmentalRiskCard({ assessment }: EnvironmentalRiskCardProps) {
  const riskLevelToNumber = (level: 'none' | 'low' | 'medium' | 'high' | 'severe'): number => {
    const map: Record<string, number> = {
      'none': 0,
      'low': 25,
      'medium': 50,
      'high': 75,
      'severe': 100
    };
    return map[level] || 0;
  };

  const sensitivityToNumber = (level: 'low' | 'medium' | 'high'): number => {
    const map: Record<string, number> = {
      'low': 25,
      'medium': 50,
      'high': 100
    };
    return map[level] || 0;
  };

  const getRiskColor = (level: 'none' | 'low' | 'medium' | 'high' | 'severe' | 'low' | 'medium' | 'high'): string => {
    const map: Record<string, string> = {
      'none': 'bg-green-500',
      'low': 'bg-green-300',
      'medium': 'bg-yellow-300',
      'high': 'bg-orange-500',
      'severe': 'bg-red-500'
    };
    return map[level] || 'bg-gray-300';
  };

  const getRiskIcon = (level: string): React.ReactNode => {
    if (level === 'none' || level === 'low') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (level === 'medium') {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Flood Risk</h3>
              <div className="flex items-center">
                {getRiskIcon(assessment.floodRisk.riskLevel)}
                <span className="ml-2 capitalize">{assessment.floodRisk.riskLevel}</span>
              </div>
            </div>
            <Progress 
              value={riskLevelToNumber(assessment.floodRisk.riskLevel)} 
              className={`h-2 ${getRiskColor(assessment.floodRisk.riskLevel)}`} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Erosion Risk</h3>
              <div className="flex items-center">
                {getRiskIcon(assessment.erosionRisk.riskLevel)}
                <span className="ml-2 capitalize">{assessment.erosionRisk.riskLevel}</span>
              </div>
            </div>
            <Progress 
              value={riskLevelToNumber(assessment.erosionRisk.riskLevel)} 
              className={`h-2 ${getRiskColor(assessment.erosionRisk.riskLevel)}`} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Watershed Impact</h3>
              <div className="flex items-center">
                {getRiskIcon(assessment.watershedImpact.sensitivity)}
                <span className="ml-2 capitalize">{assessment.watershedImpact.sensitivity} Sensitivity</span>
              </div>
            </div>
            <Progress 
              value={sensitivityToNumber(assessment.watershedImpact.sensitivity)} 
              className={`h-2 ${getRiskColor(assessment.watershedImpact.sensitivity)}`} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Protected Areas</h3>
              <div className="space-x-2">
                <Badge variant={assessment.criticalHabitat ? 'destructive' : 'outline'}>
                  Critical Habitat: {assessment.criticalHabitat ? 'Yes' : 'No'}
                </Badge>
                <Badge variant={assessment.wetlands ? 'destructive' : 'outline'}>
                  Wetlands: {assessment.wetlands ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
            <div className="h-2"></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-xl font-semibold">Overall Environmental Risk</h3>
            <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" 
                style={{ width: `${assessment.overallRiskScore}%` }}
              ></div>
            </div>
            <div className="flex justify-between w-full text-sm">
              <span>Low Risk</span>
              <span>Medium Risk</span>
              <span>High Risk</span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {assessment.overallRiskScore}% Risk Level
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}