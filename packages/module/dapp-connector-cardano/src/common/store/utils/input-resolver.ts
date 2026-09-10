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

const EMPTY_HASHES: ReadonlySet<string> = new Set();

/**
 * Upper bound on provider round-trips per gate call. The unknown-input count
 * comes straight from dApp CBOR and the tx never has to be submittable, so
 * without a cap a malicious tx could drive unbounded resolution traffic; past
 * the cap the gate conservatively reports foreign signatures required.
 */
const MAX_PROVIDER_RESOLVED_INPUTS = 30;

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

const getUnknownInputs = (
  { inputs, collaterals = [] }: Pick<Cardano.TxBody, 'collaterals' | 'inputs'>,
  utxoSet: Cardano.Utxo[],
): Cardano.TxIn[] => {
  const seen = new Set<string>();
  return [...inputs, ...collaterals].filter(txIn => {
    const outpoint = `${txIn.txId}#${txIn.index}`;
    if (seen.has(outpoint)) return false;
    seen.add(outpoint);
    return utxoSet.every(utxo => !txInEquals(txIn, utxo[0]));
  });
};

const hasCommitteeCertificates = ({ certificates }: Cardano.TxBody): boolean =>
  (certificates ?? []).some(
    certificate =>
      certificate.__typename ===
        Cardano.CertificateType.AuthorizeCommitteeHot ||
      certificate.__typename === Cardano.CertificateType.ResignCommitteeCold,
  );

const getPaymentCredential = (
  address: Cardano.PaymentAddress,
): Cardano.Credential | undefined => {
  const parsed = Cardano.Address.fromString(address);
  if (!parsed) return undefined;
  return (
    parsed.asBase()?.getPaymentCredential() ??
    parsed.asEnterprise()?.getPaymentCredential() ??
    parsed.asPointer()?.getPaymentCredential()
  );
};

const getOwnKeyHashes = (
  knownAddresses: GroupedAddress[],
): ReadonlySet<string> => {
  const ownKeyHashes = new Set<string>();
  for (const { address, rewardAccount } of knownAddresses) {
    const paymentCredential = getPaymentCredential(address);
    if (paymentCredential?.type === Cardano.CredentialType.KeyHash) {
      ownKeyHashes.add(paymentCredential.hash);
    }
    if (rewardAccount) {
      ownKeyHashes.add(Cardano.RewardAccount.toHash(rewardAccount));
    }
  }
  return ownKeyHashes;
};

/**
 * Whether the given key hashes alone can produce a witness set that validates
 * the native script. Timelock nodes hold without a signature; a guard over a
 * non-key credential can never be met by key witnesses.
 *
 * Timelocks are reported satisfiable without consulting
 * txBody.validityInterval: requiring the interval to prove the timelock would
 * force partialSign on txs that set no bounds. Cost: an AnyOf whose only
 * viable branch needs a foreign key passes this gate and is rejected by the
 * node at submission instead.
 */
const isNativeScriptSatisfiable = (
  script: Cardano.NativeScript,
  keyHashes: ReadonlySet<string>,
): boolean => {
  switch (script.kind) {
    case Cardano.NativeScriptKind.RequireSignature:
      return keyHashes.has(script.keyHash);
    case Cardano.NativeScriptKind.RequireAllOf:
      return script.scripts.every(child =>
        isNativeScriptSatisfiable(child, keyHashes),
      );
    case Cardano.NativeScriptKind.RequireAnyOf:
      return script.scripts.some(child =>
        isNativeScriptSatisfiable(child, keyHashes),
      );
    case Cardano.NativeScriptKind.RequireNOf:
      return (
        script.scripts.filter(child =>
          isNativeScriptSatisfiable(child, keyHashes),
        ).length >= script.required
      );
    case Cardano.NativeScriptKind.RequireTimeBefore:
    case Cardano.NativeScriptKind.RequireTimeAfter:
      return true;
    case Cardano.NativeScriptKind.RequireGuard:
      return (
        script.credential.type === Cardano.CredentialType.KeyHash &&
        keyHashes.has(script.credential.hash)
      );
    default:
      return false;
  }
};

/**
 * True when the input's resolved output sits at a script address whose native
 * script the wallet can satisfy on its own, so no other party has to witness
 * it. Unresolvable inputs stay foreign (conservative).
 */
