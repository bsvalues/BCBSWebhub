import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface ModelTrainingStats {
  modelId: string;
  modelType: string;
  dataPoints: number;
  features: string[];
  metrics: {
    rmse?: number;
    mae?: number;
    r2?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    [key: string]: number | undefined;
  };
  trainingDate: string;
  version: string;
}

interface ModelStatsCardProps {
  stats: ModelTrainingStats;
}

export function ModelStatsCard({ stats }: ModelStatsCardProps) {
  // Transform metrics for the chart
  const chartData = Object.entries(stats.metrics)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      name: key.toUpperCase(),
      value: key === 'r2' ? value! * 100 : value, // Convert R² to percentage
    }));

  // Format features for display
  const featureGroups = [];
  for (let i = 0; i < stats.features.length; i += 3) {
    featureGroups.push(stats.features.slice(i, i + 3));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">{stats.modelType.charAt(0).toUpperCase() + stats.modelType.slice(1)} Model</h3>
          <p className="text-sm text-gray-500">
            ID: {stats.modelId} | Version: {stats.version}
          </p>
          <p className="text-sm text-gray-500">
            Trained on {new Date(stats.trainingDate).toLocaleDateString()} with {stats.dataPoints.toLocaleString()} data points
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {stats.version}
        </Badge>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Model Features</h3>
            <div className="space-y-2">
              {featureGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="flex flex-wrap gap-2">
                  {group.map((feature, index) => (
                    <Badge key={index} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Training Data</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Data Points</span>
                  <span className="font-medium">{stats.dataPoints.toLocaleString()}</span>
                </div>
                <Progress 
                  value={(stats.dataPoints / 20000) * 100} 
                  className="h-2 mt-1" 
                />
              </div>
              
              {stats.metrics.r2 !== undefined && (
                <div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">R² Score</span>
                    <span className="font-medium">{(stats.metrics.r2 * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={stats.metrics.r2 * 100} 
                    className="h-2 mt-1" 
                  />
                </div>
              )}
              
              {stats.metrics.accuracy !== undefined && (
                <div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Accuracy</span>
                    <span className="font-medium">{(stats.metrics.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={stats.metrics.accuracy * 100} 
                    className="h-2 mt-1" 
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Model Metrics</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name, props) => {
                    // Format based on metric type
                    if (props.payload.name === 'R2') {
                      return [`${value.toFixed(1)}%`, name];
                    }
                    return [value.toFixed(2), name];
                  }}
                />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            {Object.entries(stats.metrics).map(([key, value]) => (
              <div key={key} className="text-center p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">{key}</p>
                <p className="text-lg font-semibold">
                  {key === 'r2' ? `${(value! * 100).toFixed(1)}%` : value!.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}