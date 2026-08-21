# Dockerfile for the Buddy LiveKit Agents worker (npm / package-lock.json).
# Build docs: https://docs.livekit.io/agents/ops/deployment/builds/
# syntax=docker/dockerfile:1

# Debian "slim" Node 22 base — small, but still a glibc image with apt,
# which the LiveKit native (Rust) core needs.
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

# Install ca-certificates (the system CA bundle used for TLS), then clean the
# apt cache. Required by the LiveKit SDK: the native Rust core reads the system
# trust store at runtime, which the slim base image doesn't ship.
# --no-install-recommends keeps the image minimal.
RUN apt-get update -qq \
    && apt-get install --no-install-recommends -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- Build stage ---
# Install dependencies, compile TypeScript, then strip the image down to
# exactly what production needs.
FROM base AS build

WORKDIR /app

# Copy just the dependency manifests first, for efficient layer caching.
# This project uses npm, so the lockfile is package-lock.json.
COPY package.json package-lock.json ./

# `npm ci` installs exactly the versions pinned in package-lock.json
# (reproducible) and includes devDependencies, which the build needs.
RUN npm ci

# Copy the rest of the application: src/, tsconfig.json and the runtime
# knowledge assets (knowledge/scs-knowledge.json is read from disk at startup).
# .dockerignore keeps node_modules, dist/, tests and local .env files out.
COPY . .

# Compile TypeScript: tsconfig.json maps src/ -> dist/, so this produces
# dist/agent.js, the production entrypoint.
RUN npm run build

# Drop devDependencies now that the build is done. Everything the worker needs
# at runtime (@livekit/agents + plugins, @livekit/rtc-node, dotenv, zod) is a
# regular dependency, so nothing required survives only in devDependencies.
RUN npm prune --omit=dev

# Pre-download plugin model files (e.g. Silero VAD) into the pruned tree.
# This runs AFTER `npm prune` on purpose: pruning rewrites node_modules and
# would otherwise be able to discard freshly downloaded assets. The standalone
# CLI ships with @livekit/agents (a production dependency) and discovers the
# installed @livekit/agents-plugin-* packages without loading agent code.
RUN npx livekit-agents download-files

# --- Production stage ---
FROM base

# Create a non-privileged user that the app will run under.
# See https://docs.docker.com/build/building/best-practices/#user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/app" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

WORKDIR /app

# Copy the built app with correct ownership in a single layer; this avoids an
# expensive recursive chown over node_modules.
COPY --from=build --chown=appuser:appuser /app /app

USER appuser

ENV NODE_ENV=production

# LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET are injected by LiveKit
# Cloud at runtime and are deliberately NOT baked in here. src/agent.ts calls
# `import 'dotenv/config'`, which is a no-op when no .env file is present, so
# the injected process environment is what the worker reads.

# Launch the compiled worker. `start` puts it in production mode: connect to
# LiveKit and wait for jobs. Exec form (no npm wrapper) so SIGTERM reaches the
# worker directly and LiveKit Cloud can drain jobs gracefully on shutdown.
# Mirrors the package.json "start" script: `node dist/agent.js start`.
CMD ["node", "dist/agent.js", "start"]
