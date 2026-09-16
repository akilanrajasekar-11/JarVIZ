const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/incidents/';

class IncidentWebSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectDelay = 2000;
    this.shouldReconnect = false;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.shouldReconnect = true;
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('[JarVIZ WS] Connected');
      this.reconnectDelay = 2000;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((cb) => cb(data));
      } catch (e) {
        console.error('[JarVIZ WS] Parse error', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[JarVIZ WS] Disconnected');
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[JarVIZ WS] Error', err);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  ping() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }
}

export const incidentSocket = new IncidentWebSocket();
export default incidentSocket;
