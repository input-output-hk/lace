import { DefaultWalletPolicy } from 'ledger-bitcoin';

import type { LedgerBitcoinSignPsbtProps } from '../ledger-bitcoin-transport';

/**
 * Builds the default single-sig native-segwit wallet policy (wpkh(@0/**))
 * for the account key at the given origin. The Ledger Bitcoin app accepts
 * default policies without on-device registration, so signPsbt runs with a
 * null policy HMAC.
 */
export const nativeSegWitWalletPolicy = ({
  masterFingerprint,
  accountPath,
  extendedPublicKey,
}: LedgerBitcoinSignPsbtProps): DefaultWalletPolicy =>
  new DefaultWalletPolicy(
    'wpkh(@0/**)',
    `[${masterFingerprint}${accountPath.slice(1)}]${extendedPublicKey}`,
  );
