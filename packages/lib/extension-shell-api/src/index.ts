// ONE OF THE THREE ADR-37 shared internal libs — the lace-extension-shell
// host↔guest API contract (docs/adr/37-host-supply-chain-isolation.md admits
// exactly three: this types-only contract, @lace-lib/core, @lace-lib/vendor).
// This package sits INSIDE the host's trust boundary: every change is
// reviewed at HOST-GRADE rigor and adopted by the host only through the
// explicit vendored-directory sync
// (apps/lace-extension-shell/scripts/sync-shared-lib.mjs) — never silently.
//
// TYPES, plus the TWO shared RULES about the release pointer that cannot be
// expressed as types: `selectRelease` and `isReleaseDirectory` (ADR 54). Host and
// guest read the SAME document and must agree on what it says — which release
// an install runs, and which directories are even loadable — or the host mounts
// one release tree while the guest pins another. Both rules therefore live
// HERE, in the one artifact both sides adopt in lockstep, and are the only
// bundle inputs this package contributes. No dependencies; everything else is
// imported via `import type` and erased by both bundlers.
//
// Version-skew posture (ADR 41 capability handshake): the newest guest runs
// against the oldest still-installed host and vice versa. Guests
// FEATURE-DETECT via `version` + `capabilities` and must tolerate values
// outside the unions below (a newer host may emit codes/statuses this
// build of the contract does not know).

// ---------------------------------------------------------------------------
// window.lace v1 — provider + result envelope (ADR 41)
// ---------------------------------------------------------------------------

/**
 * Semver MAJOR.MINOR.PATCH advertised at `window.lace.version` (ADR 41
 * capability handshake). The host bakes the concrete value
 * (apps/lace-extension-shell/src/content/protocol.ts LACE_API_VERSION); guests
 * never assume a version — they feature-detect per capability.
 */
export type LaceApiVersion = `${number}.${number}.${number}`;

/**
 * Error codes the CURRENT host emits. The wire type (LaceError.code) is
 * deliberately `string`, not this union: an older guest must tolerate codes
 * a newer host adds, and a guest may synthesize its own local codes (e.g.
 * 'unavailable' when `window.lace` is not injected at all).
 */
export type LaceErrorCode =
  /** CIP-30 `-4 AccountChange` on the dapp leg: the granted account is no
   * longer the one the guest is on — its network is unprovisioned by this
   * host build OR differs from the guest's recorded active network (ADR 41
   * `lace.settings`). The dapp re-`enable()`s into a fresh host approval
   * ceremony that rebinds the active-network account. */
  | 'account-change'
  | 'internal'
  | 'invalid-params'
  /** CIP-30 `1 ProofGeneration` on the dapp leg: the requested signer is
   * well-formed but the granted account holds no key for it (foreign DRep,
   * script credential, address beyond the derivation window). Distinct from
   * 'invalid-params' (malformed request → `2 AddressNotPK`) so dApps can
   * render "use the wallet that owns this key" rather than "bad request". */
  | 'proof-generation'
  | 'refused'
  | 'timeout'
  | 'unsupported';

export type LaceError = {
  /** One of LaceErrorCode from the host — open for version skew (above). */
  code: string;
  message: string;
};

/**
 * Every `lace.request` settles with a typed result — it never rejects and
 * never hangs (timeouts surface as `{ ok: false, error: { code: 'timeout' } }`;
 * unknown/unadvertised methods as a typed 'unsupported').
 */
export type LaceResult<T = unknown> =
  | { ok: false; error: LaceError }
  | { ok: true; value: T };

/**
 * The shape injected as `window.lace` (guest-facing). Operation-scoped
 * events (ADR 41) are deliberately ABSENT in v1: no on()/subscribe surface
 * exists, so standing session subscriptions — which would keep the host SW
 * alive (ADR 34) — are structurally impossible, not merely discouraged.
 *
 * `capabilities` is `readonly string[]`, not `readonly LaceCapability[]`:
 * feature detection must survive a host advertising capabilities this
 * contract build does not know.
 */
export type LaceProvider = {
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly request: (method: string, params?: unknown) => Promise<LaceResult>;
};

// ---------------------------------------------------------------------------
// Transport value types
//
// TRANSPORT CONVENTION — lovelace as decimal strings. Coin values can
// exceed 2^53 and the host↔guest transport is JSON (chrome messaging — no
// bigint), so every lovelace amount crosses the boundary as a base-10
// string. Arithmetic happens in BigInt at the use site only.
// ---------------------------------------------------------------------------

/** Wallet metadata as returned by `wallets.list` (host vault metadata). */
export type WalletInfo = {
  walletId: string;
  name: string;
  /**
   * EVERY Cardano account of the wallet, across networks (ADR 11: accounts are
   * network-specific). The guest projects one wallet-repo account per entry.
   * Empty for MultiSig / non-Cardano wallets that carry no bip32 account. Each
   * entry carries both `networkMagic` and `networkId` so the guest reconstructs
   * the account's `chainId` without a baked magic→networkId map, and derives
   * the network the account belongs to. Bitcoin projects through
   * `bitcoinAccounts`; Midnight through `midnightAccounts`.
   */
  cardanoAccounts: {
    /** Derivation index (m/1852'/1815'/i'). */
    accountIndex: number;
    /** Extended account public key (m/1852'/1815'/i'), hex — NOT secret. */
    xpub: string;
    /** Cardano network magic the account belongs to. */
    networkMagic: number;
    /** Cardano network id the account belongs to (1 = mainnet). */
    networkId: number;
    /** The account's display name (the migrated per-account metadata name). */
    name: string;
  }[];
  /**
   * EVERY Bitcoin account of the wallet. Unlike Cardano — where
   * `(walletId, accountIndex)` is the canonical pair — the wallet holds BOTH
   * network accounts (mainnet AND testnet4) at every index, so `network` must
   * ride the wire to disambiguate (ADR 11 then resolves the exact account); the
   * guest projects one wallet-repo account per entry. Empty for wallets carrying
   * no Bitcoin account. PUBLIC material only — the seed never crosses here.
   */
  bitcoinAccounts: {
    /** Derivation index — shared by the two network accounts at this index. */
    accountIndex: number;
    /** The network this account belongs to (both are created at every index). */
    network: 'mainnet' | 'testnet4';
    /**
     * Per-purpose extended public keys, base58 — NOT secret; mirrors the
     * monolith's `BitcoinExtendedAccountPublicKeys`. `nativeSegWit` (BIP-84) is
     * always present; the rest are optional (BIP-44 legacy, BIP-49 segWit,
     * BIP-86 taproot, Electrum native-segWit) — a watch-only account exports
     * only the active native-segwit key.
     */
    xpubs: {
      nativeSegWit: string;
      legacy?: string;
      segWit?: string;
      taproot?: string;
      electrumNativeSegWit?: string;
    };
    /** The account's display name. */
    name: string;
    /**
     * The device master key fingerprint (8-char lowercase hex, BIP-32) — derived
     * from the account's master public key. Present ONLY for watch-only hardware
     * accounts (a Ledger enable-Bitcoin export); the guest's HW-aware PSBT build
     * path stamps input/change key-origins from it. Absent for in-memory
     * accounts (the seed-derived path needs no fingerprint on the wire).
     */
    masterFingerprint?: string;
  }[];
  /**
   * The Midnight accounts of the wallet whose PUBLIC material the host engine
   * has ALREADY computed (ADR 43). OPTIONAL and possibly incomplete: unlike
   * Cardano/Bitcoin, Midnight publics (addresses, shielded public keys) cannot
   * be derived WASM-free, so a freshly created/imported account is ABSENT here
   * until the engine computes and writes them back on first activation. The
   * guest treats a wallet with no matching entry (or `undefined`) as "sync to
   * populate" (ADR 34 — shielded display needs the engine anyway). PUBLIC
   * material only — no key or seed ever crosses here. See `MidnightAccountInfo`.
   */
  midnightAccounts?: MidnightAccountInfo[];
  /**
   * Legacy display order (the migrated `metadata.order`) — an ORDINAL, not a
   * timestamp. Renamed from `createdAt`, which mislabeled the order int as a
   * date.
   */
  order: number;
  /**
   * Vault wallet type — the guest's `WalletType` string ('InMemory',
   * 'HardwareLedger', 'HardwareTrezor', 'Script', …), open union. The guest
   * hydrator projects 'InMemory' and 'HardwareLedger' wallets as signable
   * shells (each signs through a host ceremony — unseal vs on-device); the
   * host's `requestSignTx` refuses any other type — the host never trusts the
   * guest's classification.
   */
  type: string;
};

