import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuditEvent, User } from "@shared/schema";

interface LiveAuditLogProps {
  className?: string;
}

interface EnrichedAuditEvent extends AuditEvent {
  userName?: string;
  auditNumber?: string;
}

export default function LiveAuditLog({ className = "" }: LiveAuditLogProps) {
  const [events, setEvents] = useState<EnrichedAuditEvent[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  // Fetch initial audit events
  const { data: initialEvents } = useQuery<AuditEvent[]>({
    queryKey: ["/api/events/recent"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch recent events');
      }
      return response.json();
    },
  });

  // Set up WebSocket connection
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Make sure we're using the correct port and path
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    console.log("Connecting to WebSocket at:", wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "INITIAL_EVENTS") {
          setEvents(data.events);
        } else if (data.type === "AUDIT_UPDATED" || data.type === "AUDIT_CREATED") {
          // Add new event to the list
          setEvents(prev => [data.event, ...prev].slice(0, 10));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        setSocket(null);
      }, 3000);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };
    
    setSocket(ws);
    
    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 30000);
    
    // Clean up on unmount
    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, []);

  // Update events when initialEvents changes
  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Helper function to render the event icon based on event type
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "approved":
        return (
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white">
            <span className="material-icons text-sm">check_circle</span>
          </div>
        );
      case "rejected":
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
            <span className="material-icons text-sm">cancel</span>
          </div>
        );
      case "requested_info":
        return (
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white">
            <span className="material-icons text-sm">comment</span>
          </div>
        );
      case "created":
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
            <span className="material-icons text-sm">add_circle</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-neutral-400 rounded-full flex items-center justify-center text-white">
            <span className="material-icons text-sm">update</span>
          </div>
        );
    }
  };

  // Helper function to get human-readable time
  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour < 24) return `${diffHour} hours ago`;
    return eventTime.toLocaleDateString();
  };

  // Helper function to get user-friendly event text
  const getEventText = (event: AuditEvent) => {
    switch (event.eventType) {
      case "approved":
        return "approved audit";
      case "rejected":
        return "rejected audit";
      case "requested_info":
        return "requested additional info for";
      case "created":
        return "created audit";
      default:
        return "updated audit";
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-lg">Live Audit Log</h3>
        <span className="flex items-center text-xs text-green-600">
          <span className={`w-2 h-2 ${connected ? 'bg-green-600 animate-pulse' : 'bg-neutral-400'} rounded-full mr-1`}></span>
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>
      
      {events.length === 0 ? (
        <div className="px-6 py-8 text-center text-neutral-500">
          No audit activity yet
        </div>
      ) : (
        events.map((event, index) => (
          <div key={event.id || index} className="px-6 py-4 border-b border-neutral-200">
            <div className="flex">
              <div className="mr-4 flex-shrink-0">
                {getEventIcon(event.eventType)}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium">{event.userName || `User #${event.userId}`}</span> 
                  <span> {getEventText(event)} </span> 
                  <span className="font-medium">#{event.auditNumber || `A-${event.auditId}`}</span>
                </p>
                {event.comment && (
                  <p className="text-xs text-neutral-600 mt-1 italic">"{event.comment}"</p>
                )}
                <p className="text-xs text-neutral-500 mt-1">{getTimeAgo(event.timestamp)}</p>
              </div>
            </div>
          </div>
        ))
      )}
      
      <div className="px-6 py-4">
        <button className="text-blue-600 font-medium flex items-center text-sm hover:underline">
          <span>View all activity</span>
          <span className="material-icons text-sm ml-1">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
