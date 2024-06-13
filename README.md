# Lace

The Lace monorepo.

# Yarn Workflows

## Structure

### Apps

- [browser-extension-wallet]

### Packages

- [common]
- [core]
- [cardano]
- [staking]

## Dev commands

```console
yarn [app] [command]
```

Available `[app]` options:
- `browser` ([./apps/browser-extension-wallet](./apps/browser-extension-wallet))
- `staking` ([./packages/staking](./packages/staking))

Available `[command]` options:

- `build`
- `build-deps` - build only dependencies of a given app
- `watch` - build and watch
- `watch-deps` - build and watch only dependencies of a given app

You can mix them together.

**Examples:**

- `yarn browser watch` runs the `watch` command for all dependent workspaces of the [browser-extension-wallet] package and for the [browser-extension-wallet]
  app itself.
- `yarn staking build-deps` builds all dependent workspaces of the [staking] package except the [staking] package itself.

[browser-extension-wallet]: ./apps/browser-extension-wallet
[common]: ./packages/common
[core]: ./packages/core
[cardano]: ./packages/cardano
[staking]: ./packages/staking

## Audit

Lace has been independently audited and manually verified by external auditor, [FYEO](https://www.fyeo.io/), so the Lace team can improve code quality and security – giving you greater peace of mind. You can view the full report at [lace.io/lace-audit-report](https://lace.io/lace-audit-report)
