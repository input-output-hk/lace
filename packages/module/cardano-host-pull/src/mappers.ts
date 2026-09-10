import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { toContractAddress } from '@lace-contract/cardano-context';
import { Bip32Account } from '@lace-lib/core';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoParams,
  CardanoUtxo,
  LaceError,
} from '@lace-lib/extension-shell-api';

type CryptoDependencies = ConstructorParameters<typeof Bip32Account>[1];
type ContractAddress = ReturnType<typeof toContractAddress>;

/**
 * Consecutive payment indices missing from BOTH host sets before the
 * reconstruction walk gives up. Mirrors the host's own gap limit
 * (apps/lace-extension-shell sw/addresses.ts PAYMENT_CREDENTIAL_GAP) — anything
 * smaller could stop short of an address the host's walk legitimately found, and
 * the caller's loud-fail guard would then reject a healthy wallet.
 */
const ADDRESS_RECONSTRUCTION_GAP = 100;

/** Defensive termination should the host ever report an address the walk cannot
 * derive at all (mirrors the host's HARD_UPPER_BOUND). */
const ADDRESS_RECONSTRUCTION_UPPER_BOUND = 10_000;

/**
 * Consecutive stake keys claiming no host address before the reconstruction
 * concludes there are no more stake credentials. Mirrors the host's own limit
 * (apps/lace-extension-shell sw/addresses.ts STAKE_KEY_GAP) — a guest package
 * cannot import from apps/, so the value is duplicated; anything smaller could
 * stop short of a stake key the host legitimately discovered.
 */
const ADDRESS_RECONSTRUCTION_STAKE_KEY_GAP = 5;

/** Map the host's decimal-string transport utxo → a cardano-sdk `Cardano.Utxo`
 * (`[TxIn, TxOut]`), reviving lovelace and the native-asset map from strings. */
export const transportUtxoToCardano = (utxo: CardanoUtxo): Cardano.Utxo => {
  const value: Cardano.Value = { coins: BigInt(utxo.lovelace) };
  if (utxo.assets && Object.keys(utxo.assets).length > 0) {
    const assets: Cardano.TokenMap = new Map();
    for (const [assetId, amount] of Object.entries(utxo.assets)) {
      assets.set(Cardano.AssetId(assetId), BigInt(amount));
    }
    value.assets = assets;
  }
  const address = Cardano.PaymentAddress(utxo.address);
  return [
    { txId: Cardano.TransactionId(utxo.txId), index: utxo.index, address },
    { address, value },
  ];
};

/** Map the host-authoritative transport params onto the `RequiredProtocolParameters`
 * subset of `Cardano.ProtocolParameters`. Spread over the blockfrost-fetched full
 * params so the load-bearing 15 are host-authoritative (matching the host sign
 * summary) while the SDK type stays satisfied — nothing fabricated. */
export const mapHostParams = (
  params: CardanoParams,
): Partial<Cardano.ProtocolParameters> => ({
  minFeeCoefficient: params.minFeeCoefficient,
  minFeeConstant: params.minFeeConstant,
  coinsPerUtxoByte: params.coinsPerUtxoByte,
  maxTxSize: params.maxTxSize,
  maxValueSize: params.maxValueSize,
  collateralPercentage: params.collateralPercentage,
  maxCollateralInputs: params.maxCollateralInputs,
  stakeKeyDeposit: params.stakeKeyDeposit,
  poolDeposit: params.poolDeposit,
  desiredNumberOfPools: params.desiredNumberOfPools,
  monetaryExpansion: params.monetaryExpansion,
  poolInfluence: params.poolInfluence,
  prices: params.prices,
  ...(params.dRepDeposit === undefined
    ? {}
    : { dRepDeposit: params.dRepDeposit }),
  ...(params.minFeeRefScriptCostPerByte === undefined
    ? {}
    : { minFeeRefScriptCostPerByte: params.minFeeRefScriptCostPerByte }),
});

export const laceErrorToProviderError = (error: LaceError): ProviderError =>
  new ProviderError(
    ProviderFailure.Unknown,
    undefined,
    `${error.code}: ${error.message}`,
  );

