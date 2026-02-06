# Lace

A browser extension wallet for Cardano, Bitcoin and Midnight.

> **Note:** `lace-platform`, the code repository for Lace v2 and Lace Midnight Preview, is linked as a git submodule, named `v2`, to support the integration of Midnight in v1.

## Make Commands

### Setup

**Prerequisite:** `nvm` or `fnm` node version manager is required.

```bash
make setup # Installs dependencies and sets up the project
```

### Build

```bash
yarn build:dev      # Development build with LMP (Chrome)
yarn build:prod     # Production build with LMP (Chrome)
yarn build:dev:v2  # Development build with Lace Extension (V2) (Chrome)
yarn build:prod:v2 # Production build with Lace Extension (V2) (Chrome)
```

Firefox does not current support the bundles

For faster rebuilds when only the extension app code changed (skips v1 packages and v2):

```bash
make build-dev-ext  # Fast development rebuild (Chrome)
make build-ext      # Fast production rebuild (Chrome)
```

The full build command creates three builds:
- The build in the root `/dist` is the bundle that combines v1 and LMP
- The build in `v1/apps/browser-extension-wallet/dist` folder only contains Lace v1 without the LMP
- The build in `v2/apps/midnight-extension/dist` folder only contains LMP

### Local Development with v2 Submodule

When working on the `v2` submodule in a separate IDE/directory, you can symlink it to avoid working inside the nested submodule:

```bash
make link-v2 REPO_PATH=~/my-work-dir/lace-platform
```

This backs up `v2` to `v2.bak`, creates a symlink to your standalone repo, and configures git to ignore the symlink.

To restore the original submodule:

```bash
make unlink-v2
```

**Workflow:**
1. Clone lace-platform to a separate directory
2. Run `make link-v2 REPO_PATH=~/path/to/lace-platform`
3. Open lace-platform in IDE 1, lace in IDE 2
4. Changes in IDE 1 are instantly visible in IDE 2
5. Build/test in lace as normal
6. When done, push changes from lace-platform first
7. Run `make unlink-v2` to restore and update the submodule reference

## Updating v2 submodule

To update the v2 submodule to the latest commit on `main` branch, run:

```bash
git submodule update --remote v2
```

## Architecture

For technical details about the project structure and bundling approach, see [ARCHITECTURE.md](./ARCHITECTURE.md).
