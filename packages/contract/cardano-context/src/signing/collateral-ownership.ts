import { Cardano } from '@cardano-sdk/core';

import { getPaymentCredential, outpointKey, utxoKey } from '../util';

import type { CollateralOwnershipErrorCase } from './assert-collateral-ownership';
import type { GroupedAddress } from '@cardano-sdk/key-management';

/**
 * The ownership authority the rule reads. Callers decide what these sets
 * contain; this module only classifies against them.
 */
export interface CollateralOwnershipSets {
  /** `${txId}#${index}` keys of every collateral-input UTxO the signing account owns. */
  ownUtxoRefs: ReadonlySet<string>;
  /** The signing account's known addresses on the active network. */
  ownAddresses: ReadonlySet<Cardano.PaymentAddress>;
}

/**
 * The authority in the shape {@link collateralRefusalCase} reads. Single
 * source for both key formats, so the pre-consent check and the
 * signing-boundary check cannot disagree about what "the same UTxO" means.
 */
export const collateralOwnershipSets = ({
  ownershipUtxos,
  knownAddresses,
}: {
  ownershipUtxos: readonly Cardano.Utxo[];
  knownAddresses: readonly GroupedAddress[];
}): CollateralOwnershipSets => ({
  ownUtxoRefs: new Set(ownershipUtxos.map(utxoKey)),
  ownAddresses: new Set(knownAddresses.map(({ address }) => address)),
});

/**
 * The signing-boundary authority: a collateral input is ours only when
 * `resolveInput` traces it to an output at one of our payment keys; one that
 * does not resolve, or whose resolver throws, is not (LW-15506).
 *
 * The return-address set stays whole-address: see {@link collateralRefusalCase}.
 */
export const resolveCollateralOwnershipSets = async ({
  body,
  resolveInput,
  knownAddresses,
}: {
  body: Cardano.TxBody;
  resolveInput: Cardano.InputResolver['resolveInput'];
  knownAddresses: readonly GroupedAddress[];
}): Promise<CollateralOwnershipSets> => {
  const ownPaymentKeyHashes = new Set(
    knownAddresses.flatMap(({ address }) => {
      const credential = getPaymentCredential(address);
      return credential?.type === Cardano.CredentialType.KeyHash
        ? [credential.hash]
        : [];
    }),
  );
  const isOwn = async (input: Cardano.TxIn) => {
    const output = await resolveInput(input).catch(() => null);
    if (!output) return false;
    const credential = getPaymentCredential(output.address);
    return (
      credential?.type === Cardano.CredentialType.KeyHash &&
      ownPaymentKeyHashes.has(credential.hash)
    );
  };

  const verdicts = await Promise.all(
    (body.collaterals ?? []).map(async input => ({
      input,
      own: await isOwn(input),
    })),
  );
  return {
    ownUtxoRefs: new Set(
      verdicts.filter(({ own }) => own).map(({ input }) => outpointKey(input)),
    ),
    ownAddresses: new Set(knownAddresses.map(({ address }) => address)),
  };
};

/**
 * The collateral-return rule (LW-15390): if any collateral input is ours, the
 * collateral return must be ours. Returns the refusal case, or `null` when the
 * transaction may be signed (no return at all is pure ADA by ledger rule).
 *
 * Return-address ownership is STRICT full-address membership, NEVER
 * payment-credential membership: an attacker base address that reuses the
 * wallet's payment credential with a foreign stake credential is a different
 * full address and must read as foreign.
 */
export const collateralRefusalCase = (
  body: Cardano.TxBody,
  ownership: CollateralOwnershipSets,
): CollateralOwnershipErrorCase | null => {
  const collaterals = body.collaterals;
  // Ordinary collateral-free requests short-circuit before any classification.
  if (!collaterals || collaterals.length === 0) {
    return null;
  }

  if (
    !collaterals.some(input => ownership.ownUtxoRefs.has(outpointKey(input)))
  ) {
    return null;
  }

  const collateralReturn = body.collateralReturn;
  if (!collateralReturn) {
    return null;
  }

  return ownership.ownAddresses.has(collateralReturn.address)
    ? null
    : 'foreign-collateral-return';
};
