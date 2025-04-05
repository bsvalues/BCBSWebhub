import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Audit } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import UserAssignment from "./user-assignment";
import CommentForm from "./comment-form";
import AuditEventsList from "./audit-events-list";
import DocumentUpload from "./document-upload";
import AuditExport from "./audit-export";

interface AuditDetailModalProps {
  audit: Audit | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditDetailModal({ audit, isOpen, onClose }: AuditDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Decision mutation
  const decisionMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: number, status: string, comment?: string }) => {
      const res = await apiRequest("POST", `/api/audits/${id}/decision`, { status, comment });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Decision submitted",
        description: "The audit has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/recent"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to submit decision: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  if (!isOpen || !audit) return null;

  const handleDecision = (status: "approved" | "rejected" | "needs_info" | "in_progress") => {
    decisionMutation.mutate({
      id: audit.id,
      status,
      comment: comment.trim() || undefined
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "MMM d, yyyy, h:mm a");
  };

  const calculateDifference = () => {
    const diff = audit.proposedAssessment - audit.currentAssessment;
    const percentage = ((diff / audit.currentAssessment) * 100).toFixed(1);
    return {
      value: formatCurrency(diff),
      percentage: `${percentage}%`,
      isNegative: diff < 0
    };
  };

  const difference = calculateDifference();

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "pending":
        return <span className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded">Pending Review</span>;
      case "in_progress":
        return <span className="text-sm bg-indigo-50 text-indigo-600 px-2 py-1 rounded">In Progress</span>;
      case "approved":
        return <span className="text-sm bg-green-50 text-green-600 px-2 py-1 rounded">Approved</span>;
      case "rejected":
        return <span className="text-sm bg-red-50 text-red-600 px-2 py-1 rounded">Rejected</span>;
      case "needs_info":
        return <span className="text-sm bg-yellow-50 text-yellow-600 px-2 py-1 rounded">Documentation Needed</span>;
      default:
        return <span className="text-sm bg-neutral-50 text-neutral-600 px-2 py-1 rounded">{status}</span>;
    }
  };

  // Add function to restart an audit (changing status back to in_progress)
  const handleRestartAudit = () => {
    decisionMutation.mutate({
      id: audit.id,
      status: "in_progress",
      comment: "Audit restarted"
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Modal header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="font-medium text-lg">Audit Detail {audit.auditNumber}</h3>
            <button className="p-1 rounded-full hover:bg-neutral-100" onClick={onClose}>
              <span className="material-icons">close</span>
            </button>
          </div>
          
          {/* Modal content */}
          <div className="overflow-y-auto flex-1 p-6">
            {/* Basic info */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
              <div>
                <div className="flex items-center">
                  <h4 className="font-medium text-xl">{audit.title}</h4>
                  {audit.priority === "high" && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded-full">High Priority</span>
                  )}
                  {audit.priority === "urgent" && (
                    <span className="ml-2 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">Urgent</span>
                  )}
                </div>
                <p className="mt-1 text-neutral-600">{audit.description}</p>
                
                {/* Add restart button for rejected or needs_info audits */}
                {(audit.status === "rejected" || audit.status === "needs_info") && (
                  <button 
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleRestartAudit}
                    disabled={decisionMutation.isPending}
                  >
                    <span className="material-icons text-sm mr-1">refresh</span>
                    {audit.status === "rejected" ? "Restart Audit" : "Process Requested Info"}
                  </button>
                )}
              </div>
              <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
                {getStatusBadge(audit.status)}
                <span className="mt-2 text-sm text-neutral-500">Due: {formatDate(audit.dueDate)}</span>
                {audit.assignedToId && (
                  <span className="mt-2 text-sm text-neutral-500">Assigned to: ID {audit.assignedToId}</span>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-neutral-200">
              <div className="flex flex-wrap space-x-4 md:space-x-8">
                <button 
                  className={`px-1 py-2 border-b-2 ${activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-600 hover:text-neutral-900"} font-medium`}
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </button>
                <button 
                  className={`px-1 py-2 border-b-2 ${activeTab === "assignment" ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-600 hover:text-neutral-900"} font-medium`}
                  onClick={() => setActiveTab("assignment")}
                >
                  Assignment
                </button>
                <button 
                  className={`px-1 py-2 border-b-2 ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-600 hover:text-neutral-900"} font-medium`}
                  onClick={() => setActiveTab("history")}
                >
                  History
                </button>
                <button 
                  className={`px-1 py-2 border-b-2 ${activeTab === "comments" ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-600 hover:text-neutral-900"} font-medium`}
                  onClick={() => setActiveTab("comments")}
                >
                  Comments
                </button>
                <button 
                  className={`px-1 py-2 border-b-2 ${activeTab === "documents" ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-600 hover:text-neutral-900"} font-medium`}
                  onClick={() => setActiveTab("documents")}
                >
                  Documents
                </button>
                <button 
                  className={`px-1 py-2 border-b-2 ${activeTab === "export" ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-600 hover:text-neutral-900"} font-medium`}
                  onClick={() => setActiveTab("export")}
                >
                  Export
                </button>
              </div>
            </div>
            
            {/* Tab content */}
            {activeTab === "overview" && (
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Submission details */}
                  <div>
                    <h5 className="font-medium mb-4">Submission Details</h5>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-neutral-500">Submitted By</span>
                        <span className="font-medium">ID: {audit.submittedById}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-neutral-500">Submission Date</span>
                        <span className="font-medium">{formatDate(audit.submittedAt)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-neutral-500">Property ID</span>
                        <span className="font-medium">{audit.propertyId}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-neutral-500">Address</span>
                        <span className="font-medium">{audit.address}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Assessment details */}
                  <div>
                    <h5 className="font-medium mb-4">Assessment Changes</h5>
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-neutral-600">Current Assessment</span>
                        <span className="font-medium">{formatCurrency(audit.currentAssessment)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-neutral-600">Proposed Assessment</span>
                        <span className="font-medium">{formatCurrency(audit.proposedAssessment)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-neutral-600">Difference</span>
                        <span className={`font-medium ${difference.isNegative ? "text-red-600" : "text-green-600"}`}>
                          {difference.value} ({difference.percentage})
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-neutral-600">Tax Impact</span>
                        <span className={`font-medium ${audit.taxImpact && audit.taxImpact < 0 ? "text-red-600" : "text-green-600"}`}>
                          {audit.taxImpact ? formatCurrency(audit.taxImpact) + "/year" : "N/A"}
                        </span>
                      </div>
                    </div>
                    
                    <h5 className="font-medium mt-6 mb-2">Reason for Amendment</h5>
                    <p className="text-sm text-neutral-700">{audit.reason || "No reason provided."}</p>
                  </div>
                </div>
                
                {/* Decision section - show based on status */}
                {(audit.status === "pending" || audit.status === "in_progress" || audit.status === "needs_info") && (
                  <div className="mt-8 border-t border-neutral-200 pt-6">
                    <h5 className="font-medium mb-4">Audit Decision</h5>
                    <div className="flex flex-col space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Decision</label>
                        <div className="flex flex-wrap gap-4">
                          <button 
                            className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700 disabled:opacity-50"
                            onClick={() => handleDecision("approved")}
                            disabled={decisionMutation.isPending}
                          >
                            <span className="material-icons text-sm mr-1">check</span>
                            Approve
                          </button>
                          <button 
                            className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center hover:bg-red-700 disabled:opacity-50"
                            onClick={() => handleDecision("rejected")}
                            disabled={decisionMutation.isPending}
                          >
                            <span className="material-icons text-sm mr-1">close</span>
                            Reject
                          </button>
                          <button 
                            className="px-4 py-2 bg-yellow-500 text-white rounded-md flex items-center hover:bg-yellow-600 disabled:opacity-50"
                            onClick={() => handleDecision("needs_info")}
                            disabled={decisionMutation.isPending}
                          >
                            <span className="material-icons text-sm mr-1">info</span>
                            Request Info
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="comments" className="block text-sm font-medium text-neutral-700 mb-1">Comments</label>
                        <textarea 
                          id="comments" 
                          rows={3} 
                          className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="Add your comments or notes about this decision..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          disabled={decisionMutation.isPending}
                        ></textarea>
                      </div>
                      
                      <div className="flex items-center justify-end space-x-3">
                        <button 
                          className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 disabled:opacity-50"
                          onClick={onClose}
                          disabled={decisionMutation.isPending}
                        >
                          Cancel
                        </button>
                        {decisionMutation.isPending && (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                            <span className="text-sm text-neutral-500">Processing...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "assignment" && (
              <div className="mt-6">
                <UserAssignment audit={audit} />
              </div>
            )}
            
            {activeTab === "history" && (
              <div className="mt-6">
                <AuditEventsList auditId={audit.id} />
              </div>
            )}
            
            {activeTab === "comments" && (
              <div className="mt-6">
                <div className="mb-6">
                  <CommentForm auditId={audit.id} />
                </div>
                <div className="border-t border-neutral-200 pt-4">
                  <h5 className="font-medium mb-4">Comments History</h5>
                  <AuditEventsList auditId={audit.id} />
                </div>
              </div>
            )}
            
            {activeTab === "documents" && (
              <div className="mt-6">
                <DocumentUpload auditId={audit.id} />
              </div>
            )}
            
            {activeTab === "export" && (
              <div className="mt-6">
                <AuditExport audit={audit} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
