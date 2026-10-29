import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { deriveCardanoCustodyAccountPublicKeyFromWords } from '@lace-contract/cardano-context';
import { CURRENT_CUSTODY_CONTRACT_VERSION } from '@lace-lib/cardano-custody';

import { RemoteSignerResultError } from '../cardano-remote-signer-factory';
import { PasskeyWalletMismatchError } from '../passkey-wallet-mismatch-error';

import { deriveCardanoCustodyDevice } from './cardano-custody-device';
import { requestCustodySigner } from './cardano-custody-device-signer';

import type { CardanoCustodyDeviceKey } from './cardano-custody-device';
import type { RemoteSignerRequester } from '../cardano-remote-signer-factory';
import type { Cardano } from '@cardano-sdk/core';
import type { CardanoCustodyDeviceChannel } from '@lace-contract/cardano-context';
import type { PasskeyKeySource } from '@lace-lib/passkey';

/**
 * The options of `requestCardanoCustodyDeviceKey`: a passkey this app holds
 * (`local`), or the hosted signer page (`hosted`).
 */
export type RequestCardanoCustodyDeviceKeyProps =
  | {
      /**
       * `local` takes one assertion of a passkey this app holds; `hosted`
       * asks the hosted Lace signer page.
       */
      mode: 'local';
      /** Local mode: the passkey whose words derive the key, from `createPasskeyKeySource`. */
      keySource: PasskeyKeySource;
      /** The network. Every testnet shares one account key; mainnet has another. */
      chainId: Cardano.ChainId;
    }
  | {
      /** The hosted Lace signer page, such as a `RemotePasskeySigner`. */
      mode: 'hosted';
      /** Hosted mode: the connected signer, such as a `RemotePasskeySigner`. */
      signer: RemoteSignerRequester;
      /** Hosted mode: the signer page URL; its origin names the device's channel. */
      signerUrl: string;
      chainId: Cardano.ChainId;
    };

const HOSTED_KEY_LENGTH = 128;

const parseHostedKey = (result: unknown): Bip32PublicKeyHex => {
  const key =
    typeof result === 'object' &&
    result !== null &&
    'extendedAccountPublicKey' in result
      ? result.extendedAccountPublicKey
      : undefined;
  if (typeof key !== 'string' || key.length !== HOSTED_KEY_LENGTH) {
    throw new RemoteSignerResultError();
  }
  try {
    return Bip32PublicKeyHex(key.toLowerCase());
  } catch {
    throw new RemoteSignerResultError();
  }
};

type DeviceAccountKey = {
  extendedAccountPublicKey: Bip32PublicKeyHex;
  channel: CardanoCustodyDeviceChannel;
};

const hostedKey = async (
  { signer, signerUrl }: { signer: RemoteSignerRequester; signerUrl: string },
  chainId: Cardano.ChainId,
): Promise<DeviceAccountKey> => {
  // Read before the request, so a bad URL never costs the user a consent.
  const { origin } = new URL(signerUrl);
  const result = await requestCustodySigner(
    signer,
    'cardano-custody-public-key',
    { chainId },
  );
  return {
    extendedAccountPublicKey: parseHostedKey(result),
    channel: { type: 'hosted', origin },
  };
};

const localKey = async (
  keySource: PasskeyKeySource,
  networkMagic: Cardano.NetworkMagic,
): Promise<DeviceAccountKey> =>
  keySource.withPasskeyMnemonic(async words => {
    // The credential is known for certain only once the assertion ran.
    const credential = keySource.credentialRef();
    if (!credential) throw new PasskeyWalletMismatchError();
    return {
      extendedAccountPublicKey:
        await deriveCardanoCustodyAccountPublicKeyFromWords({
          words,
          contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
          networkMagic,
        }),
      channel: {
        type: 'local',
        credentialId: credential.credentialId,
        rpId: credential.rpId,
      },
    };
  });

/**
 * Asks one passkey for its custody device keys on the network `chainId`
 * names: the CIP-1854 account extended public key of the network's account
 * (0 for Mainnet, 1 for every testnet). Hosted mode asks the signer page, which
 * shows the user the key it shares; local mode takes one fresh passkey
 * assertion and derives the key from its words. Neither ever reads a
 * Passport device secret or session.
 *
 * The result is public: persist it to create, recover or join accounts.
 * `device` is key 0, the key a device joins existing accounts with; export
 * it with `exportCardanoCustodyEnrollment`.
 *
 * @returns The account key, its network magic, the channel that signs with
 *   it, and `device`, key 0 with its key hash and fingerprint.
 * @throws {@link CardanoCustodyUnsupportedSignerError} When the signer page
 *   answers that it does not serve custody requests.
 * @throws {@link RemoteSignerResultError} When the signer answers with no valid key.
 */
export const requestCardanoCustodyDeviceKey = async (
  props: RequestCardanoCustodyDeviceKeyProps,
): Promise<CardanoCustodyDeviceKey> => {
  const { networkId, networkMagic } = props.chainId;
  const { extendedAccountPublicKey, channel } =
    props.mode === 'local'
      ? await localKey(props.keySource, networkMagic)
      : await hostedKey(props, { networkId, networkMagic });
  return {
    extendedAccountPublicKey,
    networkMagic,
    channel,
    device: await deriveCardanoCustodyDevice(extendedAccountPublicKey, 0),
  };
};
