/**
 * Safe JSON parsing utility
 * Prevents app crashes when parsing malformed JSON from localStorage or APIs
 */
export const safeJsonParse = <T>(text: string | null | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return fallback;
  }
};

/**
 * Safe JSON stringify utility
 */
export const safeJsonStringify = (data: unknown): string | null => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('JSON stringify error:', error);
    return null;
  }
};
