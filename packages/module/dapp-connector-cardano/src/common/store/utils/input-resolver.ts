import { Cardano, Serialization } from '@cardano-sdk/core';
import { util } from '@cardano-sdk/key-management';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  AccountKeyDerivationPath,
  GroupedAddress,
} from '@cardano-sdk/key-management';
import type {
  CardanoProvider,
  CardanoProviderContext,
} from '@lace-contract/cardano-context';

type StakeKeySignerData = {
  poolId: Cardano.PoolId;
  rewardAccount: Cardano.RewardAccount;
  stakeKeyHash: Ed25519KeyHashHex;
  derivationPath: AccountKeyDerivationPath;
};

/**
 * Compares two transaction inputs for equality.
 *
 * @param a - First transaction input
 * @param b - Second transaction input
 * @returns True if both inputs reference the same UTXO
 */
export const txInEquals = (a: Cardano.TxIn, b: Cardano.TxIn): boolean =>
  a.txId === b.txId && a.index === b.index;

const getSignersData = (
  groupedAddresses: GroupedAddress[],
): StakeKeySignerData[] => {
  const seen = new Set<Cardano.RewardAccount>();
  const uniqueAddresses = groupedAddresses.filter(addr => {
    if (seen.has(addr.rewardAccount)) return false;
    seen.add(addr.rewardAccount);
    return true;
  });

  return uniqueAddresses
    .map(groupedAddress => {
      const stakeKeyHash = Cardano.RewardAccount.toHash(
        groupedAddress.rewardAccount,
      ) as unknown as Ed25519KeyHashHex;
      return {
        derivationPath: groupedAddress.stakeKeyDerivationPath,
        poolId: Cardano.PoolId.fromKeyHash(stakeKeyHash),
        rewardAccount: groupedAddress.rewardAccount,
        stakeKeyHash,
      };
    })
    .filter(
      (acct): acct is StakeKeySignerData => acct.derivationPath !== undefined,
    );
};

const hasForeignInputs = (
  {
    body: { inputs, collaterals = [] },
  }: { body: Pick<Cardano.TxBody, 'collaterals' | 'inputs'> },
  utxoSet: Cardano.Utxo[],
): boolean =>
  [...inputs, ...collaterals].some(txIn =>
    utxoSet.every(utxo => !txInEquals(txIn, utxo[0])),
  );

const hasCommitteeCertificates = ({ certificates }: Cardano.TxBody): boolean =>
  (certificates ?? []).some(
    certificate =>
      certificate.__typename ===
        Cardano.CertificateType.AuthorizeCommitteeHot ||
      certificate.__typename === Cardano.CertificateType.ResignCommitteeCold,
  );

/**
 * Creates an input resolver that only uses local UTXOs.
 *
 * @param localUtxos - Array of locally available UTXOs
 * @returns Input resolver that returns outputs for known inputs, null otherwise
 */
export const createLocalInputResolver = (
  localUtxos: Cardano.Utxo[],
): Cardano.InputResolver => ({
  resolveInput: async (txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> => {
    const localMatch = localUtxos.find(([input]) => txInEquals(input, txIn));
    return localMatch ? localMatch[1] : null;
  },
});

/**
 * Creates an input resolver that first checks local UTXOs, then falls back
 * to the Cardano provider for foreign inputs.
 *
 * @param localUtxos - Array of locally available UTXOs
 * @param cardanoProvider - Provider for resolving foreign inputs
 * @param context - Provider context including chain ID
 * @returns Input resolver that resolves from local state or provider
 */
export const createCombinedInputResolver = (
  localUtxos: Cardano.Utxo[],
  cardanoProvider: CardanoProvider,
  context: CardanoProviderContext,
): Cardano.InputResolver => ({
  resolveInput: async (txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> => {
    const localMatch = localUtxos.find(([input]) => txInEquals(input, txIn));
    if (localMatch) {
      return localMatch[1];
    }

    const result = await cardanoProvider
      .resolveInput(txIn, context)
      .toPromise();
    return result?.isOk() ? result.value : null;
  },
});

/**
 * Determines if a transaction requires signatures from parties other than this wallet.
 *
 * Checks for:
 * - Foreign inputs (not in local UTXO set)
 * - Stake credential certificates requiring external signatures
 * - DRep voting procedures requiring external signatures
 * - Committee certificates
 *
 * @param tx - The transaction to check
 * @param utxoSet - Local UTXO set
 * @param knownAddresses - Known addresses for this wallet
 * @param dRepKeyHash - Optional DRep key hash for governance operations
 * @returns True if foreign signatures are required
 */
/* eslint-disable max-params */
export const requiresForeignSignatures = (
  tx: Cardano.Tx,
  utxoSet: Cardano.Utxo[],
  knownAddresses: GroupedAddress[],
  dRepKeyHash?: Ed25519KeyHashHex,
): boolean =>
  hasForeignInputs(tx, utxoSet) ||
  util.checkStakeCredentialCertificates(getSignersData(knownAddresses), tx.body)
    .requiresForeignSignatures ||
  (dRepKeyHash !== undefined &&
    util.getDRepCredentialKeyPaths({ dRepKeyHash, txBody: tx.body })
      .requiresForeignSignatures) ||
  (dRepKeyHash !== undefined &&
    util.getVotingProcedureKeyPaths({
      dRepKeyHash,
      groupedAddresses: knownAddresses,
      txBody: tx.body,
    }).requiresForeignSignatures) ||
  hasCommitteeCertificates(tx.body);

/**
 * Determines if a transaction (from CBOR) requires foreign signatures.
 * Convenience wrapper that parses the transaction first.
 *
 * @param txCbor - Transaction CBOR hex string
 * @param utxoSet - Local UTXO set
 * @param knownAddresses - Known addresses for this wallet
 * @param dRepKeyHash - Optional DRep key hash for governance operations
 * @returns True if foreign signatures are required
 */
export const requiresForeignSignaturesFromCbor = (
  txCbor: string,
  utxoSet: Cardano.Utxo[],
  knownAddresses: GroupedAddress[],
  dRepKeyHash?: Ed25519KeyHashHex,
): boolean => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(txCbor),
  ).toCore();
  return requiresForeignSignatures(tx, utxoSet, knownAddresses, dRepKeyHash);
};

/**
 * Checks if this wallet can sign at least one input in the transaction.
 * Used for partial signing scenarios.
 *
 * @param txCbor - Transaction CBOR hex string
 * @param knownAddresses - Known addresses for this wallet
 * @param inputResolver - Resolver for transaction inputs
 * @param dRepKeyHash - Optional DRep key hash for governance operations
 * @returns True if this wallet can provide at least one signature
 */
export const canSignAnyInput = async (
  txCbor: string,
  knownAddresses: GroupedAddress[],
  inputResolver: Cardano.InputResolver,
  dRepKeyHash?: Ed25519KeyHashHex,
): Promise<boolean> => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(txCbor),
  ).toCore();

  const txInKeyPathMap = await util.createTxInKeyPathMap(
    tx.body,
    knownAddresses,
    inputResolver,
  );

  const keyPaths = util.ownSignatureKeyPaths(
    tx.body,
    knownAddresses,
    txInKeyPathMap,
    dRepKeyHash,
  );

  return keyPaths.length > 0;
};
/* eslint-enable max-params */