/** One unspent output, flat (txId + index + address + coin). */
export type CardanoUtxo = {
  /** Producing transaction id — 64 hex chars. */
  txId: string;
  /** Output index within the producing tx. */
  index: number;
  /** bech32 payment address (addr… / addr_test…). */
  address: string;
  /** Lovelace as a decimal string (transport convention above). */
  lovelace: string;
  /**
   * Native-asset holdings on this output — assetId hex (policyId‖assetName)
   * → amount as a decimal string (transport convention above). Absent/empty
   * when the output carries only lovelace. Required end-to-end so token-bearing
   * utxos are not value-stripped (an ada send that selects one would fail
   * value conservation, and token balances derive from this map).
   */
  assets?: Record<string, string>;
};

/**
 * One Bitcoin unspent output, flat — the host-owned data authority's
 * overlay-adjusted view (ADR 46). `satoshis` rides as a DECIMAL STRING (the
 * lovelace transport convention above; a value can exceed 2^53 and the wire is
 * JSON). `script` is the output's scriptPubKey hex — the guest's PSBT builder
 * needs it verbatim to attach the segwit `witnessUtxo`. `confirmations` and the
 * optional `height` mirror the monolith's `BitcoinUTxO` consumption set.
 *
 * Runes/inscriptions are deliberately OFF the wire: the monolith carries them
 * as verbatim provider passthrough and no consumer in the guest loadout reads
 * them (ADR 46), so projecting them would be dead transport.
 */
export type BitcoinUtxo = {
  /** Producing transaction id — 64 hex chars (display byte order). */
  txId: string;
  /** Output index within the producing tx. */
  index: number;
  /** Value in satoshis, as a decimal string (transport convention above). */
  satoshis: string;
  /** The address holding this output. */
  address: string;
  /** The output's scriptPubKey, hex — the guest's PSBT witnessUtxo needs it. */
  script: string;
  /** On-chain confirmation count (0 for a still-unconfirmed output). */
  confirmations: number;
  /** Block height the output was confirmed at; absent while unconfirmed. */
  height?: number;
};

/**
 * The full `RequiredProtocolParameters` set the host data plane serves,
 * mapped 1:1 from blockfrost epoch-params — nothing is fabricated guest-side.
 * Field names mirror `RequiredProtocolParameters` (minFeeCoefficient =
 * minFeeA, minFeeConstant = minFeeB). Fraction-valued parameters
 * (monetaryExpansion, poolInfluence, minFeeRefScriptCostPerByte) ride as
 * strings; the two Conway fields are optional (the SDK types them as Partial).
 */
export type CardanoParams = {
  /** Linear fee coefficient (per tx byte) — "minFeeA". */
  minFeeCoefficient: number;
  /** Linear fee constant, lovelace — "minFeeB". */
  minFeeConstant: number;
  /** Min-utxo deposit coefficient (per utxo byte, Babbage+). */
  coinsPerUtxoByte: number;
  /** Maximum transaction size, bytes. */
  maxTxSize: number;
  /** Maximum serialized value size, bytes (Alonzo+) — matters under multiasset. */
  maxValueSize: number;
  /** Collateral requirement as a percentage of fee (Alonzo+). */
  collateralPercentage: number;
  /** Maximum number of collateral inputs (Alonzo+). */
  maxCollateralInputs: number;
  /** Stake-credential registration deposit, lovelace ("key_deposit"). */
  stakeKeyDeposit: number;
  /** Pool registration deposit, lovelace ("pool_deposit"). */
  poolDeposit: number;
  /** Target number of stake pools ("nopt"). */
  desiredNumberOfPools: number;
  /** Monetary expansion rate, fraction as a string ("rho"). */
  monetaryExpansion: string;
  /** Pool pledge influence, fraction as a string ("a0"). */
  poolInfluence: string;
  /** Script + memory/step execution prices. */
  prices: { memory: number; steps: number };
  /** DRep registration deposit, lovelace (Conway — optional). */
  dRepDeposit?: number;
  /** Reference-script cost per byte, fraction as a string (Conway — optional). */
  minFeeRefScriptCostPerByte?: string;
};

/**
 * Answer to a `wallets.request*` SURFACE REQUEST (ADR 41/36): the guest may
 * only ASK for a ceremony; the host mounts (or refuses to mount) its own
 * cross-origin surface. Completion is observed by polling `wallets.list` —
 * never via a subscription.
 */
export type SurfaceMountResult = { mounted: boolean };

/**
 * The hardware-wallet transports the host can pair (ADR 44). The guest names
 * one when it asks the host to run a pairing ceremony
 * (`wallets.requestConnectHardware`); everything else about the device — the
 * transport, the device I/O, the xpub extraction — runs inside the host-origin
 * pairing window, never the guest (there is no `lace.hw.*`, ADR 36/41).
 * 'ledger' / 'trezor' connect online; 'keystone' / 'seed-signer' are air-gapped
 * (host-camera QR exchange).
 */
export type HwDevice = 'keystone' | 'ledger' | 'seed-signer' | 'trezor';

/**
 * The blockchain a hardware pairing provisions (ADR 44). One physical device
 * serves several chains, and the material a pairing extracts is chain-specific
 * (Cardano: the CIP-1852 account xpub; Bitcoin: the BIP-84 account xpub + the
 * device master fingerprint), so the guest names the chain alongside the
 * transport. Absent ⇒ 'Cardano' — a guest that predates the parameter keeps its
 * behaviour (an additive param is not a new capability, ADR 35).
 */
