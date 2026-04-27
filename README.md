# Lace

A multi-chain, multi-platform wallet for Cardano, Bitcoin, and Midnight.

- **Website**: <https://www.lace.io/>
- **Browser extension**: [Chrome Web Store](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk?hl=en)
  · also available on Microsoft Edge Add-ons
- **Mobile**: [Google Play](https://play.google.com/store/apps/details?id=io.lace.mobilewallet)
  · also available on the App Store

This repository is an **open-source mirror** of Lace. It exists so that
anyone can inspect the source code, understand how the released
extensions and mobile app are built, and file issues against what they
find.

## Reporting security issues

For suspected vulnerabilities, follow the process in
[SECURITY.md](./SECURITY.md). Do not open a public issue for a security
matter.

## What's in this repository

- **Source code** for the browser extension, mobile app, and supporting
  packages — snapshotted here on each release.
- **A GitHub Release per version** — tag + changelog anchor, pointing
  at the source snapshot. Release notes describe the user-facing
  changes; the underlying source is the merge commit the tag points at.
- **Verification provenance** — every snapshot includes a `PROVENANCE`
  file recording the source commit and the allowlist hash that
  controlled what was published.

## Code structure

If you're reviewing the source, two docs are the fastest way to build
a working mental model:

- [`docs/WORKSPACE.md`](./docs/WORKSPACE.md) — high-level workspace map
  (apps, packages, contracts, modules, libs).
- [`docs/contracts-and-modules.md`](./docs/contracts-and-modules.md) —
  the central architectural pattern: how features are split into
  contracts (interfaces) and modules (implementations) and assembled
  at app boot.

Beyond that, the source itself is the documentation. Type-rich
TypeScript with named exports, colocated tests under `test/`, and
small self-contained packages — start in [`apps/lace-extension`](./apps/lace-extension)
or [`apps/lace-mobile`](./apps/lace-mobile) and follow the imports.

## Building from source

The source of a given release lives on this repository's default
branch at the merge commit tagged for that release:

```bash
git checkout lace-extension@2.0.0   # or lace-mobile@2.0.0
npm ci
```

Then build the app you're interested in:

```bash
cd apps/lace-extension && npm run build       # browser extension
cd apps/lace-mobile && npx expo prebuild --clean   # mobile (then platform tooling)
```

App-specific build details — environment variables, watch modes, dev
servers — are in each app's own README:

- [`apps/lace-extension/README.md`](./apps/lace-extension/README.md)
- [`apps/lace-mobile/README.md`](./apps/lace-mobile/README.md)

This is an [Nx](https://nx.dev) monorepo. The root `package.json`
exposes Nx-orchestrated convenience scripts (`npm run build`,
`npm run check`, `npm run test`) that build/lint/test every package
together, but you don't need to learn or invoke Nx commands directly
to build a single app — the per-app `npm run build` works on its own.

You'll need to supply your own API credentials (Blockfrost, Maestro,
PostHog, Sentry, etc.). A build produced this way will not be
byte-identical to the official build — the credentials differ, and so
do downstream metadata (Sentry release IDs, source-map digests, etc.).
A structural comparison (file layout, manifest contents, bundle
structure, core JS/dex content) against your own local build is the
meaningful reproducibility check.

## Filing issues

Bug reports and feature requests are welcome.
Use the [issue templates](https://github.com/input-output-hk/lace/issues/new/choose)
to help us route your report efficiently.

We triage every issue. Accepted fixes are scheduled into an upcoming
release, and the issue is closed when the release containing the fix is
published here.

## Contributing

We welcome engagement from the community. Because this repository is a
mirror, not the development source of truth, we route contributions
through channels that can actually flow back into releases:

- **Bug reports, feature requests** — use the
  [issue templates](https://github.com/input-output-hk/lace/issues/new/choose).
- **A one-off patch or proof of concept** — open an issue and attach
  your patch to it (inline diff, gist link, or fork link). We review it
  and, if we accept it, apply it via the internal source of truth with
  attribution.
- **Something more substantive** — a larger feature, a package-level
  change, or ongoing work you'd like to collaborate on — [open a
  contribution proposal](https://github.com/input-output-hk/lace/issues/new?template=contribution_proposal.yml)
  before investing serious time. We'll reach out to discuss scope, fit
  with the roadmap, and how best to work together. This may involve a
  Contributor License Agreement and coordinated access to the internal
  source of truth.

Pull requests opened directly against this mirror are automatically
closed with a pointer to [CONTRIBUTING.md](./CONTRIBUTING.md) — not as
a brush-off, but because a PR here can't flow into real releases and
would leave your work stranded. The channels above get your change to
where it can actually have effect.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE).
