type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://100.x.x.x:3001';

class WebSocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<ConnectionHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribedRooms: Set<string> = new Set();

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      try {
        this.socket = new WebSocket(WS_BASE_URL);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionHandlers.forEach(handler => handler());
          
          // Resubscribe to rooms after reconnection
          this.subscribedRooms.forEach(room => {
            this.send('subscribe', { room });
          });
          
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const { type, data } = message;
            
            const handlers = this.messageHandlers.get(type);
            if (handlers) {
              handlers.forEach(handler => handler(data));
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.disconnectionHandlers.forEach(handler => handler());
          this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          resolve(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        resolve(false);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.subscribedRooms.clear();
  }

  send(type: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }

  subscribe(room: string) {
    this.subscribedRooms.add(room);
    this.send('subscribe', { room });
  }

  unsubscribe(room: string) {
    this.subscribedRooms.delete(room);
    this.send('unsubscribe', { room });
  }

  on(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  onConnect(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler) {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
