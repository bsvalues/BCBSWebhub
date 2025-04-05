import { Audit } from "@shared/schema";
import { format } from "date-fns";

interface AuditItemProps {
  audit: Audit;
  onSelect: (audit: Audit) => void;
}

export default function AuditItem({ audit, onSelect }: AuditItemProps) {
  // Function to get priority badge style
  const getPriorityBadge = () => {
    switch (audit.priority) {
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
  const getStatusBadge = () => {
    switch (audit.status) {
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

  // Function to get priority icon
  const getPriorityIcon = () => {
    if (audit.priority === "urgent" || audit.priority === "high") {
      return <span className="material-icons text-sm mr-1 text-yellow-600">priority_high</span>;
    }
    return null;
  };

  // Format dates
  const formatDate = (date: Date | string) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <div 
      className="px-6 py-4 border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer" 
      onClick={() => onSelect(audit)}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            {getPriorityIcon()}
            <h4 className="font-medium">{audit.auditNumber}</h4>
            {getPriorityBadge()}
          </div>
          <p className="mt-1 text-sm text-neutral-600">{audit.description}</p>
          <div className="mt-2 flex items-center text-xs text-neutral-500">
            <span className="material-icons text-xs mr-1">calendar_today</span>
            <span>Submitted: {formatDate(audit.submittedAt)}</span>
            <span className="mx-2">•</span>
            <span className="material-icons text-xs mr-1">person</span>
            <span>By: {audit.submittedById}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          {getStatusBadge()}
          <span className="mt-2 text-xs text-neutral-500">Due: {formatDate(audit.dueDate)}</span>
        </div>
      </div>
    </div>
  );
}