export type HwPairBlockchain = 'Bitcoin' | 'Cardano';

/**
 * Answer to `cardano.requestSignTx` (ADR 41/36): never a witness —
 * the ceremonyId is the handle for the `cardano.getSignTxResult` poll.
 */
export type SignTxRequestHandle = { ceremonyId: string; mounted: boolean };

/**
 * The `cardano.getSignTxResult` poll answer. The witness set cbor is not
 * secret (it returns to the requester); the password and root key never
 * leave the host's surface page.
 */
export type SignTxResult =
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'signed'; witnessCborHex: string };

/**
 * Answer to `settings.setActiveNetwork` (ADR 41 `lace.settings`): `recorded`
 * is true once the host persisted the active-network record. A push naming a
 * blockchain the host does not know is still recorded (forward compatibility),
 * so `recorded` never doubles as a "known blockchain" signal.
 */
export type SetActiveNetworkResult = { recorded: boolean };

/**
 * Answer to `settings.setLanguage` (ADR 41 `lace.settings`): `recorded` is true
 * once the host persisted the language preference. Mirrors
 * `SetActiveNetworkResult`'s forward-compat posture — the host records the tag
 * OPAQUELY and consults only the languages it bundles, so `recorded` never
 * doubles as a "language supported by this host" signal.
 */
export type SetLanguageResult = { recorded: boolean };

/**
 * Where a toolbar click puts the wallet UI: Chrome's side panel, or a full
 * browser tab. The host owns the selection at rest and the toolbar wiring; the
 * guest declares which of these its experience supports (ADR 53) and offers the
 * user the choice (ADR 41 `lace.settings`).
 */
export type ViewMode = 'sidePanel' | 'tab';

/**
 * Answer to `settings.getViewMode` (ADR 41 `lace.settings`).
 *
 * `selected` is the user's recorded choice — preserved verbatim even while it is
 * unserveable, so a guest that stops declaring a mode and later declares it
 * again finds the choice intact. `supported` is what THIS experience declared
 * (never empty). `effective` is what a toolbar click actually does: `selected`
 * when `supported` contains it, otherwise the fallback the host is serving.
 * Render the choice from `supported` and the current state from `effective`.
 */
export type GetViewModeResult = {
  selected: ViewMode;
  supported: readonly ViewMode[];
  effective: ViewMode;
};

/**
 * Answer to `settings.setViewMode` (ADR 41 `lace.settings`): `recorded` is true
 * once the host persisted the selection. It never doubles as "this mode is now
 * in effect" — a mode the experience does not declare is recorded but falls back
 * on read (see `GetViewModeResult`), and Chrome applies the new toolbar target
 * from the NEXT toolbar click onward (the current view stays where it is).
 */
export type SetViewModeResult = { recorded: boolean };

/**
 * The monolith's GUEST-owned persisted slices, as served by
 * `settings.migrateMonolithGuestData` (ADR 38).
 *
 * Each entry is one parsed redux-persist slice state and is OPAQUE to the host:
 * it un-wraps the envelope and hands the record over untouched, because these
 * are GUEST slices the host holds no schema for — every interpretation (the
 * guest's own slice migrations, what an ambiguous address-book network id means)
 * is the guest's. `null` for a key the profile does not carry; all three `null`
 * is the EMPTY pull — a profile that never ran the monolith, or one whose import
 * already completed.
 */
export type MonolithGuestData = {
  addressBook: Record<string, unknown> | null;
  tokenFolders: Record<string, unknown> | null;
  analytics: Record<string, unknown> | null;
};

/**
 * Answer to `settings.migrateMonolithGuestDataDone` (ADR 38): whether any of the
 * three legacy keys was still present and got deleted. `false` means there was
 * nothing to clear — a never-migrated profile and an already-cleared one answer
 * alike (idempotent, never an error), the `RevokeDappResult` posture.
 */
export type MonolithGuestDataDoneResult = { cleared: boolean };

/**
 * One projected grant entry of `dapps.list` (ADR 41 `lace.dapps`): a dapp
 * identity under its blockchain bucket. `blockchain` is an open string (a
 * `BlockchainName` today) — a newer host may serve buckets this contract build
 * does not know, and the guest skips unknown ones. The bound account id is
 * deliberately ABSENT: the grant's account binding is host-internal validation
 * state (ADR 41) — the input to grant validation, the `-4 AccountChange`
 * decision and the grant sweeps, none of which a guest surface takes part in —
 * so it is withheld on need-to-know.
 */
export type AuthorizedDappInfo = {
  blockchain: string;
  dapp: { id: string; imageUrl: string; name: string; origin: string };
};

/**
 * Answer to `dapps.revoke` (ADR 41 `lace.dapps`): whether a grant entry was
 * deleted. `false` means nothing matched `{ blockchain, origin }` —
 * already-revoked and never-granted answer alike (idempotent, never an
 * error).
 */
export type RevokeDappResult = { revoked: boolean };

/**
 * The `bitcoin.getSignTxResult` poll answer (ADR 36). Mirrors the Cardano
 * `SignTxResult` above; the finalized raw tx hex is not secret (it returns to
 * the requester for submission — the guest re-wraps it into its executor DTO).
 *
 * D4: only the PSBT crosses the wire on `bitcoin.requestSignTx` — the host
 * self-derives the native-segwit signer and resolves every input against its
 * OWN utxo authority, so the guest-authored signers/display metadata never
 * reach the host; the password and seed never leave the host's surface page.
 */
export type BitcoinSignTxResult =
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'signed'; signedTxHex: string };

/**
 * One Midnight account's PUBLIC material, as projected into
 * `WalletInfo.midnightAccounts` (ADR 43) and echoed as `midnightAccount` in a
 * `MidnightStateSnapshot`. Midnight publics CANNOT be derived WASM-free, so an
 * entry exists only once the host engine has computed it on first activation
 * and written it back to the vault as public data. PUBLIC material only — no
 * key or seed crosses here.
 */
export type MidnightAccountInfo = {
  /** Derivation index (the account index passed to HDWallet.selectAccount). */
  accountIndex: number;
  /**
   * The Midnight SDK network id string the account belongs to (e.g. 'mainnet',
   * 'testnet') — mirrors the monolith `MidnightSDKNetworkId` (ADR 11).
   */
  networkId: string;
  /** bech32m shielded (Zswap) address. */
  shieldedAddress: string;
  /** bech32m unshielded (Night) address. */
  unshieldedAddress: string;
  /** bech32m dust address. */
  dustAddress: string;
  /**
   * The account's display name (the per-account metadata name), as carried by
   * the `wallets.list` projection. OPTIONAL because the OTHER producer of this
   * shape — the engine's `MidnightStateSnapshot` echo — holds no vault metadata,
   * and because a guest served by a host predating the field gets none; both
   * fall back to the wallet name.
   */
  name?: string;
  /**
   * The account's shielded public keys, bech32m under the SDK's own
   * `mn_shield-cpk` / `mn_shield-epk` HRPs (network-qualified off mainnet, like
   * the addresses) — the encoding `midnight-dapp.getShieldedAddresses` must
   * serve. NOT secret; mirrors the monolith's `MidnightAccountPublicKeys`
   * (coinPublicKey = ShieldedCoinPublicKey, encryptionPublicKey =
   * ShieldedEncryptionPublicKey).
   */
  publicKeys: {
    coinPublicKey: string;
    encryptionPublicKey: string;
  };
};

