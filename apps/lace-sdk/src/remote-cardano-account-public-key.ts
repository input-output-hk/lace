import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

import { RemoteSignerResultError } from './cardano-remote-signer-factory';

import type { RemoteSignerRequester } from './cardano-remote-signer-factory';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseAccountPublicKeyResult = (
  result: unknown,
  accountIndex: number,
): Bip32PublicKeyHex => {
  if (
    !isRecord(result) ||
    result.accountIndex !== accountIndex ||
    typeof result.extendedAccountPublicKey !== 'string'
  ) {
    throw new RemoteSignerResultError();
  }
  try {
    return Bip32PublicKeyHex(result.extendedAccountPublicKey);
  } catch {
    throw new RemoteSignerResultError();
  }
};

/**
 * Asks the signer for the extended public key of one Cardano account. The
 * signer asks the user to share it, so it is one consent per call; the
 * result is public and safe for the dApp to persist.
 */
export const requestRemoteCardanoAccountPublicKey = async (
  client: RemoteSignerRequester,
  accountIndex: number,
): Promise<Bip32PublicKeyHex> =>
  parseAccountPublicKeyResult(
    await client.request('cardano-account-public-key', { accountIndex }),
    accountIndex,
  );
