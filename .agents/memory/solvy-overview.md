---
name: SOLVY platform overview
description: Auth flow, role-based routing, demo users, API conventions, and known sharp edges for the SOLVY credit platform.
---

## Auth

- **Frontend-only auth** via `artifacts/solvy/src/lib/auth-context.tsx` — 5 hardcoded demo users stored in localStorage under key `solvy_auth_user`.
- Login: `sophie.martin`, `marc.lefebvre` (conseiller), `jean.risque` (analyste), `admin.si` (admin), `compliance.officer` (conformite). All password: `password`.
- No backend auth; API has no session middleware. Auth is purely client-side.

## Role → Routes

| Role | Default path |
|------|-------------|
| conseiller | /conseiller/dashboard |
| analyste | /analyste/pipeline |
| admin | /admin/utilisateurs |
| conformite | /conformite/audit |

**Why:** Strict cloisonnement — conseillers only see their own dossiers (via `created_by` filter), analysts claim dossiers one at a time.

## Conseiller cloisonnement

- API: `GET /api/dossiers?created_by=<login>` — filters by `created_by` column on `dossiers` table.
- New dossiers: `created_by` is set from `user.login` in NouveauDossierPage.
- Seeded: sophie.martin owns dossier IDs 1, 2, 8, 9; marc.lefebvre owns IDs 3, 5, 6, 7.

## Analyst claim workflow

- `POST /api/dossiers/:id/claim` with `{ analyste_login, analyste_nom }` — sets `assigned_to` + changes `statut` to `en_cours_analyse`.
- Conflict check: returns 409 if already claimed by someone else.
- Hook: `useClaimDossier` from `@workspace/api-client-react`.

## Scoring settings

- Backend in-memory store at `artifacts/api-server/src/lib/scoring-settings.ts`.
- Routes at `artifacts/api-server/src/routes/scoring.ts` — `GET/PUT /api/scoring/settings`.
- Hooks: `useGetScoringSettings`, `useUpdateScoringSettings`.

## OpenAPI / Codegen

- Schema `ClaimDossierInput` (NOT `ClaimDossierBody`) — renamed to avoid collision with auto-generated Zod body validator name.
- Run: `pnpm --filter @workspace/api-spec run codegen` after spec changes.
- Orval auto-names Zod body validators after the operationId + "Body" — avoid naming schemas the same way.

**Why:** First codegen attempt failed with TS2308 ambiguous export — Orval generates both a TypeScript type AND a Zod schema, both named after the OpenAPI schema. Renaming the schema to `ClaimDossierInput` resolved the conflict.

## Admin pages

- `UsersPage` — purely local state (no backend user API), manages 5 initial users.
- `ScoringSettingsPage` — connects to real backend scoring settings API with sliders.

## Sharp edges

- Slider from `@radix-ui/react-slider` triggers Vite dep optimization on first load → transient "duplicate React" error. Resolves after page reload.
- `useGetDossierScore` requires explicit `queryKey` in options (not just `enabled`) — TypeScript will error otherwise.
