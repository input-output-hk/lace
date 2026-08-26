import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { WalletId } from '@lace-contract/wallet-repo';

import { toTrezorDerivationType } from './derivation-type';
import { getTrezorConnect } from './trezor-connect-bridge';

import type { DerivationType } from '@lace-contract/onboarding-v2';

const CARDANO_PURPOSE_PATH = "1852'";
const CARDANO_COIN_TYPE_PATH = "1815'";

/**
 * Account 0 doubles as the device's seed identity: its xpub is stable per seed
 * and per passphrase, and it rides in the same bundle as the requested account,
 * so the wallet id costs no extra deep-link round-trip.
 */
const SEED_IDENTITY_ACCOUNT_INDEX = 0;

const cardanoDerivationPath = (accountIndex: number) =>
  `m/${CARDANO_PURPOSE_PATH}/${CARDANO_COIN_TYPE_PATH}/${accountIndex}'`;

/** A Cardano extended public key is 64 bytes: 32-byte key + 32-byte chain code. */
const XPUB_HEX_LENGTH = 128;

interface CardanoKeyResponse {
  publicKey?: string;
  xpub?: string;
  node?: { public_key?: string; chain_code?: string };
}

/**
 * Trezor Connect v10 keeps the raw 32-byte key in `publicKey` and moved the
 * extended key to `xpub`; v9 put the extended key in `publicKey`. Suite
 * back-fills the v9 shape only for callers whose manifest reports an npm
 * version starting with "9.", and the deep-link URL carries no version at all
 * — so mobile always sees the v10 shape where the extension sees v9. Every
 * shape is accepted, `node` included, so neither host is version-locked.
 */
const extendedPublicKey = (
  key: CardanoKeyResponse,
  pathLabel: string,
): Bip32PublicKeyHex => {
  const fromNode = `${key.node?.public_key ?? ''}${key.node?.chain_code ?? ''}`;
  const xpub = [key.xpub, key.publicKey, fromNode].find(
    candidate => candidate?.length === XPUB_HEX_LENGTH,
  );

  if (!xpub) {
    throw new Error(
      `Trezor returned no Cardano extended public key for ${pathLabel} ` +
        `(xpub: ${key.xpub?.length ?? 0} hex chars, publicKey: ` +
        `${key.publicKey?.length ?? 0}, node: ${fromNode.length})`,
    );
  }

  return Bip32PublicKeyHex(xpub);
};

export interface CardanoXpubResult {
  /** Account xpub of the requested account index. */
  publicKey: Bip32PublicKeyHex;
  /** Identifier of the seed behind the device, for the wallet id. */
  seedIdentity: string;
}

export const getCardanoXpubViaDeepLink = async (
  accountIndex: number,
  derivationType?: DerivationType,
): Promise<CardanoXpubResult> => {
  const trezor = await getTrezorConnect();

  const bundleItem = (index: number) => ({
    path: cardanoDerivationPath(index),
    showOnTrezor: false,
    derivationType: toTrezorDerivationType(derivationType),
  });

  const result = await trezor.cardanoGetPublicKey({
    bundle: [bundleItem(SEED_IDENTITY_ACCOUNT_INDEX), bundleItem(accountIndex)],
  });

  if (!result.success) {
    throw new Error(
      `Trezor cardanoGetPublicKey failed: ${result.payload.error}`,
    );
  }

  // A collapsed bundle would silently make the seed identity account-dependent.
  if (result.payload.length !== 2) {
    throw new Error(
      `Trezor returned ${result.payload.length} keys for a 2-path bundle`,
    );
  }
  const [identityKey, accountKey] = result.payload;

  return {
    publicKey: extendedPublicKey(accountKey, `account ${accountIndex}`),
    seedIdentity: WalletId.deriveFromBip32PublicKey(
      extendedPublicKey(identityKey, 'the seed identity path'),
    ),
  };
};
