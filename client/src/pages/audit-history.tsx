import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import AuditDetailModal from "@/components/audit-detail-modal";
import { Audit } from "@shared/schema";
import { format } from "date-fns";

export default function AuditHistory() {
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // In a real implementation, we'd have a separate endpoint for completed audits
  // For now, we're reusing the existing endpoint
  const { data: audits, isLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits/pending"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch audits');
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

  // Function to get priority badge style
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <span className="ml-2 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">Urgent</span>;
      case "high":
        return <span className="ml-2 px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded-full">High Priority</span>;
      case "normal":
        return <span className="ml-2 px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full">Normal</span>;
      case "low":
        return <span className="ml-2 px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full">Low</span>;
      default:
        return null;
    }
  };

  // Function to get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">Pending Review</span>;
      case "approved":
        return <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded">Approved</span>;
      case "rejected":
        return <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">Rejected</span>;
      case "needs_info":
        return <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded">Documentation Needed</span>;
      default:
        return null;
    }
  };

  // Format dates
  const formatDate = (date: Date | string) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  // Filter audits based on selected status
  const filteredAudits = audits ? audits.filter(audit => 
    filterStatus ? audit.status === filterStatus : true
  ) : [];

  return (
    <>
      <Header title="Audit History" />
      
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-4 px-4 md:px-6">
        <div className="my-6">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-neutral-200 flex flex-col md:flex-row justify-between md:items-center">
              <h3 className="font-medium text-lg mb-2 md:mb-0">Audit History</h3>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="material-icons text-neutral-400 text-sm">search</span>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search audits..." 
                    className="py-2 pl-10 pr-4 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <select 
                  className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterStatus || ''}
                  onChange={(e) => setFilterStatus(e.target.value || null)}
                >
                  <option value="">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="needs_info">Needs Documentation</option>
                  <option value="pending">Pending</option>
                </select>
                
                <button className="px-3 py-2 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200">
                  <span className="material-icons text-sm mr-1">date_range</span>
                  Date Range
                </button>
                
                <button className="px-3 py-2 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200">
                  <span className="material-icons text-sm mr-1">download</span>
                  Export
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="px-6 py-12 text-center text-neutral-500">
                Loading audit history...
              </div>
            ) : filteredAudits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Audit Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {filteredAudits.map((audit) => (
                      <tr 
                        key={audit.id} 
                        className="hover:bg-neutral-50 cursor-pointer"
                        onClick={() => handleAuditSelect(audit)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {audit.auditNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {audit.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getStatusBadge(audit.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getPriorityBadge(audit.priority)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {formatDate(audit.submittedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          <button 
                            className="text-blue-600 hover:text-blue-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAuditSelect(audit);
                            }}
                          >
                            <span className="material-icons">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-neutral-500">
                No audits found matching your filters
              </div>
            )}
            
            {/* Pagination */}
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-between items-center">
              <div className="text-sm text-neutral-500">
                Showing <span className="font-medium">{filteredAudits.length}</span> results
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-2 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50 disabled:opacity-50" disabled>
                  Previous
                </button>
                <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                  1
                </button>
                <button className="px-3 py-2 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50">
                  2
                </button>
                <button className="px-3 py-2 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50">
                  Next
                </button>
              </div>
            </div>
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
