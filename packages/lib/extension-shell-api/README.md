# @lace-lib/extension-shell-api

**One of the three [ADR 37](../../../docs/adr/37-host-supply-chain-isolation.md)
shared internal libs** the privileged lace-extension-shell host is allowed to
depend on (with `@lace-lib/core` and `@lace-lib/vendor`) — the contract one.
It carries the host↔guest API contract types:
the `window.lace` v1 provider shape, the capability set with per-method
param/result types, the `LaceResult` envelope, the transport value types
(lovelace-as-decimal-string convention), and the guest-origin release-artifact
schemas — the build-emitted `lace.json` experience manifest and the
operator-owned `release.json` pointer (`current` / `previous` release trees,
ADR 54) — plus `selectRelease`, the cohort decision both sides run.

## Trust boundary — host-grade rigor

This package sits **inside the host's trust boundary**: every change is
reviewed at **host-grade rigor** — the same scrutiny and store-gated cadence
as the host itself, never guest velocity. It is a deliberate rigor
chokepoint; keep it minimal. Anything host-internal (gate/port message
types, baked origin pins, ceremony/surface protocols) does **not** belong
here.

## Types, plus one shared algorithm

Pure `.ts` type declarations, imported with `import type` and erased by both
bundlers — plus the single runtime export `selectRelease`. Host and guest must
resolve the same release for the same install (ADR 54): a cohort each computed
for itself would let the host mount one release tree while the guest selects
another, so the decision belongs to the artifact both sides adopt in lockstep.
It is the only bundle input this package contributes, and it has no
dependencies.

## Consumers

- **Host** (`apps/lace-extension-shell`) — via a **committed vendored directory**
  pinned at `file:vendor/lace-lib-extension-shell-api` (npm-symlinked, **TS
  source**, bundled by the host's own esbuild like its own modules), never
  resolved from the workspace.
  Refreshing it is the explicit
  `apps/lace-extension-shell/scripts/sync-shared-lib.mjs` script (host
  `npm run sync:shared-lib`); the resulting **vendored-dir diff** is the
  audited adoption step — text-diffable `.ts` — workspace-side edits to this
  package do **not** flow into the host until that sync is run and reviewed.
- **Guests** (`apps/lace-extension-guest`, future shell guests) — as a normal
  workspace dependency, at workspace velocity.

## Build

Nothing on either consumer's path needs one: both resolve the **TS source**
(`main`/`types` point at `src/index.ts`, as the vendored copy's generated
manifest does), so the workspace and the host compile the same bytes and cannot
drift through a stale artifact. `npx nx build @lace-lib/extension-shell-api`
(or `tsc -p tsconfig.build.json`) still emits `dist/` for anything that wants
compiled output.
