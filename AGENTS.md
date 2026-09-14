# Observatorio de Transparencia — DispensAI

## Identity, ownership and deployment

| | |
|---|---|
| Production URL | `transparencia.dispensai.cl` |
| Owner | DispensAI. `dispensai.cl` links it as its own (`ObservatorioBlock.astro`, `TRANSPARENCIA_URL`) |
| Frontend | React + Vite + MapLibre GL → **Vercel** |
| Backend | Python FastAPI + asyncpg + PostGIS → **Render** |
| Data store | Neon PostgreSQL + PostGIS; ETL in Python (httpx async, pandas, playwright-stealth for PJud) |
| Publishing scope | Scope **B** of `.claude/rules/publishing-matrix.md` |

The historical domain `observatoriojudicial.cl` is **superseded**. Do not present it as live.

Ownership is not editorial independence. What must not bend is the **data**: every published figure
carries its source, its cut-off date and the exact filter of the query; no cherry-picking; the
observatory measures how the law is applied, never the performance, efficacy or legal standing of
DispensAI or of any software. See `publishing-matrix.md` §3 for the failure conditions.

Open data caveat: the default CEAD total is ~81% dominated by subgroup `70204`
("Consumo de alcohol en la vía pública"), which is not cannabis. Do not cite CEAD totals until the
default excludes it or the view labels the breakdown.

## Operating Model

This is an autonomous Git repository for a Chilean civic-data observatory. It does not inherit the parent FARMIEMOS repository instructions. This `AGENTS.md` is its canonical agent contract, and `CLAUDE.md` must contain exactly `@AGENTS.md`.

Use `FUENTES.md` as the canonical source inventory and limitation record. `CONTEXT.md` holds the extended project context (routes, schema, ETL and frontend inventories). Keep approved design specifications in `docs/` rather than expanding this file.

The repository directory is `anonimouscanna/`. The GitHub remote is still named `ojcanna.git` for historical reasons; the older working copy under that name was deleted on 2026-08-27. Do not recreate it.

## Think Before Coding

- Verify current source coverage, schema, dependency versions, and route state before making claims.
- Distinguish measured official data from derived estimates and document the method for every cross-source metric.
- Inspect the owning backend or frontend contract before changing a shared API shape.
- Ask one focused question when legal access, methodology, or privacy requirements remain materially ambiguous.

## Simplicity First

- Make the smallest change that preserves data provenance and current API contracts.
- Prefer existing router, schema, ETL, cache, and visualization patterns over new frameworks or abstraction layers.
- Keep source-specific logic in its source module; do not force datasets with different granularity into one false common model.

## Surgical Changes

- Preserve unrelated work and inspect diffs before replacing dirty files.
- Never commit downloaded datasets, environment files, credentials, salts, private court text, or identifying records.
- Keep migrations, ETL changes, API schemas, and corresponding tests together.
- Do not expose hidden PJud or funnel UI until the required dataset and methodology are actually available.

## Goal-Driven Execution

- Define an observable acceptance criterion before implementation.
- Run the narrowest relevant backend or frontend checks, then review the final diff.
- Report data limitations and unverified operational assumptions explicitly.
- Update `FUENTES.md` when source URLs, taxonomy, coverage, granularity, or known limitations change.

## Purpose And Sources

The observatory compares the application of Chilean drug law across official police, defense, investigative, prosecutorial, population, and eventually judicial sources. Active sources include CEAD, DPP, PDI/datos.gob.cl, Fiscalia, and INE projections.

PJud judicial-text acquisition remains constrained by provider access controls and institutional availability. Do not bypass anti-bot controls or authenticated access. Use lawful institutional data access and preserve the metadata-only limitation until source evidence changes.

## Architecture

- `backend/api/`: FastAPI routers, Pydantic response schemas, asyncpg access, exports, and cross-source funnel endpoints.
- `backend/etl/`: source-specific, rerunnable extraction and consolidation pipelines.
- `frontend/`: Vite and React application with MapLibre maps, Recharts analytics, route-aware themes, and multi-level client caching.
- PostgreSQL and PostGIS are the durable analytical store. Keep geometry and filtered statistics endpoints separate to control payload size and cacheability.

## Data Integrity And Privacy

- Preserve each source's own year range and granularity. Never infer one source's latest year from another.
- Preserve the CEAD taxonomy boundary and surface it in analysis rather than merging incomparable periods silently.
- Clearly label DPP regional-to-commune allocation as an estimate when CEAD weights are used.
- Keep source row provenance, extraction version, taxonomy version, and idempotency keys intact.
- PJud processing must anonymize identifying text and use a secret HMAC salt for audit evidence. Keep the salt outside version control and fail closed when it is required but absent.
- Do not publish private identities, clear RUTs, unaudited court text, or claims unsupported by official source data.

## Implementation Conventions

- Use async endpoints and async database access; avoid blocking I/O in FastAPI handlers.
- Validate API responses with Pydantic schemas and use parameterized SQL.
- Keep ETL modules in the established config, downloader or extractor, consolidator, and runner shape.
- Preserve rerun safety and historical records; do not turn idempotent ingestion into destructive replacement without an approved data-migration design.
- Add frontend routes to navigation and data-prefetch layers together when the route requires prefetched data.
- Preserve the persistent map lifecycle unless a measured problem justifies changing it.

## Verification

Run backend ETL tests from `backend/`:

```bash
python -m pytest tests/etl -q
```

Run frontend checks from `frontend/`:

```bash
npm run lint
npm exec --offline -- tsc --noEmit
npm run build
```

## Context from the parent ecosystem

This repository is autonomous and does not inherit the parent FARMIEMOS contract, but it is owned by
DispensAI and published under its domain. Three parent documents are still binding on how its output
is presented, and an agent working here should load them:

- `.claude/rules/anonimouscanna.md` — the parent-side pointer: ownership, the retired `ojcanna`
  naming, the two distinct data surfaces, and the open CEAD caveat.
- `.claude/rules/publishing-matrix.md` — scope B; §3 lists the data-integrity failure conditions and
  §4 the CEAD caveat that blocks citing default totals.
- Skill `vault-protocol` — required before reading or writing anything under the parent `vault/`,
  where this project's synthesis pages live
  (`vault/wiki/entities/anonimouscanna/`).
