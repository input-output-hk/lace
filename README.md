# Lace

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=input-output-hk_lace&metric=alert_status&token=98802db7b585471a39ab75e8baf01cff96c561db)](https://sonarcloud.io/summary/new_code?id=input-output-hk_lace)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=input-output-hk_lace&metric=security_rating&token=98802db7b585471a39ab75e8baf01cff96c561db)](https://sonarcloud.io/summary/new_code?id=input-output-hk_lace)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=input-output-hk_lace&metric=vulnerabilities&token=98802db7b585471a39ab75e8baf01cff96c561db)](https://sonarcloud.io/summary/new_code?id=input-output-hk_lace)

## Project structure

### Apps

- [browser-extension-wallet]

### Packages

- [cardano]
- [common]
- [core]
- [shared-wallets]
- [staking]

## Getting started

### Authorize to GitHub Package Registry

Lace depends on `@input-output-hk/lace-ui-toolkit` package, which is published from [lace-ui-toolkit](https://github.com/input-output-hk/lace-ui-toolkit) repository to [Github Package Registry](https://github.com/input-output-hk/lace-ui-toolkit/pkgs/npm/lace-ui-toolkit). In order to install dependencies from GitHub Package Registry, Personal Access Token needs to be provided.

> [!IMPORTANT]
>
> **It is required to generate Personal Access Token (PAT) to be able to authorize to Github Package Registry** prior to installing projects dependencies. For more details follow this link: [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

#### How to authorize to GitHub Package Registry

1. Go to [Profile/Settings/Developer Settings/Personal access tokens/Tokens (classic)](https://github.com/settings/tokens/new) to generate a new PAT
2. Select at least `read:packages` permissions to be able to download packages from GitHub Package Registry
3. Create `~/.yarnrc.yml` file in your home directory and insert:

```yaml
npmScopes:
  input-output-hk:
    npmAlwaysAuth: true
    npmAuthToken: YOUR_GITHUB_PAT
    npmRegistryServer: 'https://npm.pkg.github.com'
```

For more details check GitHub's guide: [Authenticating with personal access token](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token)

### Install dependencies

```sh
yarn install
```

### Setup environment variables

```sh
cp ./apps/.env.defaults ./apps/.env
```

Once `.env` files is created adjust it to your needs, and update `LACE_EXTENSION_KEY`

> If you want to develop DApp Explorer please refer to the [Setting up local connection with DApp Radar API](apps/browser-extension-wallet/src/views/browser-view/features/dapp/README.md) page

### Build packages and extension

```sh
yarn build
```

## Install Lace extension in Chrome / MS Edge browser

1. Go to `chrome://extensions/` or `edge://extensions/` in selected web browser
2. Enable **Developer mode**
3. Click **Load unpacked** and point out `dist` folder from `apps/browser-extension-wallet` which is built in previous step
4. Extension should be visible in **Extensions** and ready to use.

## Dev commands

```sh
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

## Working with UI Toolkit

In this workspace **UI Toolkit** is used in 4 places:

- apps/browser-extension-wallet
- packages/core
- packages/shared-wallets
- packages/staking

Based on the specific use case we can link it on:

- **app level**, check [Working with UI Toolkit on an app level](./apps/README.md#working-with-ui-toolkit-on-an-app-level)
- **package level**, check: [Working with UI Toolkit on a package level](./packages/README.md#working-with-ui-toolkit-on-a-package-level)

Linking **UI Toolkit** on app level, allows you to see all changes in app and packages using it.

Linking **UI Toolkit** on package level, allows you to develop components in isolation using for example Storybook.

[browser-extension-wallet]: ./apps/browser-extension-wallet
[common]: ./packages/common
[core]: ./packages/core
[cardano]: ./packages/cardano
[shared-wallets]: ./packages/shared-wallets
[staking]: ./packages/staking

## Audit

Lace has been independently audited and manually verified by external auditor, [FYEO](https://www.fyeo.io/), so the Lace team can improve code quality and security – giving you greater peace of mind. You can view the full report at [lace.io/lace-audit-report](https://lace.io/lace-audit-report)
