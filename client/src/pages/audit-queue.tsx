import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import AuditItem from "@/components/audit-item";
import AuditDetailModal from "@/components/audit-detail-modal";
import { Audit } from "@shared/schema";

export default function AuditQueue() {
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch pending audits
  const { data: pendingAudits, isLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits/pending"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch pending audits');
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
      <Header title="Audit Queue" />
      
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-4 px-4 md:px-6">
        <div className="my-6">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-neutral-200 flex flex-col md:flex-row justify-between md:items-center">
              <h3 className="font-medium text-lg mb-2 md:mb-0">Pending Audits</h3>
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
                
                <button className="px-3 py-2 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200">
                  <span className="material-icons text-sm mr-1">filter_list</span>
                  Filter
                </button>
                
                <button className="px-3 py-2 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200">
                  <span className="material-icons text-sm mr-1">sort</span>
                  Sort
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="px-6 py-12 text-center text-neutral-500">
                Loading pending audits...
              </div>
            ) : pendingAudits && pendingAudits.length > 0 ? (
              pendingAudits.map(audit => (
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
