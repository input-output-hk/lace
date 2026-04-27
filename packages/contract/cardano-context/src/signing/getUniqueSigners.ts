import { Cardano } from '@cardano-sdk/core';

import type * as Crypto from '@cardano-sdk/crypto';

/**
 * Utility function that conditionally adds a value to a set.
 * Adds the value only if it is not `null` or `undefined`.
 *
 * @template T - The type of the elements stored in the set.
 * @param set - The set to which the value will be added.
 * @param v - The value to conditionally add.
 */
const addIf = <T>(set: Set<T>, v: T | null | undefined) => {
  if (v != null) set.add(v);
};

/**
 * Adds a credential’s key hash to a set if the credential is of type `KeyHash`.
 *
 * @param out - The set that collects unique key hashes.
 * @param cred - The credential object to inspect.
 */
const addCredentialKeyHash = (out: Set<string>, cred?: Cardano.Credential) => {
  if (cred?.type === Cardano.CredentialType.KeyHash && cred.hash) {
    out.add(cred.hash);
  }
};

/**
 * Extracts the payment key hash from a Cardano address.
 *
 * Supports base, enterprise, and pointer address types. If the address
 * is provided as a Bech32 string, it will be automatically parsed.
 *
 * @param inputAddress - A Cardano address or Bech32 string.
 * @returns The key hash if present, otherwise `undefined`.
 */
const paymentKeyHashFromAddress = (
  inputAddress: Cardano.Address | string,
): Crypto.Ed25519KeyHashHex | undefined => {
  const addressObject =
    typeof inputAddress === 'string'
      ? Cardano.Address.fromBech32(inputAddress)
      : inputAddress;

  const asBase = addressObject.asBase();
  if (asBase) {
    const cred = asBase.getPaymentCredential();
    if (cred?.type === Cardano.CredentialType.KeyHash)
      return cred.hash as Crypto.Ed25519KeyHashHex;
  }

  const asEnterprise = addressObject.asEnterprise();
  if (asEnterprise) {
    const cred = asEnterprise.getPaymentCredential();
    if (cred?.type === Cardano.CredentialType.KeyHash)
      return cred.hash as Crypto.Ed25519KeyHashHex;
  }

  const asPointer = addressObject.asPointer();
  if (asPointer) {
    const cred = asPointer.getPaymentCredential();
    if (cred?.type === Cardano.CredentialType.KeyHash)
      return cred.hash as Crypto.Ed25519KeyHashHex;
  }

  return undefined;
};

/**
 * Adds all provided required signer key hashes to the set.
 *
 * @param out - The set that collects key hashes.
 * @param keyHashes - An optional list of required signer key hashes.
 */
const addRequiredSigners = (
  out: Set<string>,
  keyHashes?: Crypto.Ed25519KeyHashHex[],
) => {
  for (const kh of keyHashes ?? []) out.add(kh);
};

/**
 * Extracts and adds all signer key hashes corresponding to transaction inputs
 * (and collaterals, if any) from resolved UTxOs.
 *
 * @param out - The set that collects key hashes.
 * @param txBody - The tx body containing the transaction inputs.
 * @param resolvedInputs - The list of resolved UTxOs available for lookup.
 */
const addInputSignersFromInputs = (
  out: Set<string>,
  txBody: Cardano.TxBody,
  resolvedInputs: Cardano.Utxo[],
) => {
  const inputs = [...txBody.inputs, ...(txBody.collaterals ?? [])];

  for (const index of inputs) {
    const input = resolvedInputs.find(
      ([txIn]) => txIn.txId === index.txId && txIn.index === index.index,
    );

    if (!input) continue;

    const [, txOut] = input;
    addIf(out, paymentKeyHashFromAddress(txOut.address));
  }
};

/**
 * Extracts and adds key hashes from stake address withdrawals.
 *
 * @param out - The set that collects key hashes.
 * @param withdrawals - Optional list of withdrawals to process.
 */
const addWithdrawals = (
  out: Set<string>,
  withdrawals?: Cardano.Withdrawal[],
) => {
  for (const withdrawal of withdrawals ?? []) {
    const credential = Cardano.Address.fromString(withdrawal.stakeAddress)
      ?.asReward()
      ?.getPaymentCredential();
    addCredentialKeyHash(out, credential);
  }
};

/**
 * Extracts and adds key hashes from supported certificate types.
 *
 * Only certificates that contain stake or DRep credentials are considered.
 * Unsupported certificate types (like pool registration or MIR) are ignored.
 *
 * @param out - The set that collects key hashes.
 * @param certs - Optional list of certificates to inspect.
 */