/**
 * `midnight.getSyncStatus` answer (ADR 47) — a pull-only snapshot that never
 * prompts and never starts the engine. `engineLive` is whether the offscreen
 * engine is currently running this account; `keysWarm` whether the role keys
 * are currently in the host warm-key bus (ADR 34); `synced` is the SDK's strict
 * completion aggregate (all active sub-wallets `isStrictlyComplete`, mirroring
 * the monolith `syncProgress$.isStrictlyComplete`). `progress` carries the three
 * sub-wallet sync ratios in 0..1 (the monolith `syncProgress$` Percents) and is
 * `null` when the engine is cold with no checkpoint projection to report.
 */
export type MidnightSyncStatus = {
  engineLive: boolean;
  keysWarm: boolean;
  synced: boolean;
  progress: { shielded: number; unshielded: number; dust: number } | null;
};

/**
 * One token-type balance line of a Midnight snapshot — the summed available and
 * pending coin values for a raw token type, mirroring the monolith's per-address
 * `{ available, pending }` aggregation in the Midnight watch effects. Both ride
 * as DECIMAL STRINGS (the transport convention above; Midnight values can exceed
 * 2^53 and the wire is JSON).
 */
export type MidnightTokenBalance = {
  /** The raw token type identifier (the monolith's `RawTokenType`). */
  tokenType: string;
  /** Summed available (spendable) coin value, decimal string. */
  available: string;
  /** Summed pending coin value, decimal string. */
  pending: string;
};

/**
 * One Midnight transaction-history entry, minimally mirroring the monolith's
 * activity mapping (mapTxHistoryEntryToActivity): the tx `id` (hash), the
 * `timestamp` in ms, the resolved `direction`, and the per-token-type balance
 * `deltas` (signed decimal strings — positive received, negative spent). The
 * host resolves `direction` from the SDK entry status + deltas so the guest need
 * not re-run the monolith's status→type logic; `pending`/`failed` mirror the
 * SDK's PARTIAL_SUCCESS/FAILURE statuses.
 */
export type MidnightHistoryEntry = {
  /** Transaction hash — the activity identifier. */
  id: string;
  /** Observation time in ms since the epoch (0 when unknown). */
  timestamp: number;
  /** Resolved transfer direction / lifecycle state. */
  direction: 'failed' | 'incoming' | 'outgoing' | 'pending';
  /** Signed balance change per raw token type, decimal strings. */
  deltas: { tokenType: string; amount: string }[];
};

/**
 * `midnight.getState` answer (ADR 47) — the guest's pull-only view of a Midnight
 * account, served from the live engine when running else from the persisted
 * checkpoint projection (never prompts). `midnightAccount` is the same PUBLIC
 * material projected into `wallets.list`. Balances and dust ride as DECIMAL
 * STRINGS (transport convention above). `generationDetails` is a JSON-safe
 * mirror of the monolith's `DustGenerationDetails` (bigints → decimal strings,
 * epoch-ms timestamps or `null`); it is `null` when the account holds no
 * dust-generating coins.
 */
export type MidnightStateSnapshot = {
  midnightAccount: MidnightAccountInfo;
  shieldedCoins: MidnightTokenBalance[];
  unshieldedCoins: MidnightTokenBalance[];
  dust: {
    /** Total generated dust — available PLUS the coins a pending transaction
     * holds, decimal string. What to display. */
    balance: string;
    /** The SPENDABLE subset of `balance`, decimal string. A build moves the
     * whole dust coin it pays with into pending, so this is the only figure
     * that answers whether the account can fund another transfer. */
    available: string;
    generationDetails: {
      /** Current generated dust value, decimal string. */
      currentValue: string;
      /** Maximum dust cap, decimal string. */
      maxCap: string;
      /** Dust generation rate, decimal string. */
      rate: string;
      /** Earliest decay time, epoch ms (null when unknown). */
      decayTime: number | null;
      /** Latest max-cap-reached time, epoch ms (null when unknown). */
      maxCapReachedAt: number | null;
    } | null;
  };
  transactionHistory: MidnightHistoryEntry[];
};

/**
 * `midnight.requestSend` params (ADR 47/D6) — the transfer FACTS, mirroring the
 * monolith's `MidnightTxParameters` (amount, receiverAddress, token `type`,
 * `tokenKind`) plus the account routing (`walletId` + `accountIndex`) and the
 * explicit `network` (ADR 48 — every Midnight call names its network). NOT tx
 * bytes: the host engine builds, signs, proves and submits host-side (D6), so
 * the guest never touches transaction bytes. `amount` rides as a DECIMAL STRING
 * (transport convention above).
 */
export type MidnightSendParams = {
  walletId: string;
  accountIndex: number;
  /** The Midnight SDK network id string (mirrors `MidnightSDKNetworkId`). */
  network: string;
  /** Transfer amount in the token's base units, decimal string. */
  amount: string;
  /** bech32m receiver address. */
  receiverAddress: string;
  /** The token identifier being transferred (`MidnightTxParameters.type`). */
  type: string;
  /** Whether the transferred token is shielded or unshielded. */
  tokenKind: 'shielded' | 'unshielded';
};

/**
 * `midnight.getSendResult` poll answer (ADR 47). The full sign→prove→submit
 * pipeline completes HOST-SIDE (the engine owns the state a build needs), so the
 * result is terminal for the guest: `confirmed` carries the submitted `txId`,
 * `failed` a reason string; the guest never touches tx bytes. Mirrors the
 * `{ status }` discriminant of the Cardano `SignTxResult` above.
 */
export type MidnightSendResult =
  | { status: 'cancelled' }
  | { status: 'confirmed'; txId: string }
  | { status: 'failed'; reason: string }
  | { status: 'pending' };

/**
 * Answer to `midnight.requestResetSyncState` (ADR 47): whether a persisted sync
 * checkpoint existed for the account and was deleted. `false` means there was
 * nothing to clear — a never-synced account and an already-cleared one answer
 * alike (idempotent, never an error), the `RevokeDappResult` posture.
 */
export type MidnightResetSyncStateResult = { cleared: boolean };

// ---------------------------------------------------------------------------
// Per-method contract — the v1 capability set (ADR 41)
// ---------------------------------------------------------------------------

