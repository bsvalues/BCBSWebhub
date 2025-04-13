import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ValuationPrediction {
  parcelNumber: string;
  predictedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  confidenceScore: number;
  influencingFactors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  comparableProperties: any[];
  predictionDate: string;
  modelVersion: string;
}

interface PropertyValuationChartProps {
  prediction: ValuationPrediction;
}

export function PropertyValuationChart({ prediction }: PropertyValuationChartProps) {
  // Format the data for the chart
  const data = [
    {
      name: 'Lower Bound',
      value: prediction.confidenceInterval.lower,
      fill: '#9CA3AF'
    },
    {
      name: 'Predicted',
      value: prediction.predictedValue,
      fill: '#2563EB'
    },
    {
      name: 'Upper Bound',
      value: prediction.confidenceInterval.upper,
      fill: '#9CA3AF'
    }
  ];

  // Format the influencing factors data
  const factorsData = prediction.influencingFactors.map(factor => ({
    name: factor.factor,
    impact: Math.round(factor.impact * prediction.predictedValue),
    fill: factor.impact > 0 ? '#10B981' : '#EF4444'
  })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return (
    <div className="space-y-6">
      <div className="h-64">
        <h3 className="text-lg font-semibold mb-2">Valuation Range</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => ['$' + Number(value).toLocaleString(), 'Value']}
            />
            <Bar dataKey="value" fill="#8884d8" />
            <ReferenceLine y={prediction.predictedValue} stroke="#2563EB" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-64">
        <h3 className="text-lg font-semibold mb-2">Factor Impact ($)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={factorsData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={80} />
            <Tooltip 
              formatter={(value) => ['$' + Number(value).toLocaleString(), 'Impact']}
            />
            <Bar dataKey="impact" fill="#8884d8" />
            <ReferenceLine x={0} stroke="#000" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}