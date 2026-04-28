import BigNumber from 'bignumber.js';

import { COLLATERAL_AMOUNT_LOVELACES } from './const';
import { CardanoPaymentAddress, CardanoRewardAccount } from './types';

import type {
  CardanoAddressData,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps,
} from './types';
import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  AnyAddress,
  AnyBlockchainAddress,
} from '@lace-contract/addresses';
import type { AnyAccount } from '@lace-contract/wallet-repo';

export const LOVELACE_VALUE = 1_000_000;
export const DEFAULT_DECIMALS = 2;

export const isCardanoAccount = (
  account: AnyAccount,
): account is AnyAccount<
  CardanoBip32AccountProps,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps
> => account.blockchainName === 'Cardano';

export const isCardanoAddress = (
  address: AnyAddress,
): address is AnyAddress<CardanoAddressData> =>
  address?.blockchainName === 'Cardano';

export const isCardanoAddressOfSupportedNetwork = (
  address: AnyAddress,
  chainId: Cardano.ChainId,
): address is AnyAddress<CardanoAddressData> => {
  if (!isCardanoAddress(address)) return false;
  return address.data?.networkMagic === chainId.networkMagic;
};

export const toContractAddress = (
  address: GroupedAddress,
  networkMagic: Cardano.NetworkMagic,
): AnyBlockchainAddress<CardanoAddressData> => ({
  address: CardanoPaymentAddress(address.address),
  name: `${address.type}/${address.index}`,
  data: {
    accountIndex: address.accountIndex,
    index: address.index,
    networkId: address.networkId,
    networkMagic,
    rewardAccount: CardanoRewardAccount(address.rewardAccount),
    type: address.type,
    stakeKeyDerivationPath: address.stakeKeyDerivationPath,
  },
});

export const mapToRecord = <K extends number | string, V>(
  map: Map<K, V>,
): Record<K, V> => {
  return Object.fromEntries(map) as Record<K, V>;
};

const ZERO_BIG_NUMBER = new BigNumber('0');
export const convertLovelacesToAda = (
  lovelaces:
    | BigNumber
    | bigint
    | number
    | string
    | null
    | undefined = undefined,
  decimalValues: number = DEFAULT_DECIMALS,
  roundingMode: BigNumber.RoundingMode = BigNumber.ROUND_HALF_UP,
): string => {
  let ada = ZERO_BIG_NUMBER;

  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (typeof lovelaces) {
    case 'bigint':
      lovelaces = lovelaces.toString();
    case 'number':
    case 'string':
      lovelaces = new BigNumber(lovelaces);
    case 'object':
      if (lovelaces !== null) {
        if (!(lovelaces instanceof BigNumber)) {
          throw new Error(
            `lovelaces is not a BigNumber ${JSON.stringify(lovelaces)} ${
              (lovelaces as unknown as { constructor?: { name?: string } })
                .constructor?.name
            }`,
          );
        }
        ada = lovelaces.dividedBy(LOVELACE_VALUE);
      }
  }

  return ada.toFixed(decimalValues, roundingMode);
};

export const txInEquals = (a: Cardano.TxIn, b: Cardano.TxIn) =>
  a.txId === b.txId && a.index === b.index;

export const utxoKey = (utxo: Cardano.Utxo) =>
  `${utxo[0].txId}#${utxo[0].index}`;

export const filterSpendableUtxos = (
  utxos: Cardano.Utxo[],
  unspendable: Cardano.Utxo[],
): Cardano.Utxo[] => {
  if (unspendable.length === 0) return utxos;
  const unspendableSet = new Set(unspendable.map(utxoKey));
  return utxos.filter(utxo => !unspendableSet.has(utxoKey(utxo)));
};

export const createInputResolver = (
  utxos: Cardano.Utxo[],
): Cardano.InputResolver => ({
  resolveInput: async (input: Cardano.TxIn) => {
    const found = utxos.find(([txIn]) => txInEquals(txIn, input));
    if (found) return found[1];
    return null;
  },
});

const COLLATERAL_AMOUNT_LOVELACES_BIGINT = BigInt(COLLATERAL_AMOUNT_LOVELACES);

/**
 * Get the first eligible collateral UTXO from an array of UTXOs.
 *
 * Collateral UTXOs must meet the following criteria:
 * - Pure ADA (no native tokens/assets)
 * - Controlled by payment key (not a script address) - franken utxos are excluded
 * - Meet required amount requirement (COLLATERAL_AMOUNT_LOVELACES)
 *
 * @param utxos - Array of UTXOs to check
 * @param required - Required collateral amount required (in lovelace). Defaults to COLLATERAL_AMOUNT_LOVELACES (5 ADA)
 * @returns The first eligible collateral UTXO found, or `undefined` if none found
 *
 * @example
 * ```ts
 * const utxos = selectAccountUtxos(state)[accountId] ?? [];
 * const eligibleCollateralUtxo = getEligibleCollateralUtxo(utxos);
 * if (eligibleCollateralUtxo) {
 *   // Use the collateral UTXO
 * }
 * ```
 */
export const getEligibleCollateralUtxo = (
  utxos: Cardano.Utxo[],
  required: bigint = COLLATERAL_AMOUNT_LOVELACES_BIGINT,
): Cardano.Utxo | undefined => {
  if (utxos.length === 0) {
    return undefined;
  }

  return utxos.find(utxo => {
    const [, output] = utxo;

    // Must be pure ADA (no native tokens/assets)
    const hasOnlyLovelace =
      !output.value.assets || output.value.assets.size === 0;

    const hasCollateralAmount = output.value.coins === required;

    return hasOnlyLovelace && hasCollateralAmount;
  });
};
