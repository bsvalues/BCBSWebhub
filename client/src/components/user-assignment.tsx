import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Audit, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface UserAssignmentProps {
  audit: Audit;
  onClose?: () => void;
}

export default function UserAssignment({ audit, onClose }: UserAssignmentProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(audit.assignedToId || null);
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users for assignment
  const { data: users, isLoading: isLoadingUsers } = useQuery<Pick<User, 'id' | 'username' | 'fullName' | 'role'>[]>({
    queryKey: ["/api/users"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async ({ auditId, assignedToId, comment }: { auditId: number, assignedToId: number, comment?: string }) => {
      const res = await apiRequest("POST", `/api/audits/${auditId}/assign`, { assignedToId, comment });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Audit assigned",
        description: "The audit has been assigned successfully."
      });
      
      // Invalidate all audit queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/audits/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/created"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/recent"] });
      
      // Close the modal if callback provided
      if (onClose) onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to assign audit: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleAssign = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to assign",
        variant: "destructive"
      });
      return;
    }

    assignMutation.mutate({
      auditId: audit.id,
      assignedToId: selectedUserId,
      comment: comment.trim() || undefined
    });
  };

  // If the audit assignment changes externally, update the local state
  useEffect(() => {
    setSelectedUserId(audit.assignedToId || null);
  }, [audit.assignedToId]);

  return (
    <div className="mt-4 space-y-4">
      <h5 className="font-medium mb-2">Assign Audit</h5>
      
      {isLoadingUsers ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span>Loading users...</span>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Assign to
            </label>
            <select
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={assignMutation.isPending}
            >
              <option value="">-- Select a user --</option>
              {users?.map(user => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.role})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="assignmentComment" className="block text-sm font-medium text-neutral-700 mb-1">
              Assignment Note (optional)
            </label>
            <textarea
              id="assignmentComment"
              rows={2}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes about this assignment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={assignMutation.isPending}
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-3 pt-2">
            {onClose && (
              <button
                type="button"
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50"
                onClick={onClose}
                disabled={assignMutation.isPending}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              onClick={handleAssign}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign
            </button>
          </div>
        </>
      )}
    </div>
  );
}