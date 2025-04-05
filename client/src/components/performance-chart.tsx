import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface PerformanceChartProps {
  className?: string;
}

interface AnalyticsData {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  needsInfoCount: number;
  totalCount: number;
  completionRate: string;
  approvalRate: string;
  priorityBreakdown: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
}

export default function PerformanceChart({ className = "" }: PerformanceChartProps) {
  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
  });

  // Create data for pie chart
  const getPieChartData = () => {
    if (!analytics) return [];
    
    return [
      { name: "Approved", value: analytics.approvedCount, color: "#4caf50" },
      { name: "Rejected", value: analytics.rejectedCount, color: "#f44336" },
      { name: "Needs Info", value: analytics.needsInfoCount, color: "#ff9800" },
      { name: "Pending", value: analytics.pendingCount, color: "#2196f3" }
    ];
  };

  // Create data for the priority breakdown
  const getPriorityData = () => {
    if (!analytics) return [];
    
    return [
      { name: "Urgent", value: analytics.priorityBreakdown.urgent, color: "#f44336" },
      { name: "High", value: analytics.priorityBreakdown.high, color: "#ff9800" },
      { name: "Normal", value: analytics.priorityBreakdown.normal, color: "#2196f3" },
      { name: "Low", value: analytics.priorityBreakdown.low, color: "#4caf50" }
    ];
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="px-6 py-4 border-b border-neutral-200">
        <h3 className="font-medium text-lg">Performance</h3>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <span className="text-neutral-500">Loading analytics data...</span>
          </div>
        ) : (
          <>
            {/* Completion Rate */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">Completion Rate</span>
              <span className="text-sm font-medium">{analytics?.completionRate || 0}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${analytics?.completionRate || 0}%` }}
              ></div>
            </div>
            
            {/* Approval Rate */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">Approval Rate</span>
              <span className="text-sm font-medium">{analytics?.approvalRate || 0}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${analytics?.approvalRate || 0}%` }}
              ></div>
            </div>
            
            {/* Charts */}
            <div className="mt-6 grid grid-cols-1 gap-6">
              {/* Audit Status Distribution */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-neutral-700">Audit Status Distribution</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getPieChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {getPieChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Priority Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-neutral-700">Priority Breakdown</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getPriorityData()}
                      margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Count">
                        {getPriorityData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
