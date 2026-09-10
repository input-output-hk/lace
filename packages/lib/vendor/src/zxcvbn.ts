/**
 * `@lace-lib/vendor/zxcvbn` — the `zxcvbn` password-strength estimator, a LIGHT,
 * pure-JS co-load group
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 *
 * CONSUMERS: the create / import ceremony surfaces
 * (`surfaces/create-wallet.ts`, `surfaces/import-wallet.ts`), which gate the
 * wallet password on the SAME strength bar as the monolith onboarding
 * (`packages/module/vault-local` `usePasswordStrength`: zxcvbn `score >= 3`).
 * `zxcvbn` is pure JS with no `@cardano-sdk`, Ledger, or Midnight tree, so the
 * split is STRUCTURAL (pinned by the build's `LIGHT_ENTRY_EXCLUSIONS`): a
 * ceremony document loads the estimator without any heavy trusted tree.
 *
 * Exact-surface re-export: the default estimator function only (`zxcvbn` is a
 * CommonJS `export =` default; `esModuleInterop` synthesises the binding).
 */
export { default } from 'zxcvbn';
