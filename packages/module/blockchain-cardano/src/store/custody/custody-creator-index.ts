import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import {
  createCustodyAccountRecord,
  deriveCustodyAccountIdentity,
  deriveCustodyDeviceKey,
} from '@lace-lib/cardano-custody';

import { failCustodyBuild } from './build-failure';
import { readFromProvider } from './custody-chain';

import type { CustodyChain } from './custody-chain';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CustodyAccountIdentity,
  CustodyAccountRecord,
  CustodyContractVersion,
  CustodyDeviceKey,
} from '@lace-lib/cardano-custody';

/** What one creator index holds on chain. */
export type CustodyCreatorIndexState =
  | {
      readonly status: 'account';
      readonly record: CustodyAccountRecord;
    }
  | {
      readonly status: 'pre-registered';
    }
  | {
      readonly status: 'unregistered';
      readonly key: CustodyDeviceKey;
      readonly identity: CustodyAccountIdentity;
    };

/**
 * Reads what the chain holds at one creator index of one contract version:
 * whether the stake credential of the creator key is registered and, when
 * it is, whether the account address holds the state NFT. A registered
 * credential without the NFT was registered by someone else first, which
 * blocks creation at that index forever.
 */
export const readCustodyCreatorIndex = async (
  {
    contractVersion,
    deviceAccountPublicKey,
    creatorIndex,
  }: {
    contractVersion: CustodyContractVersion;
    deviceAccountPublicKey: Bip32PublicKeyHex;
    creatorIndex: number;
  },
  chain: Pick<CustodyChain, 'chainId' | 'provider'>,
): Promise<CustodyCreatorIndexState> => {
  const key = await deriveCustodyDeviceKey(
    deviceAccountPublicKey,
    creatorIndex,
  );
  if (!key.ok) {
    return failCustodyBuild({
      code: 'invalid-operation',
      reason: 'invalid-device-key',
      message: `Cannot derive custody device key ${creatorIndex}: ${key.error.code}`,
    });
  }
  const identity = deriveCustodyAccountIdentity({
    contractVersion,
    creatorKeyHash: key.value.keyHash,
    chainId: chain.chainId,
  });
  if (!identity.ok) {
    return failCustodyBuild({
      code: 'unavailable',
      message: `Cannot derive a custody account on this chain: ${identity.error.code}`,
    });
  }
  const { rewardAccount, address, stateNftAssetId } = identity.value;
  const { isRegistered } = await readFromProvider(
    'Custody reward account',
    () =>
      chain.provider.getRewardAccountInfo(
        { rewardAccount: CardanoRewardAccount(rewardAccount) },
        { chainId: chain.chainId },
      ),
  );
  if (!isRegistered) {
    return { status: 'unregistered', key: key.value, identity: identity.value };
  }
  const utxos = await readFromProvider('Custody account UTxOs', () =>
    chain.provider.getUtxosAtAddress(
      { address: CardanoPaymentAddress(address) },
      { chainId: chain.chainId },
    ),
  );
  return utxos.some(([, output]) => output.value.assets?.has(stateNftAssetId))
    ? { status: 'account', record: createCustodyAccountRecord(identity.value) }
    : { status: 'pre-registered' };
};