/**
 * Reconstruct full `CardanoAddressData` for both roles from the account xpub
 * (public — no secret), keeping candidates whose derived address is in the
 * host's returned set for that role, always including external index 0 under
 * stake key 0 (the primary receive address).
 *
 * The walk mirrors the host's own shape: a stake-key gap walk whose every step
 * is a BIP-44 payment-credential walk over both roles in lockstep. Walking
 * stake keys is what lets a multi-delegation wallet reconstruct at all — the
 * host discovers across every stake key it finds and dedupes the roles into
 * flat lists carrying no stake index, so "this stake key claimed no host
 * address" stands in for the host's provider-fed "stake key unused" signal.
 * A sparse used-index set — activity at {0, 1, 2, 50} — therefore reconstructs
 * whole instead of stopping at a fixed offset from the set size.
 *
 * It ends as soon as every host address is accounted for — an early exit the
 * host cannot take, not knowing the total — so the common single-stake-key
 * contiguous wallet still costs one derivation pair per used index.
 *
 * Returns the count that matched so the caller fails LOUD on any shortfall
 * (baked network-magic drift → derived ∩ host = ∅) rather than silently
 * serving a partial address set.
 */
export type ReconstructAddressesArgs = {
  xpub: string;
  accountIndex: number;
  chainId: Cardano.ChainId;
  external: readonly string[];
  internal: readonly string[];
  crypto: CryptoDependencies;
};

export const reconstructAddresses = async ({
  xpub,
  accountIndex,
  chainId,
  external,
  internal,
  crypto,
}: ReconstructAddressesArgs): Promise<{
  addresses: ContractAddress[];
  matched: number;
}> => {
  const account = new Bip32Account(
    {
      extendedAccountPublicKey: xpub as Bip32PublicKeyHex,
      chainId,
      accountIndex,
    },
    crypto,
  );
  const externalSet = new Set<string>(external);
  const internalSet = new Set<string>(internal);
  const wanted = externalSet.size + internalSet.size;
  const addresses: ContractAddress[] = [];
  let matched = 0;

  // Collects into `addresses`; returns how many host addresses this stake key
  // claimed, which is both the outer walk's "used" signal and its progress.
  const walkStakeKey = async (stakeIndex: number): Promise<number> => {
    let stakeMatched = 0;
    let gap = 0;
    let index = 0;
    while (index < ADDRESS_RECONSTRUCTION_UPPER_BOUND) {
      const externalCandidate = await account.deriveAddress(
        { type: AddressType.External, index },
        stakeIndex,
      );
      const internalCandidate = await account.deriveAddress(
        { type: AddressType.Internal, index },
        stakeIndex,
      );
      const hasExternal = externalSet.has(externalCandidate.address);
      const hasInternal = internalSet.has(internalCandidate.address);
      if (hasExternal) stakeMatched++;
      if (hasInternal) stakeMatched++;
      if (hasExternal || (stakeIndex === 0 && index === 0)) {
        addresses.push(
          toContractAddress(externalCandidate, chainId.networkMagic),
        );
      }
      if (hasInternal) {
        addresses.push(
          toContractAddress(internalCandidate, chainId.networkMagic),
        );
      }
      index++;
      if (matched + stakeMatched === wanted) break;
      // Both roles advance together, so a change-only index does not end the walk
      // (host parity).
      gap = hasExternal || hasInternal ? 0 : gap + 1;
      if (gap >= ADDRESS_RECONSTRUCTION_GAP) break;
    }
    return stakeMatched;
  };

  let stakeIndex = 0;
  let stakeGap = 0;
  while (stakeGap < ADDRESS_RECONSTRUCTION_STAKE_KEY_GAP) {
    const stakeMatched = await walkStakeKey(stakeIndex);
    matched += stakeMatched;
    if (matched === wanted) break;
    stakeGap = stakeMatched > 0 ? 0 : stakeGap + 1;
    stakeIndex++;
  }

  return { addresses, matched };
};
