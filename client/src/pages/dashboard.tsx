import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { StatCard } from "@/components/ui/stat-card";
import LiveAuditLog from "@/components/live-audit-log";
import PerformanceChart from "@/components/performance-chart";
import AuditItem from "@/components/audit-item";
import AuditDetailModal from "@/components/audit-detail-modal";
import WorkloadMetrics from "@/components/analytics/workload-metrics";
import { Audit } from "@shared/schema";

export default function Dashboard() {
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch pending audits
  const { data: pendingAudits, isLoading: isLoadingAudits } = useQuery<Audit[]>({
    queryKey: ["/api/audits/pending"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch pending audits');
      }
      return response.json();
    },
  });

  // Fetch analytics data
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/analytics"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
  });

  const handleAuditSelect = (audit: Audit) => {
    setSelectedAudit(audit);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Header title="Dashboard" />
      
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-4 px-4 md:px-6">
        {/* Dashboard Summary / KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
          <StatCard 
            title="Pending Audits" 
            value={isLoadingAnalytics ? "..." : analytics?.pendingCount || 0}
            icon={<span className="material-icons text-blue-600">assignment</span>}
            trend={{ value: "5%", isPositive: true, text: "5% from yesterday" }}
            iconBgColor="bg-blue-100"
          />
          
          <StatCard 
            title="Completed Today" 
            value={isLoadingAnalytics ? "..." : analytics?.approvedCount || 0}
            icon={<span className="material-icons text-green-600">check_circle</span>}
            trend={{ value: "12%", isPositive: true, text: "12% from yesterday" }}
            iconBgColor="bg-green-100"
          />
          
          <StatCard 
            title="Avg. Processing Time" 
            value="1.4 hrs"
            icon={<span className="material-icons text-yellow-600">schedule</span>}
            trend={{ value: "8%", isPositive: false, text: "8% from last week" }}
            iconBgColor="bg-yellow-100"
          />
          
          <StatCard 
            title="Rejection Rate" 
            value={`${(analytics?.rejectedCount && analytics?.totalCount) ? 
              ((analytics.rejectedCount / analytics.totalCount) * 100).toFixed(1) : 0}%`}
            icon={<span className="material-icons text-red-600">error_outline</span>}
            trend={{ value: "3.2%", isPositive: true, text: "3.2% from last week" }}
            iconBgColor="bg-red-100"
          />
        </div>
        
        {/* Workload Metrics */}
        <div className="mt-6 mb-8">
          <WorkloadMetrics />
        </div>
        
        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Pending Audits */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="font-medium text-lg">Pending Audits</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200">
                    <span className="material-icons text-sm mr-1">filter_list</span>
                    Filter
                  </button>
                  <button className="px-3 py-1 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200">
                    <span className="material-icons text-sm mr-1">sort</span>
                    Sort
                  </button>
                </div>
              </div>
              
              {isLoadingAudits ? (
                <div className="px-6 py-12 text-center text-neutral-500">
                  Loading pending audits...
                </div>
              ) : pendingAudits && pendingAudits.length > 0 ? (
                pendingAudits.slice(0, 4).map(audit => (
                  <AuditItem 
                    key={audit.id} 
                    audit={audit} 
                    onSelect={handleAuditSelect} 
                  />
                ))
              ) : (
                <div className="px-6 py-12 text-center text-neutral-500">
                  No pending audits found
                </div>
              )}
              
              <div className="px-6 py-4">
                <button className="text-blue-600 font-medium flex items-center text-sm hover:underline">
                  <span>View all pending audits</span>
                  <span className="material-icons text-sm ml-1">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Activity Panel */}
          <div className="lg:col-span-1 space-y-6">
            <PerformanceChart />
            <LiveAuditLog />
          </div>
        </div>
      </main>
      
      {/* Audit Detail Modal */}
      <AuditDetailModal 
        audit={selectedAudit} 
        isOpen={isModalOpen} 
        onClose={closeModal}
      />
    </>
  );
}
