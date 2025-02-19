import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { BatchRequest } from '@shared/schema';

// Add type extension for WebSocket
declare module 'ws' {
  interface WebSocket {
    isAlive: boolean;
  }
}

interface WebSocketMessage {
  type: 'BATCH_UPDATE' | 'PING';
  data?: BatchRequest;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<number, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/batch-updates',
      clientTracking: true,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
      }
    });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection established');
      
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
            return;
          }
          
          if (parsed.type === 'SUBSCRIBE_BATCH' && typeof parsed.batchId === 'number') {
            this.subscribeToBatch(ws, parsed.batchId);
            console.log(`Client subscribed to batch ${parsed.batchId}`);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
        console.log('Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });

    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log('Terminating stale connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private subscribeToBatch(ws: WebSocket, batchId: number) {
    if (!this.clients.has(batchId)) {
      this.clients.set(batchId, new Set());
    }
    this.clients.get(batchId)?.add(ws);
  }

  private removeClient(ws: WebSocket) {
    for (const [batchId, clients] of this.clients.entries()) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(batchId);
      }
    }
  }

  public notifyBatchUpdate(batchId: number, batch: BatchRequest) {
    // Create a lighter version of the batch for WebSocket updates
    const lightBatch = {
      id: batch.id,
      status: batch.status,
      progress: batch.progress,
      queuePosition: batch.queuePosition,
      // Only include titles if status is titles_ready
      generatedTitles: batch.status === "titles_ready" ? batch.generatedTitles : undefined
    };

    const message: WebSocketMessage = {
      type: 'BATCH_UPDATE',
      data: lightBatch
    };

    const clients = this.clients.get(batchId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(messageStr);
            console.log(`Sent update for batch ${batchId} to client`);
          } catch (error) {
            console.error(`Failed to send update for batch ${batchId}:`, error);
            this.removeClient(client);
          }
        }
      });
    }
  }
}

export let wsManager: WebSocketManager;

export function initializeWebSocket(server: Server) {
  wsManager = new WebSocketManager(server);
}