/**
 * Request/response contract per `window.lace` v1 method. Methods without
 * params declare `params: undefined` (call `request(method)` with nothing).
 *
 * Wallet-ops split (ADR 41/36): `wallets.list` is the one wallet DATA
 * method. The `wallets.request*` methods are SURFACE REQUESTS — the guest
 * may only ASK for the create/import/manager ceremonies. Per-op management
 * (rename, remove, add-account) runs INSIDE the host-origin wallet-manager
 * surface and is deliberately ABSENT from this API: ceremony surfaces render
 * vault wallet names as trust anchors, so even a rename is host-origin
 * input, and there is NO direct `wallets.remove`/`wallets.create` data
 * method — secrets and irreversible ops never ride the provider API.
 *
 * Chain data plane (ADR 33/41): the `cardano.*` methods are the
 * host-owned data subset. The host holds no active-account state, so every
 * call is SELF-DESCRIBING: ACCOUNT-SCOPED calls
 * (`getAddresses`/`getUtxos`/`getBalance`) carry `{ walletId, accountIndex,
 * networkMagic }` — a wallet holds one Cardano account PER provisioned network
 * at every index, all sharing the same xpub (ADR 48), so `(walletId,
 * accountIndex)` alone is ambiguous and the magic disambiguates the exact
 * account (ADR 11), exactly as `bitcoin.getUtxos` names its network.
 * ACCOUNT-AGNOSTIC calls carry the network the same way: `getParams` and
 * `submitTx` take
 * `{ networkMagic }` (submitTx carries NO walletId — the host attributes the
 * pending overlay to the owning account by decoding the tx inputs against its
 * own per-account address/utxo authority). Lovelace rides as DECIMAL STRINGS
 * (see the transport convention above).
 *
 * Signing (ADR 41/36): `cardano.requestSignTx` names the SIGNING
 * ACCOUNT by its network-specific `accountId` (the ADR-13 composite
 * `${walletId}-${accountIndex}-${networkMagic}`) alongside the NON-SECRET tx
 * cbor — the id names the exact account across provisioned networks (ADR 48:
 * the same index exists once per provisioned network; ADR 11), so any account
 * of the wallet signs, not just the primary. It may
 * only ASK for the host-rendered canonical-summary + signing surface; there is
 * NO inline password parameter anywhere. `cardano.getSignTxResult` is the
 * completion POLL.
 *
 * There are deliberately NO `dapp.*` methods: the dapp-connect approval is
 * a HOST-ORIGIN trusted surface (ADR 36) that talks to the host service
 * worker directly — the guest plays no part in the connect ceremony.
 */
