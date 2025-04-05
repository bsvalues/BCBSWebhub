import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Audit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface CommentFormProps {
  auditId: number;
}

export default function CommentForm({ auditId }: CommentFormProps) {
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ auditId, comment }: { auditId: number, comment: string }) => {
      const res = await apiRequest("POST", `/api/audits/${auditId}/comments`, { comment });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully."
      });
      
      // Clear the comment field
      setComment("");
      
      // Invalidate the events query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/audits/${auditId}/events`] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/recent"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add comment: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    commentMutation.mutate({
      auditId,
      comment: comment.trim()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-3">
        <label htmlFor="comment" className="block text-sm font-medium text-neutral-700 mb-1">
          Add Comment
        </label>
        <textarea
          id="comment"
          rows={3}
          className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add your comments or notes about this audit..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={commentMutation.isPending}
        ></textarea>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          disabled={commentMutation.isPending}
        >
          {commentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Add Comment
        </button>
      </div>
    </form>
  );
}