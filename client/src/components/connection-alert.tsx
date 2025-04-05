import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function ConnectionAlert() {
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    // Set up WebSocket connection monitoring
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Make sure we're using the correct port and path
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    
    const connectWebSocket = () => {
      if (ws) {
        ws.close();
      }
      
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsDisconnected(false);
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };
      
      ws.onclose = () => {
        setIsDisconnected(true);
        // Try to reconnect after a short delay
        reconnectTimer = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
      
      ws.onerror = () => {
        setIsDisconnected(true);
        ws?.close();
      };
    };
    
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  if (!isDisconnected) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-50">
      <WifiOff className="h-4 w-4 mr-2" />
      <span>You are offline. Reconnecting...</span>
    </div>
  );
}
