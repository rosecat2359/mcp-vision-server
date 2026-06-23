# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **dual-stack** repository with two independent projects:

1. **MCP Vision Server** (Python) — An MCP stdio server that provides vision/image/video tools via multi-provider API routing
2. **MCP Hub** (TypeScript/pnpm monorepo) — A web dashboard for managing multiple MCP servers (React + Fastify + PostgreSQL + Redis)

## MCP Vision Server (Python)

### Commands

```bash
pip install -e ".[dev]"       # Install with dev dependencies
python -m mcp_vision_server   # Start the server (stdio MCP protocol)
python -m pytest tests/ -v    # Run all tests
```

### Architecture

Entry point: `python -m mcp_vision_server` → `mcp_vision_server/__main__.py` → `server.main()` → MCP stdio server loop.

**Provider routing system** — the core design:

- `providers/base.py` — `BaseProvider` abstract class + `Capability` enum (VISION, IMAGE_GENERATION, IMAGE_EDIT, VIDEO_ANALYSIS, VIDEO_GENERATION)
- `providers/catalog.py` — Static catalog of known providers (Agnes AI, OpenAI, OpenRouter, Groq) with their capabilities, default models, and default endpoints
- `providers/registry.py` — `ProviderRegistry` singleton that auto-discovers providers from env vars and routes tool calls by capability. Priority: tool `provider` arg → task-specific env (`IMAGE_PROVIDER`/`VIDEO_PROVIDER`) → global `VISION_PROVIDER` → first registered with capability → fallback chain
- `providers/adapters/openai_compat.py` — `OpenAICompatibleProvider` implements `BaseProvider` for any OpenAI-compatible API. All providers (Agnes, OpenAI, OpenRouter, Groq, custom) use this adapter; only base_url, API key, capabilities, and default models differ

**Tool routing** (`server.py`):

- `TOOL_CAPABILITY` maps tool names to `Capability` enum values
- `_resolve_model()` — model resolution chain: tool arg → env var override (`VISION_MODEL`, `IMAGE_GEN_MODEL`, etc.) → provider default
- `handle_call_tool()` dispatches to handler functions in `tools/` based on tool name
- Each handler in `tools/` receives an `OpenAICompatibleProvider` instance and calls `chat_completion()` or `image_generation()` on it

**Config** (`config.py`): All env var reading with defaults. Supports per-task provider env vars (`IMAGE_PROVIDER`, `VIDEO_PROVIDER`), per-task model overrides (`VISION_MODEL`, `IMAGE_GEN_MODEL`, etc.), and per-provider API keys.

**Media handling** (`utils/media.py`): `resolve_media_input()` converts local files to base64 data URIs, passes HTTP URLs through. Supported formats: png, jpg, gif, webp, bmp, tiff for images; mp4, mov, avi, webm, mkv for video.

**Backward compatibility**: `client.py` retains the v0.1 `AgnesClient` class; new code should use `providers.registry.get_registry()`.

### Testing

Tests live in `tests/` with pytest-asyncio for async support. `tests/providers/test_registry.py` tests provider registration/routing; `tests/test_tools_*.py` test individual tool handlers; `tests/test_media.py` tests input resolution.

## MCP Hub (TypeScript Monorepo)

### Commands

```bash
pnpm install                  # Install all dependencies
pnpm docker:up                # Start PostgreSQL 17 + Redis 7 (Docker)
pnpm db:generate && pnpm db:push  # Prisma schema → client → push to DB
pnpm dev                      # Start API (3001) + Web (5173) via turbo
pnpm build                    # Build all packages
pnpm test                     # Run all tests
```

### Monorepo Structure

- `turbo.json` — build pipeline: `build` depends on upstream builds (`^build`), `lint`/`test` depend on build
- `pnpm-workspace.yaml` — workspaces at `apps/*` and `packages/*`

### Package Dependency Graph

```
apps/api  → packages/data, packages/shared
apps/web  → packages/shared
packages/data → (standalone, Prisma)
packages/shared → (standalone, shared types)
```

### Packages

**`packages/shared`** (`@mcp-hub/shared`): Cross-app TypeScript types. Exports `api-types` (default) and `mcp-config` subpaths. Must be built before `apps/api` and `apps/web` can build.

**`packages/data`** (`@mcp-hub/data`): Prisma 7 ORM layer with PostgreSQL adapter (`@prisma/adapter-pg`). Uses `PrismaPg` driver adapter (not `pg` pool). Global singleton pattern to avoid multi-instance in dev.

### Apps

**`apps/api`** (Fastify 5, port 3001):

- `index.ts` → `buildApp()` → `app.listen()`, then spawns `startPingWorker()` for MCP server health checks
- `env.ts` — Zod-validated env schema; required: `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_MASTER_KEY` (64 hex), `JWT_SECRET` (≥32 chars), `JWT_REFRESH_SECRET` (≥32 chars)
- Module structure: `modules/<name>/<name>.routes.ts` + `<name>.service.ts`. Auth, servers, keys, logs, connect modules
- Middleware: `middleware/auth.ts` (JWT verification), `middleware/rbac.ts` (role-based access), `middleware/audit.ts`
- Plugins: `plugins/cors.ts`, `plugins/rate-limit.ts`, `plugins/websocket.ts`
- Auth routes get strict rate limiting (10 req/min) via a nested Fastify scope
- Tests: `src/test/*.test.ts` using vitest

**`apps/web`** (React 18 + Vite 7 + Tailwind 4, port 5173):

- `src/router.tsx` — React Router v6 routes
- `src/lib/api.ts` — HTTP client (ky) for backend API calls
- `src/lib/auth.ts` — JWT token management
- State: `@tanstack/react-query` for server state, `zustand` for client state
- UI: custom glassmorphism components in `components/ui/`, framer-motion animations

### Deployment

Three shell scripts in `scripts/`:

- `deploy.sh` — Full deployment: install Node 20/Docker/Caddy/pnpm/pm2, start DB, build, configure HTTPS reverse proxy. Uses `DOMAIN=` env var. Default HTTPS port 8443 (for non-ICP-filed mainland China servers)
- `update.sh` — Update: git pull → install → build → pm2 restart
- `uninstall.sh` — Stop services; `--purge` flag deletes code + DB data

Environment variables are auto-generated into `apps/api/.env` on first deploy and preserved on updates.

### Key Gotchas

- Build order matters: `packages/shared` → `packages/data` → `apps/api` and `apps/web`. Turbo handles this via `dependsOn: ["^build"]`
- Both Python and TypeScript projects exist side by side; they are **independent** — the Python MCP server does not depend on the TypeScript monorepo or vice versa
- `packages/data` and `packages/shared` export from `dist/` — running without building first causes `ERR_UNKNOWN_FILE_EXTENSION` for `.ts` imports
- The Prisma adapter uses `@prisma/adapter-pg` (driver adapter pattern), not a traditional connection pool
- `ENCRYPTION_MASTER_KEY` must be backed up before server migration — it encrypts stored MCP server credentials in the DB
