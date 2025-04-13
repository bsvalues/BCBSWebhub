import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketTrendAnalysis {
  region: string;
  propertyType: string;
  timeFrame: {
    start: string;
    end: string;
  };
  overallTrend: number;
  monthlyTrends: {
    month: string;
    changePercent: number;
  }[];
  forecastedTrend: {
    threeMonth: number;
    sixMonth: number;
    twelveMonth: number;
  };
  confidenceScore: number;
  influencingFactors: {
    factor: string;
    impact: number;
  }[];
  modelVersion: string;
}

interface MarketTrendsChartProps {
  trends: MarketTrendAnalysis;
}

export function MarketTrendsChart({ trends }: MarketTrendsChartProps) {
  // Format data for the chart
  const chartData = trends.monthlyTrends.map(item => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    changePercent: item.changePercent * 100
  }));

  // Add forecasted trends
  const lastDate = new Date(trends.monthlyTrends[trends.monthlyTrends.length - 1].month);
  const threeMonthDate = new Date(lastDate);
  threeMonthDate.setMonth(threeMonthDate.getMonth() + 3);
  
  const sixMonthDate = new Date(lastDate);
  sixMonthDate.setMonth(sixMonthDate.getMonth() + 6);
  
  const twelveMonthDate = new Date(lastDate);
  twelveMonthDate.setMonth(twelveMonthDate.getMonth() + 12);

  const forecastData = [
    { 
      month: threeMonthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      forecast: trends.forecastedTrend.threeMonth * 100
    },
    { 
      month: sixMonthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      forecast: trends.forecastedTrend.sixMonth * 100
    },
    { 
      month: twelveMonthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      forecast: trends.forecastedTrend.twelveMonth * 100
    }
  ];

  // Format influencing factors
  const sortedFactors = [...trends.influencingFactors].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {trends.region.charAt(0).toUpperCase() + trends.region.slice(1)} Region - {trends.propertyType.charAt(0).toUpperCase() + trends.propertyType.slice(1)} Properties
          </h3>
          <Badge variant={trends.overallTrend >= 0 ? 'default' : 'destructive'}>
            {trends.overallTrend >= 0 ? '+' : ''}{(trends.overallTrend * 100).toFixed(1)}% Overall Trend
          </Badge>
        </div>
        <p className="text-sm text-gray-500">
          Data from {new Date(trends.timeFrame.start).toLocaleDateString()} to {new Date(trends.timeFrame.end).toLocaleDateString()}
        </p>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis 
              label={{ value: 'Change (%)', angle: -90, position: 'insideLeft' }} 
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Change']} />
            <Legend />
            <ReferenceLine y={0} stroke="#000" />
            <Line 
              type="monotone" 
              dataKey="changePercent" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              name="Monthly Change" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Market Forecast</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">3 Month Forecast</p>
                <p className="text-xl font-bold">
                  <span className={trends.forecastedTrend.threeMonth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {trends.forecastedTrend.threeMonth >= 0 ? '+' : ''}{(trends.forecastedTrend.threeMonth * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">6 Month Forecast</p>
                <p className="text-xl font-bold">
                  <span className={trends.forecastedTrend.sixMonth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {trends.forecastedTrend.sixMonth >= 0 ? '+' : ''}{(trends.forecastedTrend.sixMonth * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">12 Month Forecast</p>
                <p className="text-xl font-bold">
                  <span className={trends.forecastedTrend.twelveMonth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {trends.forecastedTrend.twelveMonth >= 0 ? '+' : ''}{(trends.forecastedTrend.twelveMonth * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Influencing Factors</h3>
            {sortedFactors.length > 0 ? (
              <div className="space-y-3">
                {sortedFactors.map((factor, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center">
                      <span className="capitalize">{factor.factor}</span>
                      <Badge variant={factor.impact >= 0 ? 'default' : 'destructive'}>
                        {factor.impact >= 0 ? '+' : ''}{(factor.impact * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                      <div 
                        className={`h-full rounded-full ${factor.impact >= 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.min(Math.abs(factor.impact) * 200, 100)}%`, marginLeft: factor.impact < 0 ? 'auto' : 0, marginRight: factor.impact >= 0 ? 'auto' : 0 }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No influencing factors available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}