export type LaceMethodMap = {
  'wallets.list': { params: undefined; result: WalletInfo[] };
  /**
   * The optional `midnightNetwork` is the guest's active Midnight SDK network
   * id (e.g. `'preprod'`) — a NON-SECRET hint (ADR 34/41) the host warms at
   * first-sync so the guest's actual network is synced without an unlock
   * prompt. The wallet NAME is still typed INSIDE the host ceremony surface
   * (ADR 36 — the ceremony contains every input, name included; the guest
   * orchestrates only choice/education/success).
   */
  'wallets.requestCreate': {
    params: { midnightNetwork?: string } | undefined;
    result: SurfaceMountResult;
  };
  'wallets.requestImport': {
    params: { midnightNetwork?: string } | undefined;
    result: SurfaceMountResult;
  };
  /** Mounts the wallet-manager surface (ADR 36): rename / remove /
   * add-account / recovery-phrase reveal are per-op ceremonies INSIDE it,
   * never API methods. The optional params are NON-AUTHORITATIVE navigation
   * hints — the host re-validates them against its own wallet list, every op
   * still confirms (or takes its password) in-surface, and an invalid or
   * inapplicable hint degrades to the manager's list view. `accountIndex`
   * pre-selects the account of a 'remove-account' view. */
  'wallets.requestManager': {
    params:
      | {
          view?:
            | 'add-account'
            | 'recovery-phrase'
            | 'remove-account'
            | 'remove-wallet'
            | 'rename';
          walletId?: string;
          accountIndex?: number;
        }
      | undefined;
    result: SurfaceMountResult;
  };
  /**
   * Mounts the wallet-manager surface on its ACCOUNT-rename view (ADR 36) —
   * a method of its own rather than a `wallets.requestManager` view hint,
   * because a host predating the view silently DROPS an unknown hint and mounts
   * the plain list instead: a capability the guest can feature-detect (ADR 41)
   * is the only way to tell the two hosts apart.
   *
   * Like every `wallets.request*` this only ASKS: the account is chosen — and
   * the new name typed — on host-origin DOM, because account names are trust
   * anchors the host's own dapp-connect picker renders. The params are
   * NON-AUTHORITATIVE hints re-validated against the host's wallet list; one
   * naming no account the wallet holds degrades to the manager's list view.
   */
  'wallets.requestRenameAccount': {
    params: { walletId?: string; accountId?: string } | undefined;
    result: SurfaceMountResult;
  };
  /**
   * Mount the hardware-wallet pairing ceremony for `device` (ADR 36 §3 /
   * ADR 44). Pairing MINTS A NEW WALLET from the device's account-0 xpub, so it
   * is an ADD-WALLET action the guest raises from its onboarding / "add wallet"
   * entry — NOT an add-account (adding an account to an existing hardware wallet
   * is a per-op ceremony inside the manager surface, never a provider method).
   * Like the other `wallets.request*` surface requests the guest only ASKS: the
   * transport, device I/O and xpub extraction all run inside the host-origin
   * pairing window, and completion is observed by polling `wallets.list`.
   *
   * `blockchain` selects which chain's material the pairing extracts; absent ⇒
   * 'Cardano'. A Bitcoin pairing touches NO Cardano interface on the device.
   *
   * `{ probe: true }` is the OBSERVE-ONLY form: it opens nothing and answers
   * whether a pairing window is currently mounted. The ceremony resolves on
   * MOUNT and reports nothing on settle (ADR 36), so a pairing the user
   * CANCELLED by closing the window reaches the guest only as that window
   * disappearing — this is the pull the guest needs to retract its in-flight
   * notice promptly instead of waiting on a focus event and a grace timer. An
   * additive param, not a new capability (ADR 35): a host predating it treats the
   * call as an ordinary request, so a probing guest must gate on observing
   * `mounted: true` at least once before reading a `false` as "closed". */
  'wallets.requestConnectHardware': {
    params:
      | { device: HwDevice; blockchain?: HwPairBlockchain }
      | { probe: true };
    result: SurfaceMountResult;
  };
  /**
   * External + used-internal addresses of the ACCOUNT (`{ walletId,
   * accountIndex, networkMagic }`; the magic names the exact account — see the
   * account-scoped convention above). `addresses` is the external set ([0] is
   * the primary receive address); `internal` is the used change (role-1) set.
   * The guest reconstructs full address data for both roles from the account
   * xpub and needs the used-internal set so change-address utxos survive its
   * franken filter.
   *
   * `rewardAccounts` is the account's DISCOVERED stake accounts (primary
   * [stake key 0] first), empty when the wallet has no Cardano account at that
   * (index, magic). The guest cannot derive this set — how far the host's
   * stake-key walk got is host knowledge — and needs it to attribute a
   * stake-scoped read to the owning account: an account holding more than one
   * stake key would otherwise strand every key past the first.
   *
   * `forceRediscover` is the USER-TRIGGERED escape hatch behind the guest's
   * "HD wallet sync" control (`thorough` discovery): the host discards its
   * persisted walk for the account and re-walks from scratch. The host's walk
   * is otherwise written once per (xpub, networkMagic) and never re-validated,
   * so an address first used after that write — by another wallet app on the
   * same seed, or because the account had no history at all when the record was
   * written — stays invisible until this flag is set. Optional and default-off:
   * a host that predates it ignores the extra param and answers from its cache,
   * which is exactly the pre-flag behaviour (ADR 35 — an additive param is not
   * a new capability).
   *
   * `nextUnusedExternal` is the account's one UNUSED receive address: external
   * {stake key 0, index = highest used external index + 1}, or {index 0} when it
   * has no external history. Neither set above can express it — they carry used
   * addresses plus the forced primary — and the host's own dapp hub answers
   * CIP-30 getUnusedAddresses from it (monolith `getNextUnusedAddress` parity,
   * a single address there too). Absent when the wallet has no Cardano account
   * at that (index, magic), like the empty sets, or against a host predating it.
   */
  'cardano.getAddresses': {
    params: {
      walletId: string;
      accountIndex: number;
      networkMagic: number;
      forceRediscover?: boolean;
    };
    result: {
      addresses: string[];
      internal: string[];
      rewardAccounts: string[];
      nextUnusedExternal?: string;
    };
  };
  /** Fresh, host-overlay-adjusted unspent outputs of the ACCOUNT (ADR 33 pull
   * model; the magic names the exact account). */
  'cardano.getUtxos': {
    params: { walletId: string; accountIndex: number; networkMagic: number };
    result: { utxos: CardanoUtxo[] };
  };
  'cardano.getBalance': {
    params: { walletId: string; accountIndex: number; networkMagic: number };
    result: { lovelace: string };
  };
  /** Protocol parameters for a network (account-agnostic — the caller names
   * the network). */
  'cardano.getParams': {
    params: { networkMagic: number };
    result: CardanoParams;
  };
  /** Submit a SIGNED tx (cbor hex) to the named network — always via the host
   * (ADR 41), so its pending-tx overlay stays consistent. ACCOUNT-AGNOSTIC:
   * carries NO walletId. The host decodes the tx inputs and attributes the
   * pending overlay to the owning account from its own per-account
   * address/utxo authority on `networkMagic`; a foreign-funded tx (no owning
   * account) still submits, with no overlay entry. */
  'cardano.submitTx': {
    params: { txCbor: string; networkMagic: number };
    result: { txHash: string };
  };
  /**
   * The ACCOUNT's still-live pending-tx overlay entries — the guest's read of
   * the host's in-flight bookkeeping (ADR 34 pull model). A tx the guest itself
   * submitted it already tracks; this exists for the ones it never saw, above
   * all a dapp's `cip30.submitTx`, which the host brokers end to end.
   *
   * Each entry is everything needed to rebuild the pending activity WITHOUT
   * consulting the guest's own (lagging) projection of the account:
   * - `txCbor` — the submitted tx, so the guest derives the activity with the
   *   same cbor-driven derivation its send flow uses;
   * - `ownInputs` — the account's own utxos the tx spends, VALUES INCLUDED.
   *   They cannot be looked up guest-side: host reconciliation subtracts them
   *   from every read the moment the entry lands, so without them the derived
   *   activity would count the change output alone and read as a RECEIVE;
   * - `ownOutputs` — which of the tx's outputs pay back to the account, by
   *   output index. Also not derivable guest-side: change may go to an address
   *   the account has never transacted on, which is absent from the guest's
   *   address set but inside the host's gap walk;
   * - `ttlSlot` — the tx's `invalidHereafter`, past which the host prunes it.
   *
   * Together `ownInputs`/`ownOutputs` are the HOST's own-value verdicts — the
   * account authority that attributed the submit in the first place.
   *
   * The host prunes EXPIRED entries before answering. A confirmed one may still
   * appear until the next utxo read reconciles it away — harmless, since
   * confirmed history replaces the pending row by tx id.
   */
  'cardano.getPendingTxs': {
    params: { walletId: string; accountIndex: number; networkMagic: number };
    result: {
      txs: {
        txHash: string;
        txCbor: string;
        ttlSlot: number;
        ownInputs: CardanoUtxo[];
        ownOutputs: {
          /** Output index within the tx. */
          index: number;
          /** bech32 payment address (one of the account's own). */
          address: string;
          /** Lovelace as a decimal string (transport convention above). */
          lovelace: string;
          /** Native assets — assetId hex → decimal string; absent when ada-only. */
          assets?: Record<string, string>;
        }[];
      }[];
    };
  };
  /** Ask the host to sign a tx for the ACCOUNT named by its network-specific
   * `accountId` — the ADR-13 composite `${walletId}-${accountIndex}-${networkMagic}`
   * (ADR 11): the id names the exact account across provisioned networks, and the
   * host resolves the wallet + derivation from it — so any account signs, not just
   * the primary. Carries NO password; the secret is typed only inside the
   * host-origin signing surface. */
  'cardano.requestSignTx': {
    params: {
      accountId: string;
      txCbor: string;
    };
    result: SignTxRequestHandle;
  };
  'cardano.getSignTxResult': {
    params: { ceremonyId: string };
    result: SignTxResult;
  };
  /**
   * Record the guest's ACTIVE network for a blockchain (ADR 41 `lace.settings`).
   * The host holds no active-account/network context of its own — this is the
   * ONE piece of guest-authored state it records, and it uses it ONLY in its
   * dapp-hub role: validating the granted account on every CIP-30 call and
   * filtering the connect picker. The guest pushes this on boot and on every
   * active-network change.
   *
   * `blockchain` is an open string (a `BlockchainName` today) so a newer guest
   * can name blockchains this host does not know; such a push is recorded
   * opaquely and consulted only by the dapp legs that know the blockchain.
   * The network identity rides in the chain's OWN terms — never the guest's
   * opaque `BlockchainNetworkId`, which the host cannot decode: `networkMagic`
   * for Cardano (the host is Cardano-magic-centric on the wire, cf. `getParams`
   * / `submitTx`), `networkId` for Midnight (the SDK network id string its
   * accounts and engine sessions are keyed by, ADR 50). EXACTLY ONE of the two
   * rides on a push; the host rejects a payload carrying both or neither.
   */
  'settings.setActiveNetwork': {
    params: { blockchain: string; networkMagic?: number; networkId?: string };
    result: SetActiveNetworkResult;
  };
  /**
   * Record the guest's ACTIVE UI language (ADR 41 `lace.settings`, mirror of
   * `settings.setActiveNetwork`). The host holds no display state of its own —
   * this is the ONE UI preference it records, and it uses it ONLY to pick which
   * bundled locale its trusted surfaces render (the guest never styles a host
   * surface). The guest pushes this on boot and on every language change.
   *
   * `language` is an OPEN string (a BCP-47 tag the guest picked) so a newer
   * guest can name a language this host build does not bundle; such a push is
   * recorded opaquely and never consulted — the host falls back to the device
   * language / English. The host bounds the length (rejecting an oversized tag)
   * but never rejects an unknown-but-plausible tag.
   */
  'settings.setLanguage': {
    params: { language: string };
    result: SetLanguageResult;
  };
  /**
   * Read where a toolbar click puts the wallet UI (ADR 41 `lace.settings`): the
   * user's recorded selection, the modes THIS experience declared, and the mode
   * actually in effect (see `GetViewModeResult` for how the three relate). The
   * host is the single writer of the selection, so this read — not any guest
   * copy — is the truth the settings UI renders.
   */
  'settings.getViewMode': { params: undefined; result: GetViewModeResult };
  /**
   * Record the user's toolbar-click target (ADR 41 `lace.settings`). A data
   * method, not a ceremony: it moves no secret and nothing irreversible, and the
   * guest's own sheet is the confirmation.
   *
   * Takes effect on the NEXT toolbar click: opening the side panel requires a
   * user gesture, which the guest's `request` does not carry into the host, so
   * the host re-targets the toolbar rather than relocating the open view. A mode
   * this experience does not declare is still recorded (the user's choice
   * survives a guest rollback) but falls back on read.
   */
  'settings.setViewMode': {
    params: { mode: ViewMode };
    result: SetViewModeResult;
  };
  /**
   * Mount the host's app-settings surface (ADR 36 / ADR 60): the
   * guest-experience picker — which Lace experience this browser opens. The
   * picker is host-rendered on purpose: there is deliberately no `settings.*`
   * setter for the experience, so a guest can only ASK for the surface, never
   * record a selection of its own (a silent guest-callable writer would hand a
   * compromised first-party build a persistence primitive past the operator's
   * rollback lever). No params — the setting is profile-global, and the
   * surface pulls the active selection from the host itself.
   */
  'settings.requestAppSettings': {
    params: undefined;
    result: SurfaceMountResult;
  };
  /**
   * The full grant-table projection (ADR 41 `lace.dapps`): every blockchain
   * bucket's grants as dapp identities (see `AuthorizedDappInfo` — the bound
   * account never rides the wire). Read-only and non-secret; the guest renders
   * its Authorized DApps view from it and re-pulls on its own triggers
   * (ADR 35 — the host pushes no grant-change event).
   */
  'dapps.list': { params: undefined; result: AuthorizedDappInfo[] };
  /**
   * Delete the grant for `{ blockchain, origin }` (ADR 41 `lace.dapps`): the
   * ONE grant mutation exposed as a direct provider method, because revoking
   * is strictly privilege-reducing — it can only cut a dapp off, never extend
   * access (grant CREATION stays a host approval ceremony). Idempotent — an
   * unmatched entry answers `{ revoked: false }`, never an error.
   */
  'dapps.revoke': {
    params: { blockchain: string; origin: string };
    result: RevokeDappResult;
  };
  /**
   * Fresh, host-overlay-adjusted unspent outputs of the Bitcoin ACCOUNT (ADR 46,
   * ADR 33 pull model). Unlike Cardano, `network` MUST ride the wire: the wallet
   * holds BOTH network accounts (mainnet AND testnet4) at every index, so
   * `(walletId, accountIndex)` is not canonical for Bitcoin — the network
   * disambiguates the exact account (ADR 11). The host derives the single
   * native-segwit receive address locally from the account xpub (the only
   * address Lace ever produces) and serves its overlay-adjusted utxos.
   */
  'bitcoin.getUtxos': {
    params: {
      walletId: string;
      accountIndex: number;
      network: 'mainnet' | 'testnet4';
    };
    result: { utxos: BitcoinUtxo[] };
  };
  /**
   * Submit a signed raw tx (hex) to the named network — always via the host
   * (ADR 41), so its pending-tx overlay stays consistent. ACCOUNT-AGNOSTIC:
   * carries NO walletId. The host decodes the tx inputs and attributes the
   * pending overlay to the owning account by matching their outpoints against
   * each servable Bitcoin account's own overlay-adjusted utxo view; a
   * foreign-funded tx (no owning account) still submits, with no overlay entry.
   */
  'bitcoin.submitTx': {
    params: { rawTxHex: string; network: 'mainnet' | 'testnet4' };
    result: { txId: string };
  };
  /**
   * Ask the host to sign a Bitcoin tx for the ACCOUNT (`{ walletId,
   * accountIndex, network }`; the network disambiguates the exact account, as
   * for `bitcoin.getUtxos`). D4: ONLY the PSBT crosses the wire — the host
   * self-derives the native-segwit signer, resolves every input against its own
   * utxo authority and renders/verifies the summary from the decoded PSBT + that
   * resolution. Carries NO password; the secret is typed only inside the
   * host-origin signing surface. Reuses `SignTxRequestHandle` (the ceremonyId is
   * the `bitcoin.getSignTxResult` poll handle).
   */
  'bitcoin.requestSignTx': {
    params: {
      walletId: string;
      accountIndex: number;
      network: 'mainnet' | 'testnet4';
      psbtHex: string;
    };
    result: SignTxRequestHandle;
  };
  'bitcoin.getSignTxResult': {
    params: { ceremonyId: string };
    result: BitcoinSignTxResult;
  };
  /**
   * Ensure the offscreen Midnight engine is running and tracking the ACCOUNT
   * (`{ walletId, accountIndex, network }`; `network` names the SDK network, as
   * every Midnight call does, ADR 48). Raises the host auth prompt if the role
   * keys are cold (ADR 47 — the one guest-visible way a read prompts) and
   * returns immediately; progress is observed via `midnight.getSyncStatus`.
   */
  'midnight.requestSync': {
    params: { walletId: string; accountIndex: number; network: string };
    result: { syncId: string };
  };
  /** Pull-only sync status of the ACCOUNT (ADR 47) — never prompts, never
   * starts the engine. */
  'midnight.getSyncStatus': {
    params: { walletId: string; accountIndex: number; network: string };
    result: MidnightSyncStatus;
  };
  /**
   * Pull-only state snapshot of the ACCOUNT (ADR 47) — addresses, coins by token
   * type (shielded/unshielded), dust balance + generation details, public keys
   * and tx history; served from the live engine when running else the persisted
   * checkpoint projection. `null` when nothing is known yet (never computed, no
   * checkpoint). Never prompts.
   */
  'midnight.getState': {
    params: { walletId: string; accountIndex: number; network: string };
    result: MidnightStateSnapshot | null;
  };
  /**
   * Ask the host to send a Midnight transfer for the account named in `params`
   * (ADR 47/D6): the guest sends transfer FACTS, not tx bytes. The host mounts
   * the sign surface and the engine builds → signs → proves → submits host-side.
   * Carries NO password; the secret is typed only inside the host-origin sign
   * surface. `ceremonyId` is the `midnight.getSendResult` poll handle.
   */
  'midnight.requestSend': {
    params: MidnightSendParams;
    result: { ceremonyId: string };
  };
  'midnight.getSendResult': {
    params: { ceremonyId: string };
    result: MidnightSendResult;
  };
  /**
   * Clear the host's PERSISTED Midnight sync checkpoint for the ACCOUNT
   * (`{ walletId, accountIndex, network }` — the routing every Midnight call
   * carries, ADR 47/48) after stopping its engine session: the escape hatch for
   * an account whose checkpoint has gone bad. Completes INLINE — no ceremony, no
   * poll handle — and never prompts: it deletes host-derived CACHE only, never
   * wallet material. Ordering is load-bearing host-side (the stop halts
   * persistence before the wipe, so no in-flight flush revives the cleared
   * checkpoint). Idempotent — an account with no checkpoint answers
   * `{ cleared: false }`. Sync resumes on the guest's own terms: its poll sees
   * the engine cold and re-issues `midnight.requestSync`, which resyncs the
   * account from scratch.
   */
  'midnight.requestResetSyncState': {
    params: { walletId: string; accountIndex: number; network: string };
    result: MidnightResetSyncStateResult;
  };
  /**
   * Read the monolith's GUEST-owned persisted slices out of the extension's
   * storage (ADR 38). The relocation of the HOST-owned slices happens entirely
   * host-side; these three are guest state, and the sandboxed cross-origin guest
   * has no `chrome.*` (ADR 35) — so this call is the storage hop it cannot make
   * itself, nothing more. The payloads cross OPAQUELY (see `MonolithGuestData`).
   *
   * IDEMPOTENT until the guest reports its import: the legacy keys are retained,
   * so a guest that dies between importing and reporting re-pulls the same
   * payload on its next boot.
   */
  'settings.migrateMonolithGuestData': {
    params: undefined;
    result: MonolithGuestData;
  };
  /**
   * Report that the guest has DURABLY persisted the pulled data, and delete the
   * three legacy keys (ADR 38). The ONLY deleter of monolith guest state — the
   * host-relocated `redux:persist:*` keys are retained for rollback and are
   * never touched here.
   *
   * Call it only once the import is in the guest's own storage: the keys are the
   * sole copy afterwards, so reporting early trades a crash for permanent data
   * loss. Idempotent (see `MonolithGuestDataDoneResult`).
   */
  'settings.migrateMonolithGuestDataDone': {
    params: undefined;
    result: MonolithGuestDataDoneResult;
  };
};

