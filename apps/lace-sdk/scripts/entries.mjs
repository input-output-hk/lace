// The package's entries in each build channel (ADR 66), in one list that the
// bundler, the declaration build, the checks, the release check and the packer
// all read, so adding an entry is one change here and its source file.

/** The entries both builds have: the root, `./cardano` and `./bitcoin`. */
export const STABLE_ENTRIES = ['index', 'cardano', 'bitcoin'];

/**
 * The entries only the canary build has. The stable package does not declare
 * them at all, rather than declaring empty ones, since a published stable
 * subpath is part of the stable API: the stable manifest drops their
 * `exports` and the peer dependencies that serve them alone (`peers`, which
 * match peer dependency names; `publishedPeers`, optional peers the
 * published manifest alone declares). An entry's source is `src/<name>.canary.ts`
 * unless `source` names another. The build refuses a static import of a
 * Midnight package from any entry but one that sets `importsMidnight`.
 *
 * @type {readonly {
 *   name: string;
 *   peers: readonly RegExp[];
 *   publishedPeers?: Readonly<Record<string, string>>;
 *   source?: string;
 *   importsMidnight?: boolean;
 * }[]}
 */
export const CANARY_ONLY_ENTRIES = [
  // The Midnight wallet. Its optional peers are the Midnight packages, which
  // ship WebAssembly a bundle cannot carry, and the Polkadot and SCALE
  // packages of the node relay.
  {
    name: 'midnight',
    peers: [
      /^@midnight-ntwrk\//,
      /^@midnightntwrk\//,
      /^@polkadot\//,
      /^@subsquid\//,
    ],
    source: 'src/midnight.ts',
    importsMidnight: true,
  },
  // Features that may be replaced or withdrawn: Passport accounts, Cardano
  // Shared Custody and MIP-0015 secrets. Passport accounts and their dev
  // sponsor load these Midnight packages from the consumer's install. The
  // workspace resolves them for passport-account at versions the copies its
  // root hoists do not satisfy, so they are declared in the published
  // manifest alone, at the ranges passport-account pins.
  {
    name: 'experimental',
    peers: [],
    publishedPeers: {
      '@midnight-ntwrk/compact-js': '^3.0.0-rc.3',
      '@midnight-ntwrk/compact-runtime': '^0.20.0',
      '@midnight-ntwrk/midnight-js-contracts': '^5.0.0-rc.2',
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider': '^5.0.0-rc.2',
      '@midnight-ntwrk/midnight-js-network-id': '^5.0.0-rc.2',
      '@midnight-ntwrk/midnight-js-protocol': '^5.0.0-rc.2',
      '@midnightntwrk/ledger-v9': '^1.0.0-rc.5',
      '@midnightntwrk/wallet-sdk-dust-wallet': '^5.0.0-rc.0',
      '@midnightntwrk/wallet-sdk-facade': '^5.0.0-rc.0',
      '@midnightntwrk/wallet-sdk-hd': '^3.1.0-rc.0',
      '@midnightntwrk/wallet-sdk-shielded': '^4.0.0-rc.0',
      '@midnightntwrk/wallet-sdk-unshielded-wallet': '^4.0.0-rc.0',
    },
  },
];

/** The entries of a build channel, in build order. */
export const channelEntryNames = channel => [
  ...STABLE_ENTRIES,
  ...(channel === 'canary' ? CANARY_ONLY_ENTRIES.map(({ name }) => name) : []),
];

/**
 * The source file of an entry in a channel, relative to the package: the
 * canary build compiles each entry's `.canary` twin, and a canary-only entry
 * has the twin alone, or the `source` it names.
 */
export const entrySource = (entry, channel) =>
  CANARY_ONLY_ENTRIES.find(({ name }) => name === entry)?.source ??
  `src/${entry}${channel === 'canary' ? '.canary' : ''}.ts`;

/** The files the build writes for an entry: ESM, CommonJS and declarations. */
export const entryFiles = entry => [
  `${entry}.js`,
  `${entry}.cjs`,
  `${entry}.d.ts`,
];

/**
 * The optional peers the published manifest of a channel declares beyond
 * package.json's: those of its canary-only entries.
 */
export const channelPublishedPeers = channel =>
  channel === 'canary'
    ? Object.assign(
        {},
        ...CANARY_ONLY_ENTRIES.map(
          ({ publishedPeers }) => publishedPeers ?? {},
        ),
      )
    : {};
