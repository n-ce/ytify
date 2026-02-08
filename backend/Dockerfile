# ytify Backend - Deno Dockerfile

FROM denoland/deno:2.1.0

WORKDIR /app

# Copy dependency definitions first for better caching
COPY deno.json deno.lock* ./

# Cache dependencies
RUN deno install

# Copy source code
COPY src/ ./src/

# Create data directory
RUN mkdir -p /app/data && chown -R deno:deno /app/data

# Run as non-root user
USER deno

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server with all permissions needed for SQLite FFI
CMD ["deno", "run", \
     "--allow-net", \
     "--allow-read", \
     "--allow-write", \
     "--allow-env", \
     "--allow-ffi", \
     "src/main.ts"]
