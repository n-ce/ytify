// Configuration loader with environment variables

export const config = {
  // Server
  port: parseInt(Deno.env.get("PORT") || "3000"),

  // CORS
  allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:5173,https://music.ml4-lab.com").split(","),

  // Database
  dbPath: Deno.env.get("DB_PATH") || "./data/ytify.db",

  // Cache settings
  cacheMaxSize: parseInt(Deno.env.get("CACHE_MAX_SIZE") || "500"),
  cacheTtlMs: parseInt(Deno.env.get("CACHE_TTL_MS") || "300000"), // 5 minutes

  // RapidAPI keys for fallback (comma-separated)
  rapidApiKeys: (Deno.env.get("RAPIDAPI_KEYS") || "").split(",").filter(Boolean),

  // Email validator URL
  emailValidatorUrl: Deno.env.get("EMAIL_VALIDATOR_URL") || "https://rapid-email-verifier.fly.dev/api/validate",

  // Rate limiting
  rateLimitWindowMs: parseInt(Deno.env.get("RATE_LIMIT_WINDOW_MS") || "60000"),
  rateLimitMaxRequests: parseInt(Deno.env.get("RATE_LIMIT_MAX_REQUESTS") || "100"),
};

// Validate required config
export function validateConfig(): void {
  if (config.rapidApiKeys.length === 0) {
    console.warn("Warning: No RapidAPI keys configured. Fallback endpoint will not work.");
  }
}
