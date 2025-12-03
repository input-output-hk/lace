# Lace

A browser extension wallet for Cardano, Bitcoin and Midnight.

## Setup

After cloning the repo, you can run `make setup` to setup the repo. It will initialize git submodules and install dependencies.

## Build

```bash
# Development build
yarn build:dev

# Production build
yarn build:prod
```

The built extension will be in the `dist/` directory.

See [package.json](./package.json) for additional build scripts.

## Updating v2 submodule

To update the v2 submodule to the latest commit on `main` branch, run:
```bash
git submodule update --remote v2
```

## Architecture

For technical details about the project structure and bundling approach, see [ARCHITECTURE.md](./ARCHITECTURE.md).
