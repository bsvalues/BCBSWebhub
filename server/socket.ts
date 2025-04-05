import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

// Extend WebSocketServer type to include custom methods
interface CustomWebSocketServer extends WebSocketServer {
  customEmit(event: string, data: any): void;
}

// Extend global scope to store the WebSocket server
declare global {
  var io: CustomWebSocketServer | undefined;
}

export function setupWebSocketServer(wss: WebSocketServer): CustomWebSocketServer {
  // Store the WebSocket server globally so it can be accessed from routes
  const customWss = wss as CustomWebSocketServer;
  
  // Add custom emit method to broadcast events
  customWss.customEmit = function(event: string, data: any) {
    customWss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event,
          data
        }));
      }
    });
  };
  
  global.io = customWss;
  
  customWss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");
    
    // Send initial data to the client
    const initialData = async () => {
      try {
        // Send recent audit events
        const recentEvents = await storage.getRecentAuditEvents(5);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "INITIAL_EVENTS",
            events: recentEvents
          }));
        }
      } catch (error) {
        console.error("Error sending initial data:", error);
      }
    };
    
    initialData();
    
    // Handle incoming messages from client
    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);
        console.log("Received message:", message);
        
        // Handle ping messages to keep connection alive
        if (message.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });
    
    // Handle client disconnect
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
  
  return customWss;
}
