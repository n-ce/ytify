// src/lib/modules/streamOptimizer.ts
// Optimisation streaming pour qualité irréprochable

interface NetworkInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}



class StreamOptimizer {
  private networkInfo: NetworkInfo | null = null;
  private bufferHealth: number = 1; // 0-1
  private qualityHistory: string[] = [];

  constructor() {
    this.initNetworkMonitor();
  }

  private initNetworkMonitor() {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;

      this.networkInfo = {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };

      conn.addEventListener('change', () => {
        this.networkInfo = {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData
        };
        this.adjustQuality();
      });
    }
  }

  // Sélection qualité adaptative
  selectOptimalQuality(streams: AudioStream[]): AudioStream | null {
    if (!streams.length) return null;

    // Si save data activé, toujours qualité minimum
    if (this.networkInfo?.saveData) {
      return this.findLowestQuality(streams);
    }

    const targetBitrate = this.calculateTargetBitrate();

    // Trier par bitrate et trouver le plus proche du target
    const sorted = [...streams].sort((a, b) =>
      parseInt(a.bitrate) - parseInt(b.bitrate)
    );

    for (const stream of sorted.reverse()) {
      if (parseInt(stream.bitrate) <= targetBitrate) {
        return stream;
      }
    }

    return sorted[sorted.length - 1]; // Fallback: plus basse qualité
  }

  private calculateTargetBitrate(): number {
    const baseRates = {
      '4g': 256,
      '3g': 128,
      '2g': 64,
      'slow-2g': 48
    };

    const effectiveType = this.networkInfo?.effectiveType || '4g';
    let target = baseRates[effectiveType];

    // Ajuster selon la santé du buffer
    if (this.bufferHealth < 0.5) {
      target *= 0.5; // Réduire si buffer faible
    } else if (this.bufferHealth > 0.8) {
      target *= 1.2; // Augmenter si buffer sain
    }

    return target;
  }

  private findLowestQuality(streams: AudioStream[]): AudioStream {
    return streams.reduce((lowest, stream) =>
      parseInt(stream.bitrate) < parseInt(lowest.bitrate) ? stream : lowest
    );
  }

  // Mise à jour santé buffer
  updateBufferHealth(buffered: TimeRanges, currentTime: number) {
    if (buffered.length === 0) {
      this.bufferHealth = 0;
      return;
    }

    // Calculer combien de secondes sont bufferisées en avance
    let bufferedAhead = 0;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && buffered.end(i) > currentTime) {
        bufferedAhead = buffered.end(i) - currentTime;
        break;
      }
    }

    // Santé = secondes bufferisées / target (10s idéal)
    this.bufferHealth = Math.min(1, bufferedAhead / 10);
  }

  private adjustQuality() {
    // Émettre événement pour ajustement qualité en temps réel
    window.dispatchEvent(new CustomEvent('stream:quality-change', {
      detail: { targetBitrate: this.calculateTargetBitrate() }
    }));
  }

  // Préchargement intelligent
  shouldPrefetch(): boolean {
    return this.bufferHealth > 0.7 &&
           this.networkInfo?.effectiveType !== 'slow-2g' &&
           !this.networkInfo?.saveData;
  }

  // Stats pour debug
  getStats() {
    return {
      network: this.networkInfo,
      bufferHealth: this.bufferHealth,
      qualityHistory: this.qualityHistory
    };
  }
}

export const streamOptimizer = new StreamOptimizer();
