import { useQuery } from "@tanstack/react-query";
import { AuditEvent, User } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface AuditEventsListProps {
  auditId: number;
}

export default function AuditEventsList({ auditId }: AuditEventsListProps) {
  // Fetch events for the audit
  const { data: events, isLoading } = useQuery<AuditEvent[]>({
    queryKey: [`/api/audits/${auditId}/events`],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch audit events');
      }
      return response.json();
    },
  });

  const getEventIcon = (eventType: string) => {
    switch(eventType) {
      case "created":
        return <span className="material-icons text-blue-500">add_circle</span>;
      case "approved":
        return <span className="material-icons text-green-500">check_circle</span>;
      case "rejected":
        return <span className="material-icons text-red-500">cancel</span>;
      case "requested_info":
        return <span className="material-icons text-yellow-500">info</span>;
      case "in_progress":
        return <span className="material-icons text-blue-500">pending</span>;
      case "comment":
        return <span className="material-icons text-neutral-500">comment</span>;
      case "assigned":
        return <span className="material-icons text-indigo-500">person_add</span>;
      default:
        return <span className="material-icons text-neutral-500">event_note</span>;
    }
  };

  const getEventLabel = (event: AuditEvent) => {
    switch(event.eventType) {
      case "created":
        return "Audit created";
      case "approved":
        return "Audit approved";
      case "rejected":
        return "Audit rejected";
      case "requested_info":
        return "Additional information requested";
      case "in_progress":
        return "Audit marked as in progress";
      case "comment":
        return "Comment added";
      case "assigned":
        const changes = event.changes as { before: { assignedToId: number | null }, after: { assignedToId: number } };
        return changes.before.assignedToId 
          ? "Audit reassigned"
          : "Audit assigned";
      default:
        return "Status changed";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span>Loading audit history...</span>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center p-8 text-neutral-500">
        No events found for this audit.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <ul className="space-y-4">
        {events.map((event) => (
          <li key={event.id} className="border-b border-neutral-200 pb-4">
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                {getEventIcon(event.eventType)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h5 className="font-medium text-neutral-800">{getEventLabel(event)}</h5>
                  <span className="text-sm text-neutral-500">
                    {format(new Date(event.timestamp), "MMM d, yyyy, h:mm a")}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mt-1">
                  User ID: {event.userId}
                </p>
                {event.comment && (
                  <p className="mt-2 text-neutral-700 bg-neutral-50 p-2 rounded">
                    {event.comment}
                  </p>
                )}
                {event.eventType === "assigned" && event.changes && (
                  <p className="text-sm text-neutral-600 mt-1">
                    Assigned to user ID: {(event.changes as any).after.assignedToId}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}