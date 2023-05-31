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

## Some commands

There are few root dev commands available:

- `build`
- `build-deps` - build only dependencies of a given app
- `watch` - build and watch
- `watch-deps` - build and watch only dependencies of a given app

You can use them while working either with the `browser` or `desktop` app the following way:

```console
yarn [app] [command]
```

The `yarn [app]` script runs the subsequent command in the context of particular application. That means, it sets
the appropriate env variable used by all involved build processes.

**Examples:**

- `yarn desktop watch` runs the `watch` command for all dependent workspaces of the [desktop] app and for the [desktop]
  app itself.
- `yarn browser build-deps` builds all dependent workspaces of the [browser-extension-wallet] app except the app itself.
- `yarn browser [any command supported by yarn]` command you provide will run in the [browser-extension-wallet]
  context. For example:
  - `yarn desktop workspace @light-wallet/core build` runs the `build` command **only for the @light-wallet/[core]
    package**, but in
    the context of the `desktop`\*. Notice the `workspace @light-wallet/core build` is a yarn' syntax

\* the `@light-wallet/core` package will be built specifically for the `desktop` app

[browser-extension-wallet]: ./apps/browser-extension-wallet
[common]: ./packages/common
[core]: ./packages/core
[cardano]: ./packages/cardano

## Audit

Lace has been independently audited and manually verified by external auditor, [FYEO](https://www.fyeo.io/), so the Lace team can improve code quality and security – giving you greater peace of mind. You can view the full report at [lace.io/lace-audit-report](https://lace.io/lace-audit-report)