/**
 * The advertised capability set = the v1 method names. The host's baked
 * LACE_CAPABILITIES constant `satisfies readonly LaceCapability[]`, and its
 * SW method registry is `Record<LaceCapability, …>` — so the advertised
 * list, the handlers and this contract cannot drift (the probe harness
 * additionally smoke-asserts the runtime list, e2e/specs/03-gate.spec.ts).
 */
export type LaceCapability = keyof LaceMethodMap;

export type LaceMethodParams<M extends LaceCapability> =
  LaceMethodMap[M]['params'];

export type LaceMethodResult<M extends LaceCapability> =
  LaceMethodMap[M]['result'];

// ---------------------------------------------------------------------------
// Guest-origin release artifacts — lace.json is emitted by the guest build;
// release.json is the operator-owned CD pointer (ADR 54). Both are read by the
// host and by the guest boot.
// ---------------------------------------------------------------------------

/**
 * Schema of the guest-served `/lace.json` experience manifest (ADR 53):
 * TOP-LEVEL surface names map to URLs — in practice panel-only, since every
 * per-operation surface is a HOST-ORIGIN trusted surface now (ADR 36;
 * the per-blockchain nesting left with the guest dapp-connect picker).
 * Every surface URL must resolve SAME-ORIGIN with the experience origin —
 * the host validates fail-closed and deliberately parses the fetched document
 * as untrusted `unknown`, tolerating unknown non-string fields for forward
 * compatibility.
 */
