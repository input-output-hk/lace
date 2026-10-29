// The stable SDK build resolves wallet-type.stable.ts in place of this file,
// whose enum has no script account wallet type.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

/** The kinds of wallet the wallet repository holds, by who manages their keys. */
export enum WalletType {
  /**
   * Keys are held by the wallet: it stores its recovery phrase encrypted under
   * the app's authentication secret, such as a password the user chooses.
   * A wallet imported without its recovery phrase stores none.
   */
  InMemory = 'InMemory',
  /**
   * Keys, and the seed they derive from, are never stored. The wallet holds
   * only public keys, and a vault module signs for it, reaching the seed for
   * each signature wherever the app keeps it.
   */
  LazyInMemory = 'LazyInMemory',
  /**
   * Keys are managed by an external Ledger device
   */
  HardwareLedger = 'HardwareLedger',
  /**
   * Keys are managed by an external Trezor device
   */
  HardwareTrezor = 'HardwareTrezor',
  /**
   * Keys are managed by an external Cardano Seed Signer device.
   * Like other hardware wallets, the wallet stores only its public keys and
   * the device signs; it also stores the device master fingerprint (xfp) so
   * signing requests can target the right device seed.
   */
  HardwareSeedSigner = 'HardwareSeedSigner',
  /**
   * Keys are managed by an external Keystone device.
   * Like other hardware wallets, the wallet stores only its public keys and
   * the device signs; the device communicates exclusively over QR codes and is
   * identified by its BIP-32 master fingerprint (xfp) so signing requests can
   * target the right device seed.
   */
  HardwareKeystone = 'HardwareKeystone',
  /**
   * Requires more than 1 set of keys to spend from this wallet.
   * Some (or all) co-signers are other wallet (InMemory/Hardware)
   * accounts from this repository.
   */
  MultiSig = 'MultiSig',
  /** A Cardano script account. */
  CardanoCustody = 'CardanoCustody',
}
