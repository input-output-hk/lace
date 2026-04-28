# Architecture

## Context

This repository bundles Lace V1 (Cardano+Bitcoin) with either Lace Midnight Preview (LMP), Lace V2, or both (V2+LMP) into a unified web extension. All applications are connected through git submodules.

## Applications

### Lace Cardano+Bitcoin (V1): `./v1/apps/browser-extension-wallet`

#### Entrypoints

- Extension manifest: `./v1/apps/browser-extension-wallet/dist/manifest.json` and associated non-UI scripts:
  - Service worker: `./v1/apps/browser-extension-wallet/dist/sw/background.js`
  - Isolated content script: `./v1/apps/browser-extension-wallet/dist/app/content.js`
  - Injected content script: `./v1/apps/browser-extension-wallet/dist/app/inject.js`
  - Trezor content script: `./v1/apps/browser-extension-wallet/dist/app/trezor-content-script.js`
- UI pages (imports js scripts and some assets):
  - Tab UI: `./v1/apps/browser-extension-wallet/dist/app.html`
  - Web extension popup UI: `./v1/apps/browser-extension-wallet/dist/popup.html`
  - dApp Connector popup: `./v1/apps/browser-extension-wallet/dist/dappConnector.html`
  - Trezor: `./v1/apps/browser-extension-wallet/dist/trezor-usb-permissions.html`

All scripts are bundled and minified. Most of them dynamically load other .js scripts and assets such as wasm and images.

### Lace Midnight Preview (LMP): `./v2/apps/midnight-extension`

#### Entrypoints

- Extension manifest: `./v2/apps/midnight-extension/dist/manifest.json` and associated non-UI scripts:
  - Service worker: `./v2/apps/midnight-extension/dist/js/sw/sw-script.js`
  - Isolated content script: `./v2/apps/midnight-extension/dist/js/isolated-script.js`
  - Injected content script: `./v2/apps/midnight-extension/dist/js/injected-script.js`
- UI pages (imports js scripts and some assets):
  - Tab UI: `./v2/apps/midnight-extension/dist/tab.html`
  - Web extension popup UI: `./v2/apps/midnight-extension/dist/popup.html`

All scripts are bundled and minified. Most of them dynamically load other .js scripts and assets such as wasm and images.

## Bundling Approach

The goal is to bundle the applications with minimal modifications—ideally, only adding UI elements to switch between them.

### Bundle Targets

The `BUILD_TARGET` environment variable controls which secondary app(s) are bundled alongside V1:

| `BUILD_TARGET` | Includes | Make target | npm script |
|---|---|---|---|
| `lmp` (default) | V1 + LMP | `build-prod` / `build-dev` | `build:prod` / `build:dev` |
| `v2` | V1 + V2 | `build-prod-v2` / `build-dev-v2` | `build:prod:v2` / `build:dev:v2` |
| `v2+lmp` | V1 + V2 + LMP | `build-prod-v1-v2-lmp` / `build-dev-v1-v2-lmp` | `build:prod:v1-v2-lmp` / `build:dev:v1-v2-lmp` |

### Build Process

Webpack build that:

- Copies `dist/` artifacts from the target application(s) (no conflicting filenames)
  - js, html, wasm files, images, fonts, css, etc.
- Merges manifest.json of the included applications. Uses V1 manifest as base and patches it with:
  - New entrypoints:
    - [service worker](./src/sw-bundle.js) - loads SW script of both apps
    - [popup](./src/popup-bundle.js) - popup html is the same as in v1, but with a different script that conditionally loads the script of the active application
  - Additional `content_scripts` from the bundled app(s)
  - Additional `content_security_policy` rules from the bundled app(s)
  - Additional `web_accessible_resources` rules from the bundled app(s)

### Mode Switching Mechanism

- Service worker always loads both application scripts
- Content scripts from both apps (injected & isolated) are always loaded
- Extension popup switches the mode based on active wallet (determined by value stored in extension storage)
- All other UIs (popup, dapp connector) are addressed as different html files—no changes
