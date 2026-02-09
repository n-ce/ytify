// Route aggregator

import { Hono } from "hono";
import hashRoutes from "./hash.ts";
import libraryRoutes from "./library.ts";
import syncRoutes from "./sync.ts";
import fallbackRoutes from "./fallback.ts";
import staticRoutes from "./static.ts";
import linkPreviewRoutes from "./linkPreview.ts";
import providersRoutes from "./providers.ts";

export const routes = new Hono();

// Mount all routes
routes.route("/", hashRoutes);
routes.route("/", libraryRoutes);
routes.route("/", syncRoutes);
routes.route("/", fallbackRoutes);
routes.route("/", staticRoutes);
routes.route("/", linkPreviewRoutes);
routes.route("/api", providersRoutes); // Provider OAuth routes under /api
