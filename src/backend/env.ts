import type { DurableObjectNamespace } from "@cloudflare/workers-types";

export interface Env {
  USER_SYNC_DO?: DurableObjectNamespace;
  CATALOG_DO?: DurableObjectNamespace;
  STREAM_GATE_DO?: DurableObjectNamespace;
  /**
   * Shared secret for the internal catalog and stream-gate routes. When unset
   * the routes stay open so local dev and self-hosting need no extra
   * configuration; set it in production so only the ytify edge functions may
   * write to the catalog or drive the stream gate.
   */
  INTERNAL_TOKEN?: string;
}
