/**
 * Fetch with Timeout and Retry logic.
 * Properly composes the caller's AbortSignal with a per-attempt timeout.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & {
    maxRetries?: number;
    timeout?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    timeout = 15000,
    backoffMultiplier = 2,
    signal: callerSignal,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  // If the caller already aborted, bail immediately
  if (callerSignal?.aborted) {
    throw new Error('Request aborted by caller');
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Forward caller abort to our controller so both timeout AND caller can cancel
    const onCallerAbort = () => controller.abort();
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', onCallerAbort);

      if (response.ok) return response;

      // Non-retryable status codes
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // If 5xx, we might want to retry
      if (response.status >= 500) {
         console.warn(`Attempt ${attempt + 1}/${maxRetries} failed with status ${response.status}`);
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', onCallerAbort);

      // If the caller aborted, don't retry — propagate immediately
      if (callerSignal?.aborted) {
        throw new Error('Request aborted by caller');
      }

      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (error.name === 'AbortError') {
         lastError = new Error(`Request timed out after ${timeout}ms`);
      }

      console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(backoffMultiplier, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
