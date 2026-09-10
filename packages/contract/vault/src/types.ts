export type HwDevice = 'keystone' | 'ledger' | 'seed-signer' | 'trezor';

/**
 * The blockchain a hardware pairing provisions. One physical device serves
 * several chains and the material a pairing extracts is chain-specific, so the
 * picker resolves a blockchain before dispatching the ceremony.
 */
export type HwPairBlockchain = 'Bitcoin' | 'Cardano';

/**
 * Feature detection for the wallet-mutating ceremonies the active vault arm can
 * launch. Screens gate their entry points on these flags: `undefined` while the
 * `loadVaultCapabilities` addon resolves, then the resolved value.
 */
export type VaultCapabilities = {
  create: boolean;
  import: boolean;
  connectHardware: boolean;
  addAccount: boolean;
  /**
   * Renaming an account. Separate from {@link VaultCapabilities.addAccount}
   * because the two ride different host methods: add-account mounts the wallet
   * manager's generic view, an account rename its own advertised one — so a host
   * that serves the first need not serve the second.
   */
  renameAccount: boolean;
};

/**
 * Where a create/import ceremony was launched from. The in-app arm switches its
 * navigation destination on this; the shell-host arm ignores it.
 */
export type CeremonyOrigin = 'management' | 'onboarding';

/** Names the wallet ceremonies for `ceremonySettled`. */
export type Ceremony =
  | 'add-account'
  | 'connect-hardware'
  | 'create'
  | 'import'
  | 'recovery-phrase'
  | 'remove-account'
  | 'remove-wallet'
  | 'rename-account'
  | 'rename';
