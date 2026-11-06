type WebSocketCallback = (event: { type: string; payload: any }) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<WebSocketCallback> = new Set();
  private reconnectTimer: any = null;
  private isIntentionalClose = false;

  connect() {
    this.isIntentionalClose = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/progress`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Send initial ping
        this.ws?.send('ping');
      };

      this.ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const parsed = JSON.parse(event.data);
          this.listeners.forEach((cb) => cb(parsed));
        } catch (e) {
          // ignore non-json
        }
      };

      this.ws.onclose = () => {
        if (!this.isIntentionalClose) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (e) {
      if (!this.isIntentionalClose) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    }
  }

  subscribe(callback: WebSocketCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  disconnect() {
    this.isIntentionalClose = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
