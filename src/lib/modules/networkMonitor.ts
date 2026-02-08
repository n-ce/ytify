// src/lib/modules/networkMonitor.ts
// Détection et gestion des problèmes réseau

type ConnectionState = 'online' | 'offline' | 'slow' | 'unstable';



class NetworkMonitor {
  private state: ConnectionState = 'online';
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private pingInterval: number | null = null;
  private failureCount = 0;
  private latencyHistory: number[] = [];

  constructor() {
    this.init();
  }

  private init() {
    // Écouter les événements navigateur
    window.addEventListener('online', () => this.updateState('online'));
    window.addEventListener('offline', () => this.updateState('offline'));

    // Ping périodique pour détecter connexion lente/instable
    this.startPingMonitor();

    // Écouter les erreurs de fetch globales
    this.interceptFetchErrors();
  }

  private startPingMonitor() {
    this.pingInterval = window.setInterval(async () => {
      if (!navigator.onLine) return;

      const start = performance.now();
      try {
        await fetch('/ping', {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        });

        const latency = performance.now() - start;
        this.latencyHistory.push(latency);
        if (this.latencyHistory.length > 10) {
          this.latencyHistory.shift();
        }

        this.failureCount = 0;

        // Analyser la latence
        const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
        const variance = this.calculateVariance();

        if (avgLatency > 2000) {
          this.updateState('slow');
        } else if (variance > 500) {
          this.updateState('unstable');
        } else {
          this.updateState('online');
        }

      } catch {
        this.failureCount++;
        if (this.failureCount >= 3) {
          this.updateState('offline');
        } else {
          this.updateState('unstable');
        }
      }
    }, 10000); // Toutes les 10 secondes
  }

  private calculateVariance(): number {
    if (this.latencyHistory.length < 2) return 0;
    const avg = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    const squareDiffs = this.latencyHistory.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length);
  }

  private interceptFetchErrors() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        this.failureCount = Math.max(0, this.failureCount - 1);
        return response;
      } catch (error) {
        this.failureCount++;
        if (this.failureCount >= 5) {
          this.updateState('unstable');
        }
        throw error;
      }
    };
  }

  private updateState(newState: ConnectionState) {
    if (this.state === newState) return;

    this.state = newState;
    this.listeners.forEach(callback => callback(newState));

    // Événement global
    window.dispatchEvent(new CustomEvent('network:state-change', {
      detail: { state: newState }
    }));
  }

  // API publique
  getState(): ConnectionState {
    return this.state;
  }

  subscribe(callback: (state: ConnectionState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isOnline(): boolean {
    return this.state === 'online';
  }

  isHealthy(): boolean {
    return this.state === 'online' || this.state === 'slow';
  }

  getLatencyStats() {
    return {
      current: this.latencyHistory[this.latencyHistory.length - 1] || 0,
      average: this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length || 0,
       variance: this.calculateVariance()
    };
  }

  destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }
}

export const networkMonitor = new NetworkMonitor();