const addCertificates = (out: Set<string>, certs?: Cardano.Certificate[]) => {
  for (const certificate of certs ?? []) {
    switch (certificate.__typename) {
      case Cardano.CertificateType.VoteDelegation:
      case Cardano.CertificateType.StakeVoteDelegation:
      case Cardano.CertificateType.StakeRegistrationDelegation:
      case Cardano.CertificateType.VoteRegistrationDelegation:
      case Cardano.CertificateType.StakeVoteRegistrationDelegation:
      case Cardano.CertificateType.Registration:
      case Cardano.CertificateType.Unregistration:
      case Cardano.CertificateType.StakeDeregistration:
      case Cardano.CertificateType.StakeDelegation: {
        addCredentialKeyHash(out, certificate.stakeCredential);
        break;
      }
      case Cardano.CertificateType.RegisterDelegateRepresentative:
      case Cardano.CertificateType.UnregisterDelegateRepresentative:
      case Cardano.CertificateType.UpdateDelegateRepresentative: {
        addCredentialKeyHash(out, certificate.dRepCredential);
        break;
      }
      // Unsupported certs. Our wallet tx builder won't support these.
      case Cardano.CertificateType.StakeRegistration:
      case Cardano.CertificateType.PoolRegistration:
      case Cardano.CertificateType.PoolRetirement:
      case Cardano.CertificateType.MIR:
      case Cardano.CertificateType.GenesisKeyDelegation:
      case Cardano.CertificateType.AuthorizeCommitteeHot:
      case Cardano.CertificateType.ResignCommitteeCold:
      default:
        break;
    }
  }
};

/**
 * Extracts and adds key hashes from voting procedures.
 *
 * @param out - The set that collects key hashes.
 * @param votingProcedures - Optional list of voting procedures.
 */
const addVotingProcedures = (
  out: Set<string>,
  votingProcedures?: Cardano.VotingProcedures,
) => {
  const voters = votingProcedures?.map(({ voter }) => voter) ?? [];
  for (const voter of voters) {
    addCredentialKeyHash(out, voter.credential);
  }
};

/**
 * Recursively collects key hashes from all native scripts in a transaction.
 *
 * Handles nested script structures such as `RequireAllOf`, `RequireAnyOf`,
 * and `RequireNOf`, while skipping time-based scripts.
 *
 * @param out - The set that collects key hashes.
 * @param scripts - Optional list of scripts to process.
 */
const getNativeScriptKeyPaths = (
  out: Set<string>,
  scripts?: Cardano.Script[],
) => {
  const nativeScripts = scripts?.filter(
    Cardano.isNativeScript,
  ) as Cardano.NativeScript[];
  if (!nativeScripts?.length) return;

  for (const nativeScript of nativeScripts) {
    switch (nativeScript.kind) {
      case Cardano.NativeScriptKind.RequireSignature: {
        out.add(nativeScript.keyHash);
        break;
      }
      case Cardano.NativeScriptKind.RequireAllOf:
      case Cardano.NativeScriptKind.RequireAnyOf:
      case Cardano.NativeScriptKind.RequireNOf: {
        getNativeScriptKeyPaths(out, nativeScript.scripts);
        break;
      }
      case Cardano.NativeScriptKind.RequireTimeBefore:
      case Cardano.NativeScriptKind.RequireTimeAfter:
        break;
    }
  }
};

/**
 * Computes and returns a set of **unique signer key hashes** required
 * to authorize the given transaction.
 *
 * It aggregates all potential signers derived from:
 * - Explicit required extra signatures
 * - Transaction inputs and collaterals
 * - Stake withdrawals
 * - Certificates (stake or DRep-related)
 * - Voting procedures
 * - Native scripts included in the transaction’s witness set
 *
 * @param tx - The transaction whose signers should be determined.
 * @param resolvedInputs - The list of resolved UTxOs referenced by the transaction.
 * @returns A set of unique key hash strings representing all required signers.
 */
export const getUniqueSignerKeyHashes = (
  tx: Cardano.Tx,
  resolvedInputs: Cardano.Utxo[],
): Set<string> => {
  const out = new Set<string>();
  addRequiredSigners(out, tx.body.requiredExtraSignatures);
  addInputSignersFromInputs(out, tx.body, resolvedInputs);
  addWithdrawals(out, tx.body.withdrawals);
  addCertificates(out, tx.body.certificates);
  addVotingProcedures(out, tx.body.votingProcedures);
  getNativeScriptKeyPaths(out, tx.witness.scripts);

  return out;
};
