// ytify Backend - Main Entry Point

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { routes } from "./routes/index.ts";
import { initStorage, isHealthy, closeStorage } from "./services/storage.ts";
import { config, validateConfig } from "./config.ts";

const app = new Hono();

// Middleware
app.use("*", logger());

// CORS configuration
app.use(
  "*",
  cors({
    origin: config.allowedOrigins,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "If-Match", "Authorization"],
    exposeHeaders: ["ETag"],
    maxAge: 86400, // 24 hours
  })
);

// Health check endpoint
app.get("/health", (c) => {
  const healthy = isHealthy();
  return c.json(
    {
      status: healthy ? "ok" : "unhealthy",
      timestamp: new Date().toISOString(),
    },
    healthy ? 200 : 503
  );
});

// Mount API routes
app.route("/", routes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Initialize and start server
async function main() {
  console.log("ytify Backend starting...");
  console.log(`Environment: ${Deno.env.get("DENO_ENV") || "development"}`);

  // Validate configuration
  validateConfig();

  // Initialize storage
  await initStorage();

  // Graceful shutdown
  Deno.addSignalListener("SIGINT", () => {
    console.log("\nShutting down...");
    closeStorage();
    Deno.exit(0);
  });

  Deno.addSignalListener("SIGTERM", () => {
    console.log("\nShutting down...");
    closeStorage();
    Deno.exit(0);
  });

  // Start server
  console.log(`Server listening on port ${config.port}`);
  Deno.serve({ port: config.port }, app.fetch);
}

main();
