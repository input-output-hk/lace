# Working with this repository

See [CONTRIBUTING.md](./CONTRIBUTING.md)

# Context

We have lace and the lace-platform connected through a submodule as a git submodule

## Lace Cardano+Bitcoin (aka. V1): `./v1/apps/browser-extension-wallet`

### Entrypoints

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

All scripts are bundled and minified. Most of them dynamically loads other .js scripts and assets such as wasm and images.

## Lace Midnight Preview (aka. LMP): `./lace-platform/apps/midnight-extension`

### Entrypoints

- Extension manifest: `./lace-platform/apps/midnight-extension/dist/manifest.json` and associated non-UI scripts:
  - Service worker: `./lace-platform/apps/midnight-extension/dist/js/sw/sw-script.js`
  - Isolated content script: `./lace-platform/apps/midnight-extension/dist/js/isolated-script.js`
  - Injected content script: `./lace-platform/apps/midnight-extension/dist/js/injected-script.js`
- UI pages (imports js scripts and some assets):
  - Tab UI: `./lace-platform/apps/midnight-extension/dist/tab.html`
  - Web extension popup UI: `./lace-platform/apps/midnight-extension/dist/popup.html`

All scripts are bundled and minified. Most of them dynamically loads other .js scripts and assets such as wasm and images.

# Project

New web extension application that bundles both existing applications into 1. Published as an update to Lace v1.

The goal is to bundle applications with minimal modifications in each application - ideally, only adding UI elements to switch between the 2 applications.

## Technical Approach

### Build

Webpack build that:

- copies `dist/` artifacts from both applications (there are currently no conflicting filenames)
  - js, html, wasm files, images, fonts, css etc.
- merges manifest.json of both applications. uses V1 manifest as a base and patches it with:
  - new entrypoints:
    - [service worker](./src/sw-bundle.js) - loads SW script of both apps
    - [popup](./src/popup-bundle.js) - popup html is the same as in v1, but with a different script that conditionally loads the script of the active application
  - additional `content_scripts` from LMP
  - additional `content_security_policy` rules from LMP
  - additional `web_accessible_resources` rules from LMP

### Mode Switching Mechanism

- Service worker always loads both application scripts
- Content scripts from both apps (injected & isolated) are always loaded
- Extension popup switches the mode based on active wallet (determined by value stored in extension storage)
- All other UIs (popup, dapp connector) are addressed as different html files - no changes
