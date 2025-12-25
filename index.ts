import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { deviceUpdateMessageSchema, type DeviceUpdateMessage, type Light, type Tv } from "@shared/schema";
import { createApp } from "./app";
import { setupVite, serveStatic } from "./vite";
import { log } from "./logger";

(async () => {
  const httpServer = createServer();

  // WebSocket server on /ws path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received message:", data);
      } catch (error) {
        console.error("Invalid WebSocket message:", error);
      }
    });

    
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Helper function to broadcast device updates
  function broadcastDeviceUpdate(
    type: "light_update" | "tv_update",
    deviceId: string,
    data: Light | Tv,
  ) {
    try {
      const message: DeviceUpdateMessage = {
        type,
        deviceId,
        data,
      };

      // Validate message against schema
      const validatedMessage = deviceUpdateMessageSchema.parse(message);
      const messageStr = JSON.stringify(validatedMessage);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(messageStr);
          } catch (error) {
            console.error("Failed to send WebSocket message to client:", error);
          }
        }
      });
    } catch (error) {
      console.error("Failed to create valid WebSocket message:", error);
    }
  }

  const app = await createApp({ broadcastDeviceUpdate });
  httpServer.on("request", app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
