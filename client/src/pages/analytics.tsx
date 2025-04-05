import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import PerformanceChart from "@/components/performance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function Analytics() {
  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
  });

  // Sample data for time-based analytics
  const monthlyData = [
    { name: "Jan", audits: 45, approvalRate: 85 },
    { name: "Feb", audits: 52, approvalRate: 78 },
    { name: "Mar", audits: 48, approvalRate: 82 },
    { name: "Apr", audits: 61, approvalRate: 75 },
    { name: "May", audits: 55, approvalRate: 80 },
    { name: "Jun", audits: 67, approvalRate: 88 },
  ];

  // Processing time data
  const processingTimeData = [
    { name: "Residential", time: 1.2 },
    { name: "Commercial", time: 2.4 },
    { name: "Industrial", time: 3.1 },
    { name: "Agricultural", time: 1.8 },
    { name: "Special Use", time: 2.7 },
  ];

  // Audit outcome data
  const getAuditOutcomeData = () => {
    if (!analytics) return [];
    
    return [
      { name: "Approved", value: analytics.approvedCount, color: "#4caf50" },
      { name: "Rejected", value: analytics.rejectedCount, color: "#f44336" },
      { name: "Needs Info", value: analytics.needsInfoCount, color: "#ff9800" },
      { name: "Pending", value: analytics.pendingCount, color: "#2196f3" }
    ];
  };

  return (
    <>
      <Header title="Analytics" />
      
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-4 px-4 md:px-6">
        <div className="my-6">
          <h2 className="text-2xl font-bold mb-6">Audit Performance Analytics</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-blue-600">{isLoading ? "..." : analytics?.totalCount || 0}</span>
                  <span className="text-sm text-neutral-600">Total Audits</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-green-600">{isLoading ? "..." : `${analytics?.approvalRate || 0}%`}</span>
                  <span className="text-sm text-neutral-600">Approval Rate</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-yellow-600">1.8 hrs</span>
                  <span className="text-sm text-neutral-600">Avg Processing Time</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-purple-600">24</span>
                  <span className="text-sm text-neutral-600">Active Auditors</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Audit Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="audits" name="Audits Processed" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, "Approval Rate"]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="approvalRate" 
                        name="Approval Rate (%)" 
                        stroke="#4caf50" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getAuditOutcomeData()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {getAuditOutcomeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, name]} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Processing Time by Property Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={processingTimeData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" unit=" hrs" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip 
                        formatter={(value) => [`${value} hours`, "Processing Time"]}
                      />
                      <Legend />
                      <Bar dataKey="time" name="Processing Time (hours)" fill="#ff9800" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