export type LaceManifest = Readonly<Record<string, string>>;

/**
 * Schema of the operator-owned `/release.json` served at the guest origin ROOT
 * (ADR 54): the network-first, non-blocking release check the guest boot runs
 * against its baked build version. It is the origin's ONLY mutable document —
 * every release tree it names is immutable — and is deliberately never
 * precached by any guest SW (a cache-first pointer bricks clients).
 *
 * `dir` is the origin-root directory holding that release's self-contained
 * tree; both named trees are served CONCURRENTLY, so an unselected client
 * loads `previous` explicitly rather than "whatever was cached". `previous` is
 * always present — the first deploy under this model sets it equal to
 * `current` — so cohort selection never special-cases a missing entry.
 *
 * `current.rolloutPercent` is 0–100: a client self-selects by hashing a stable
 * install id against it (`selectRelease` below), taking `current` inside the
 * cohort and `previous` outside it. Those two jobs — which release an install
 * runs, and which release a rollback swaps back to — are the pointer's whole
 * remit: it carries no version floor and no remote stop lever, so it can never
 * evict a build that is already running (ADR 54).
 */
export type ReleaseManifest = {
  current: { version: string; dir: string; rolloutPercent: number };
  previous: { version: string; dir: string };
};

/**
 * A release directory is ONE path segment at the origin root. The pattern is
 * what keeps a pointer from steering a mount base out of the release tree
 * (`..`, a nested path, an empty segment). BOTH sides validate a fetched
 * pointer with it, so a directory one of them would refuse can never be the one
 * the other loads; the host's same-origin validation
 * (apps/lace-extension-shell/src/shell/experience.ts) remains the load-bearing
 * check and is unaffected by it.
 */
const RELEASE_DIR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const isReleaseDirectory = (value: unknown): value is string =>
  typeof value === 'string' && RELEASE_DIR_PATTERN.test(value);

/**
 * FNV-1a (32-bit) over the key, mapped onto a 0–99 bucket. Any stable,
 * well-distributed, dependency-free hash serves; what matters is that host and
 * guest compute the SAME bucket from the same key, which is why it is defined
 * once here rather than on either side.
 */
const releaseBucket = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
};

/**
 * The release this install runs (ADR 54 staged rollout). PURE and
 * DETERMINISTIC: the same `(manifest, installId)` always answers the same
 * entry, on both sides of the host↔guest boundary.
 *
 * The bucket is drawn from the install id AND `current.version`, so a cohort
 * only ever GROWS as `rolloutPercent` is raised for a given release (an install
 * already on `current` is never pushed back to `previous` mid-ramp), while the
 * next release re-draws it — the same installs are not the canaries every time.
 *
 * `rolloutPercent` 0 answers `previous` for every install and 100 answers
 * `current` for every install. `previous` is the fallback for anything else the
 * comparison cannot honour (a NaN percent): it names bytes that were already
 * live. On a bootstrap pointer, where `previous` equals `current`, both answers
 * are the same tree — which is why selection needs no special case for it.
 */
export const selectRelease = (
  manifest: ReleaseManifest,
  installId: string,
): { version: string; dir: string } => {
  const { current, previous } = manifest;
  return releaseBucket(`${installId}:${current.version}`) <
    current.rolloutPercent
    ? { version: current.version, dir: current.dir }
    : { version: previous.version, dir: previous.dir };
};
