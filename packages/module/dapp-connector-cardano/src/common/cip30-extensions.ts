import type { WalletApiExtension } from './types';

/**
 * A CIP-30 extension Lace implements, paired with the enabled-API method names
 * that make up its namespace.
 *
 * This registry is the single source of truth for extensions across the
 * extension and mobile surfaces: the advertised `supportedExtensions`, the
 * `getExtensions()` reply, and the extension method routing all derive from it.
 * Adding an extension is one entry here (plus its handler implementation) —
 * there is no second list to keep in sync.
 *
 * @see https://cips.cardano.org/cip/CIP-30#extensions
 */
export interface Cip30ExtensionDefinition {
  /** CIP number, e.g. 95 (governance), 142 (network magic). */
  cip: number;
  /** Enabled-API method names this extension contributes. */
  methods: readonly string[];
}

export const CIP30_EXTENSIONS: readonly Cip30ExtensionDefinition[] = [
  {
    // CIP-95 — Governance
    cip: 95,
    methods: [
      'getPubDRepKey',
      'getRegisteredPubStakeKeys',
      'getUnregisteredPubStakeKeys',
    ],
  },
  {
    // CIP-142 — Network magic
    cip: 142,
    methods: ['getNetworkMagic'],
  },
];

/**
 * The extensions Lace advertises (`supportedExtensions`) and reports as enabled
 * (`getExtensions()`). Returns a fresh array so callers can hand it out without
 * exposing the registry to mutation.
 */
export const supportedCip30Extensions = (): WalletApiExtension[] =>
  CIP30_EXTENSIONS.map(extension => ({ cip: extension.cip }));

/** Every enabled-API method name contributed by a registered extension. */
export const CIP30_EXTENSION_METHODS: readonly string[] =
  CIP30_EXTENSIONS.flatMap(extension => extension.methods);
