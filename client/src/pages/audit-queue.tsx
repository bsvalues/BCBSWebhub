import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/header";
import AuditItem from "@/components/audit-item";
import AuditDetailModal from "@/components/audit-detail-modal";
import BulkActions from "@/components/bulk-actions";
import AdvancedSearch from "@/components/advanced-search";
import { Audit } from "@shared/schema";
import { PlusCircle, CheckSquare, Square, Filter, Search, X } from "lucide-react";

export default function AuditQueue() {
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAudits, setSelectedAudits] = useState<Audit[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Audit[] | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [_, setLocation] = useLocation();

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
  
  const navigateToCreateAudit = () => {
    setLocation("/create-audit");
  };
  
  const handleSelectAudit = (audit: Audit) => {
    if (selectedAudits.some(a => a.id === audit.id)) {
      setSelectedAudits(selectedAudits.filter(a => a.id !== audit.id));
    } else {
      setSelectedAudits([...selectedAudits, audit]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedAudits.length === filteredAudits.length) {
      setSelectedAudits([]);
    } else {
      setSelectedAudits([...filteredAudits]);
    }
  };
  
  const handleBulkAction = () => {
    setIsBulkModalOpen(true);
  };
  
  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
  };
  
  const clearSelection = () => {
    setSelectedAudits([]);
  };
  
  const isSelected = (audit: Audit) => {
    return selectedAudits.some(a => a.id === audit.id);
  };
  
  // Handle opening advanced search modal
  const openAdvancedSearch = () => {
    setIsAdvancedSearchOpen(true);
  };
  
  // Handle closing advanced search modal
  const closeAdvancedSearch = () => {
    setIsAdvancedSearchOpen(false);
  };
  
  // Handle search results from advanced search
  const handleSearchResults = (results: Audit[]) => {
    setSearchResults(results);
    setIsAdvancedSearchOpen(false);
  };
  
  // Clear search results and return to normal pending audits view
  const clearSearchResults = () => {
    setSearchResults(null);
  };
  
  // Filter and search audits
  const filteredAudits = searchResults || (pendingAudits || []).filter(audit => {
    // Filter by priority
    if (filterPriority && audit.priority !== filterPriority) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !audit.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !audit.auditNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !audit.propertyId.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <>
      <Header title="Audit Queue" />
      
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-4 px-4 md:px-6">
        <div className="flex justify-between items-center my-6">
          <h2 className="text-2xl font-bold">Audit Queue</h2>
          <button 
            onClick={navigateToCreateAudit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Audit
          </button>
        </div>
        <div className="my-6">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-neutral-200 flex flex-col md:flex-row justify-between md:items-center">
              <div className="flex items-center">
                <button 
                  onClick={handleSelectAll}
                  className="p-1 mr-2 hover:bg-neutral-100 rounded"
                  title={selectedAudits.length === filteredAudits.length ? "Deselect all" : "Select all"}
                >
                  {selectedAudits.length === filteredAudits.length && filteredAudits.length > 0 ? (
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Square className="h-5 w-5 text-neutral-400" />
                  )}
                </button>
                <h3 className="font-medium text-lg">Pending Audits</h3>
                {selectedAudits.length > 0 && (
                  <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {selectedAudits.length} selected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="material-icons text-neutral-400 text-sm">search</span>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search audits..." 
                    className="py-2 pl-10 pr-4 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <button 
                    className="px-3 py-2 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200"
                    onClick={() => document.getElementById("priorityDropdown")?.classList.toggle("hidden")}
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    {filterPriority ? `Priority: ${filterPriority}` : "Filter"}
                  </button>
                  <div 
                    id="priorityDropdown" 
                    className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-neutral-200 w-48 z-10 hidden"
                  >
                    <div className="p-2">
                      <div className="text-xs font-medium text-neutral-500 mb-1">Priority</div>
                      <div className="space-y-1">
                        <div 
                          className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                          onClick={() => {
                            setFilterPriority(null);
                            document.getElementById("priorityDropdown")?.classList.add("hidden");
                          }}
                        >
                          All
                        </div>
                        <div 
                          className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                          onClick={() => {
                            setFilterPriority("urgent");
                            document.getElementById("priorityDropdown")?.classList.add("hidden");
                          }}
                        >
                          Urgent
                        </div>
                        <div 
                          className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                          onClick={() => {
                            setFilterPriority("high");
                            document.getElementById("priorityDropdown")?.classList.add("hidden");
                          }}
                        >
                          High
                        </div>
                        <div 
                          className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                          onClick={() => {
                            setFilterPriority("normal");
                            document.getElementById("priorityDropdown")?.classList.add("hidden");
                          }}
                        >
                          Normal
                        </div>
                        <div 
                          className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                          onClick={() => {
                            setFilterPriority("low");
                            document.getElementById("priorityDropdown")?.classList.add("hidden");
                          }}
                        >
                          Low
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="px-3 py-2 bg-neutral-100 rounded-md text-sm flex items-center hover:bg-neutral-200"
                  onClick={openAdvancedSearch}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Advanced Search
                </button>
                
                {searchResults && (
                  <button 
                    className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm flex items-center hover:bg-red-100"
                    onClick={clearSearchResults}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Results
                  </button>
                )}
                
                {selectedAudits.length > 0 && (
                  <button 
                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm flex items-center hover:bg-blue-700"
                    onClick={handleBulkAction}
                  >
                    Bulk Actions
                  </button>
                )}
              </div>
            </div>
            
            {isLoading ? (
              <div className="px-6 py-12 text-center text-neutral-500">
                Loading pending audits...
              </div>
            ) : filteredAudits.length > 0 ? (
              <div>
                {filteredAudits.map(audit => (
                  <div key={audit.id} className="flex items-center">
                    <div className="pl-4 pr-2 py-3">
                      <div
                        className="cursor-pointer"
                        onClick={() => handleSelectAudit(audit)}
                      >
                        {isSelected(audit) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-neutral-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <AuditItem 
                        key={audit.id} 
                        audit={audit} 
                        onSelect={handleAuditSelect} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-neutral-500">
                {pendingAudits && pendingAudits.length > 0 
                  ? "No audits match your filters" 
                  : "No pending audits found"}
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
      
      {/* Bulk Actions Modal */}
      {isBulkModalOpen && (
        <BulkActions 
          selectedAudits={selectedAudits}
          onClose={closeBulkModal}
          onClearSelection={clearSelection}
        />
      )}
      
      {/* Advanced Search Modal */}
      {isAdvancedSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto">
            <AdvancedSearch 
              onSearch={handleSearchResults}
              onClose={closeAdvancedSearch}
            />
          </div>
        </div>
      )}
      
      {/* Search results notification */}
      {searchResults && (
        <div className="fixed bottom-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-10 max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Search Results
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                Showing {searchResults.length} audit{searchResults.length !== 1 ? 's' : ''} matching your search criteria.
              </div>
            </div>
            <button 
              onClick={clearSearchResults}
              className="ml-auto bg-blue-100 text-blue-800 hover:bg-blue-200 p-1 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
