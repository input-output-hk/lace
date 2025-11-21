# Getting Started

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/input-output-hk/lace

cd v1
# follow repo setup steps, run a full `yarn build` to prepare internal monorepo package dependencies

cd v2
# follow repo setup steps, run a full `npm run build` to prepare internal monorepo package dependencies
```

## Bundle Build

```bash
# Development build of both applications + bundle
yarn build:dev
```

See [package.json](./package.json) scripts for more granularity.
