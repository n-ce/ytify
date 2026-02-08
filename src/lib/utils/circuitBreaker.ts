type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: CircuitState = 'closed';

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly resetTimeout = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        console.log(`Circuit ${this.name}: half-open, testing...`);
      } else {
        throw new Error(`Circuit ${this.name} is open`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      console.log(`Circuit ${this.name}: recovered, closing`);
    }
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn(`Circuit ${this.name}: opened after ${this.failures} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Global instances
export const invidiousCircuit = new CircuitBreaker('invidious', 3, 60000);
export const jioSaavnCircuit = new CircuitBreaker('jiosaavn', 3, 30000);