const isForeignInput = async (
  txIn: Cardano.TxIn,
  inputResolver: Cardano.InputResolver,
  ownedScriptHashes: ReadonlySet<string>,
): Promise<boolean> => {
  const txOut = await inputResolver.resolveInput(txIn);
  if (!txOut) return true;
  const paymentCredential = getPaymentCredential(txOut.address);
  return !(
    paymentCredential?.type === Cardano.CredentialType.ScriptHash &&
    ownedScriptHashes.has(paymentCredential.hash)
  );
};

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
 * - Witness native scripts the signer cannot fully satisfy with own keys
 * - Foreign inputs, except those spending a witness native script the wallet
 *   can satisfy alone
 * - Stake credential certificates requiring external signatures
 * - DRep voting procedures requiring external signatures
 * - Committee certificates
 *
 * @param tx - The transaction to check
 * @param utxoSet - Local UTXO set
 * @param knownAddresses - Known addresses for this wallet
 * @param inputResolver - Resolver for inputs absent from the local UTXO set;
 *   pass undefined to skip network resolution (e.g. pre-consent checks), in
 *   which case unknown inputs are optimistically exempted whenever an
 *   own-satisfiable witness script exists and the authoritative resolver-backed
 *   gate must run again before signing
 * @param signerWitnessesScriptKeys - Whether the account's signer can witness
 *   own keys required via native scripts; when false any script that cannot
 *   validate without signatures counts as foreign
 * @param dRepKeyHash - Optional DRep key hash for governance operations
 * @returns True if foreign signatures are required
 */
/* eslint-disable max-params */
export const requiresForeignSignatures = async (
  tx: Cardano.Tx,
  utxoSet: Cardano.Utxo[],
  knownAddresses: GroupedAddress[],
  inputResolver: Cardano.InputResolver | undefined,
  signerWitnessesScriptKeys: boolean,
  dRepKeyHash?: Ed25519KeyHashHex,
): Promise<boolean> => {
  const ownKeyHashes = getOwnKeyHashes(knownAddresses);
  const nativeScripts = (tx.witness.scripts ?? []).filter(element =>
    Cardano.isNativeScript(element),
  );

  const witnessableKeyHashes = signerWitnessesScriptKeys
    ? ownKeyHashes
    : EMPTY_HASHES;
  if (
    nativeScripts.some(
      script => !isNativeScriptSatisfiable(script, witnessableKeyHashes),
    )
  ) {
    return true;
  }

  const ownedScriptHashes = signerWitnessesScriptKeys
    ? new Set<string>(
        nativeScripts.map(script =>
          Serialization.NativeScript.fromCore(script).hash(),
        ),
      )
    : EMPTY_HASHES;
  const unknownInputs = getUnknownInputs(tx.body, utxoSet);
  if (unknownInputs.length > 0) {
    if (ownedScriptHashes.size === 0) return true;
    if (inputResolver) {
      if (unknownInputs.length > MAX_PROVIDER_RESOLVED_INPUTS) return true;
      const foreign = await Promise.all(
        unknownInputs.map(async txIn =>
          isForeignInput(txIn, inputResolver, ownedScriptHashes),
        ),
      );
      if (foreign.includes(true)) return true;
    }
  }

  return (
    util.checkStakeCredentialCertificates(
      getSignersData(knownAddresses),
      tx.body,
    ).requiresForeignSignatures ||
    (dRepKeyHash !== undefined &&
      util.getDRepCredentialKeyPaths({ dRepKeyHash, txBody: tx.body })
        .requiresForeignSignatures) ||
    (dRepKeyHash !== undefined &&
      util.getVotingProcedureKeyPaths({
        dRepKeyHash,
        groupedAddresses: knownAddresses,
        txBody: tx.body,
      }).requiresForeignSignatures) ||
    hasCommitteeCertificates(tx.body)
  );
};

/**
 * Determines if a transaction (from CBOR) requires foreign signatures.
 * Convenience wrapper that parses the transaction first.
 *
 * @param txCbor - Transaction CBOR hex string
 * @param utxoSet - Local UTXO set
 * @param knownAddresses - Known addresses for this wallet
 * @param inputResolver - Resolver for inputs absent from the local UTXO set;
 *   undefined skips network resolution, see requiresForeignSignatures
 * @param signerWitnessesScriptKeys - Whether the account's signer can witness
 *   own keys required via native scripts
 * @param dRepKeyHash - Optional DRep key hash for governance operations
 * @returns True if foreign signatures are required
 */
export const requiresForeignSignaturesFromCbor = async (
  txCbor: string,
  utxoSet: Cardano.Utxo[],
  knownAddresses: GroupedAddress[],
  inputResolver: Cardano.InputResolver | undefined,
  signerWitnessesScriptKeys: boolean,
  dRepKeyHash?: Ed25519KeyHashHex,
): Promise<boolean> => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(txCbor),
  ).toCore();
  return requiresForeignSignatures(
    tx,
    utxoSet,
    knownAddresses,
    inputResolver,
    signerWitnessesScriptKeys,
    dRepKeyHash,
  );
};
/* eslint-enable max-params */
