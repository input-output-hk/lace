import type {
  CustodyExternalInput,
  CustodyExternalOutput,
  CustodyFeeShares,
} from './inspect';
import type { Cardano } from '@cardano-sdk/core';

const lovelaceOf = (items: readonly { readonly value: Cardano.Value }[]) =>
  items.reduce((total, { value }) => total + value.coins, 0n);

const positivePart = (quantity: bigint): bigint =>
  quantity > 0n ? quantity : 0n;

/** How the fee splits between the external inputs and the operated accounts. */
export const feeSharesOf = ({
  externalInputs,
  externalOutputs,
  fee,
}: {
  externalInputs: readonly CustodyExternalInput[];
  externalOutputs: readonly CustodyExternalOutput[];
  fee: bigint;
}): CustodyFeeShares => {
  const payers = new Set(externalInputs.map(({ address }) => address));
  const beyondChange =
    lovelaceOf(externalInputs) -
    lovelaceOf(externalOutputs.filter(({ address }) => payers.has(address)));
  const externalShare = beyondChange < fee ? positivePart(beyondChange) : fee;
  return {
    payers: [...payers],
    externalShare,
    accountShare: fee - externalShare,
  };
};

/**
 * The part of the accounts' fee share each operated account pays, from the
 * lovelace each gives up. Each pays only what the others cannot cover, so an
 * account is named as paying someone whenever some split of the fee has it
 * do so. A single account pays the whole share.
 */
export const accountFeeSharesOf = (
  givenUp: readonly bigint[],
  accountShare: bigint,
): bigint[] => {
  const total = givenUp.reduce(
    (sum, lovelace) => sum + positivePart(lovelace),
    0n,
  );
  return givenUp.map(lovelace =>
    positivePart(accountShare - (total - positivePart(lovelace))),
  );
};
