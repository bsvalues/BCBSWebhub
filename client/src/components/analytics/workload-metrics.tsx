import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarIcon, BarChart3, Clock, CheckSquare, FileBox } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { Badge } from "@/components/ui/badge";

interface WorkloadMetricsProps {
  className?: string;
}

interface UserMetric {
  userId: number;
  userName: string;
  totalProcessed: number;
  averageProcessingTime: number;
  completionRate: number;
  pendingCount: number;
}

interface ProcessingTimeMetric {
  date: string;
  averageTime: number;
  count: number;
}

export default function WorkloadMetrics({ className = "" }: WorkloadMetricsProps) {
  const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "time">("users");
  
  // Default to last 14 days if no date range is selected
  const defaultStartDate = subDays(new Date(), 14);
  const defaultEndDate = new Date();
  
  const startDate = dateRange?.start || defaultStartDate;
  const endDate = dateRange?.end || defaultEndDate;
  
  // Query workload metrics data
  const { data: userMetrics, isLoading: isLoadingUserMetrics } = useQuery({
    queryKey: [
      "/api/analytics/workload", 
      { start: startDate.toISOString(), end: endDate.toISOString(), type: "users" }
    ],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const queryParams = new URLSearchParams(params as Record<string, string>);
      const res = await apiRequest("GET", `/api/analytics/workload?${queryParams}`);
      return res.json();
    }
  });
  
  // Query processing time data
  const { data: timeMetrics, isLoading: isLoadingTimeMetrics } = useQuery({
    queryKey: [
      "/api/analytics/workload", 
      { start: startDate.toISOString(), end: endDate.toISOString(), type: "time" }
    ],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const queryParams = new URLSearchParams(params as Record<string, string>);
      const res = await apiRequest("GET", `/api/analytics/workload?${queryParams}`);
      return res.json();
    }
  });
  
  // Format user metrics data for chart
  const formattedUserMetrics = useMemo(() => {
    if (!userMetrics?.users) return [];
    
    return userMetrics.users.map((user: UserMetric) => ({
      name: user.userName,
      processed: user.totalProcessed,
      completion: Math.round(user.completionRate * 100),
      average: Math.round(user.averageProcessingTime / 3600), // Convert seconds to hours
      pending: user.pendingCount,
    }));
  }, [userMetrics]);
  
  // Format time metrics data for chart
  const formattedTimeMetrics = useMemo(() => {
    if (!timeMetrics?.processingTimes) return [];
    
    return timeMetrics.processingTimes.map((item: ProcessingTimeMetric) => ({
      date: format(new Date(item.date), "MMM d"),
      hours: Math.round(item.averageTime / 3600 * 10) / 10, // Convert seconds to hours with 1 decimal
      count: item.count
    }));
  }, [timeMetrics]);
  
  // For custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (activeTab === "users") {
        return (
          <div className="bg-white p-3 shadow-lg border border-neutral-200 rounded-md">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-neutral-600">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm mr-2"></span>
              Processed: {payload[0].value} audits
            </p>
            <p className="text-sm text-neutral-600">
              <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm mr-2"></span>
              Completion rate: {payload[1].value}%
            </p>
            <p className="text-sm text-neutral-600">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-sm mr-2"></span>
              Avg time: {payload[2].value} hours
            </p>
          </div>
        );
      } else {
        return (
          <div className="bg-white p-3 shadow-lg border border-neutral-200 rounded-md">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-neutral-600">
              <span className="inline-block w-3 h-3 bg-violet-500 rounded-sm mr-2"></span>
              Avg processing time: {payload[0].value} hours
            </p>
            <p className="text-sm text-neutral-600">
              <span className="inline-block w-3 h-3 bg-neutral-400 rounded-sm mr-2"></span>
              Audits: {payload[1].value}
            </p>
          </div>
        );
      }
    }
    
    return null;
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="px-6 py-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="font-medium text-lg flex items-center">
          <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
          Workload Metrics
        </h3>
        
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange ? (
                  <span>
                    {format(dateRange.start, "MMM d")} - {format(dateRange.end, "MMM d, yyyy")}
                  </span>
                ) : (
                  <span>
                    {format(defaultStartDate, "MMM d")} - {format(defaultEndDate, "MMM d, yyyy")}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{
                  from: dateRange?.start || defaultStartDate,
                  to: dateRange?.end || defaultEndDate,
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({
                      start: range.from,
                      end: range.to,
                    });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          <div className="flex rounded-md border border-neutral-200 overflow-hidden">
            <button 
              className={`px-3 py-1.5 text-sm ${
                activeTab === "users" 
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
              onClick={() => setActiveTab("users")}
            >
              By User
            </button>
            <button 
              className={`px-3 py-1.5 text-sm border-l border-neutral-200 ${
                activeTab === "time" 
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
              onClick={() => setActiveTab("time")}
            >
              By Time
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {activeTab === "users" ? (
          // User performance metrics
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              <Badge variant="outline" className="flex items-center border-blue-200 bg-blue-50 text-blue-700 py-1.5">
                <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                {userMetrics?.totalProcessed || 0} audits processed
              </Badge>
              <Badge variant="outline" className="flex items-center border-emerald-200 bg-emerald-50 text-emerald-700 py-1.5">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {userMetrics?.averageProcessingHours || 0} hrs avg time
              </Badge>
              <Badge variant="outline" className="flex items-center border-amber-200 bg-amber-50 text-amber-700 py-1.5">
                <FileBox className="mr-1.5 h-3.5 w-3.5" />
                {userMetrics?.pendingCount || 0} pending audits
              </Badge>
            </div>
            
            {isLoadingUserMetrics ? (
              <div className="flex justify-center items-center h-80">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : formattedUserMetrics.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formattedUserMetrics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={35}
                    barGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Count', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                      }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Percentage', 
                        angle: 90, 
                        position: 'insideRight',
                        style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="processed" 
                      name="Processed Audits" 
                      fill="#3b82f6" 
                      yAxisId="left"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="completion" 
                      name="Completion Rate (%)" 
                      fill="#10b981" 
                      yAxisId="right"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="average" 
                      name="Average Hours" 
                      fill="#f59e0b" 
                      yAxisId="left"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                No workload data available for the selected period
              </div>
            )}
          </>
        ) : (
          // Processing time metrics over time
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              <Badge variant="outline" className="flex items-center border-violet-200 bg-violet-50 text-violet-700 py-1.5">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Avg: {timeMetrics?.averageProcessingHours || 0} hrs
              </Badge>
            </div>
            
            {isLoadingTimeMetrics ? (
              <div className="flex justify-center items-center h-80">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : formattedTimeMetrics.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formattedTimeMetrics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={25}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Hours', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                      }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Audits', 
                        angle: 90, 
                        position: 'insideRight',
                        style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="hours" 
                      name="Avg Processing Time (hours)" 
                      fill="#8b5cf6" 
                      yAxisId="left"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="hours" position="top" fill="#8b5cf6" fontSize={11} />
                    </Bar>
                    <Bar 
                      dataKey="count" 
                      name="Number of Audits" 
                      fill="#9ca3af" 
                      yAxisId="right"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="count" position="top" fill="#6b7280" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                No processing time data available for the selected period
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}