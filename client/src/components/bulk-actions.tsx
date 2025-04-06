import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Audit } from "@shared/schema";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock, User } from "lucide-react";

interface BulkActionsProps {
  selectedAudits: Audit[];
  onClose: () => void;
  onClearSelection: () => void;
}

type ActionType = "approve" | "reject" | "request_info" | "set_priority" | "assign";

export default function BulkActions({ selectedAudits, onClose, onClearSelection }: BulkActionsProps) {
  const [action, setAction] = useState<ActionType>("approve");
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assignedToId, setAssignedToId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch users for assignment
  const usersData = useQueryClient().getQueryData<any[]>(["/api/users"]) || [];
  const users = usersData;

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (data: {
      auditIds: number[];
      action: ActionType;
      comment?: string;
      priority?: string;
      assignedToId?: number;
    }) => {
      const res = await apiRequest("POST", "/api/audits/bulk-action", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bulk action successful",
        description: `Successfully processed ${selectedAudits.length} audit(s)`
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/audits/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/recent"] });
      
      onClearSelection();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Action failed",
        description: `Failed to perform bulk action: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    const auditIds = selectedAudits.map(audit => audit.id);
    
    const payload: any = {
      auditIds,
      action,
    };
    
    // Add action-specific data
    if (comment.trim()) {
      payload.comment = comment.trim();
    }
    
    if (action === "set_priority") {
      payload.priority = priority;
    }
    
    if (action === "assign" && assignedToId) {
      payload.assignedToId = assignedToId;
    }
    
    bulkActionMutation.mutate(payload);
  };

  const renderActionFields = () => {
    switch (action) {
      case "approve":
      case "reject":
      case "request_info":
        return (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Comment</label>
            <textarea
              rows={3}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a comment for this action..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={bulkActionMutation.isPending}
            ></textarea>
          </div>
        );
        
      case "set_priority":
        return (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Priority</label>
            <select
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={bulkActionMutation.isPending}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <div className="mt-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Comment (Optional)</label>
              <textarea
                rows={2}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a comment for this change..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={bulkActionMutation.isPending}
              ></textarea>
            </div>
          </div>
        );
        
      case "assign":
        return (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Assign to</label>
            <select
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={assignedToId || ""}
              onChange={(e) => setAssignedToId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={bulkActionMutation.isPending}
            >
              <option value="">-- Select a user --</option>
              {users?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.role})
                </option>
              ))}
            </select>
            <div className="mt-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Comment (Optional)</label>
              <textarea
                rows={2}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a comment for this assignment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={bulkActionMutation.isPending}
              ></textarea>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case "approve":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "reject":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "request_info":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "set_priority":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "assign":
        return <User className="h-5 w-5 text-indigo-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-xl">
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="font-medium text-lg flex items-center">
              {getActionIcon()}
              <span className="ml-2">Bulk Action</span>
            </h3>
            <button className="p-1 rounded-full hover:bg-neutral-100" onClick={onClose}>
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="text-sm text-neutral-600 mb-2">
                Selected <span className="font-semibold">{selectedAudits.length}</span> audit(s)
              </div>
              
              <div className="max-h-32 overflow-y-auto p-2 bg-neutral-50 rounded border border-neutral-200 text-sm">
                {selectedAudits.map(audit => (
                  <div key={audit.id} className="mb-1">
                    <span className="font-medium">{audit.auditNumber}</span>: {audit.title}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Action</label>
                <select
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={action}
                  onChange={(e) => setAction(e.target.value as ActionType)}
                  disabled={bulkActionMutation.isPending}
                >
                  <option value="approve">Approve Audits</option>
                  <option value="reject">Reject Audits</option>
                  <option value="request_info">Request Additional Information</option>
                  <option value="set_priority">Change Priority</option>
                  <option value="assign">Assign to User</option>
                </select>
              </div>
              
              {renderActionFields()}
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end space-x-3">
            <button
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 disabled:opacity-50"
              onClick={onClose}
              disabled={bulkActionMutation.isPending}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              onClick={handleSubmit}
              disabled={bulkActionMutation.isPending || (action === "assign" && !assignedToId)}
            >
              {bulkActionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Apply to Selected'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}