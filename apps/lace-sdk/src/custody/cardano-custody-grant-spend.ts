import { createSlotTimeCalc, Serialization } from '@cardano-sdk/core';
import { Ed25519PublicKeyHex, Ed25519SignatureHex } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import {
  outpointKey,
  verifyVkeyWitnesses,
} from '@lace-contract/cardano-context';
import {
  createCustodyAccountRecord,
  custodyReferenceScriptUtxos,
  inspectCustodyTransaction,
} from '@lace-lib/cardano-custody';
import { Err, Ok } from '@lace-lib/util';

import {
  CardanoCustodyAgentWitnessError,
  CardanoCustodyBuildFailedError,
  CardanoCustodyFundContentionError,
  CardanoCustodyGrantSpendError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyOperationInProgressError,
  CardanoCustodyStaleControlError,
  CardanoCustodyStaleGrantError,
  custodyReferenceTooLongError,
} from './cardano-custody-errors';
import {
  beginGrantSpendBuild,
  heldResolutionsOf,
  inputsHeldByOtherGrantees,
  releaseGrantSpendInputs,
} from './cardano-custody-fund-holds';
import {
  collateralFundingOf,
  readSettledLiveState,
  sponsorKeyHashOf,
  withExclusiveCustodyOperation,
} from './cardano-custody-operation-guards';
import { verifiedIdentityOf } from './cardano-custody-records';
import { persistentSponsorRefusalOf } from './cardano-custody-sponsor-refusals';
import {
  custodyInputRolesOf,
  staleSponsorRefusalOf,
} from './cardano-custody-stale-answers';
import {
  readCardanoBuildChain,
  readCardanoCustodyAccount,
  readSettledUtxos,
  readSpentInFlight,
} from './cardano-custody-wallet';
import {
  assembleCustodyTransaction,
  expectSignerWitness,
  isWellFormedVkeyWitness,
} from './cardano-custody-witnesses';
import {
  custodyBuildErrorOf,
  requestCardanoCustodyBuild,
} from './request-cardano-custody-build';
import { submitCardanoCustodyTransaction } from './submit-cardano-custody-transaction';

import type { CardanoCustodySponsor } from './cardano-custody-sponsor';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { CardanoCustodySubmission } from './submit-cardano-custody-transaction';
import type { Cardano, EraSummary } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccount,
  CardanoVkeyWitness,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';

/** The options of `buildCardanoCustodyGrantSpend`. */
export type BuildCardanoCustodyGrantSpendProps = {
  /** The account, opened from its record as an owner or an observer. */
  accountId: AccountId;
  /**
   * The agent's key hash. The spend takes its single current, unexpired
   * grant, or the grant in `slot` when given.
   */
  grantee: Ed25519KeyHashHex;
  /** What the agent pays; every output counts against the grant's caps. */
  outputs: Cardano.TxOut[];
  /** The fee sponsor; it lends its shared collateral. */
  sponsor: Pick<CardanoCustodySponsor, 'collateral'>;
  /** The grant to spend under, when the grantee holds more than one. */
  slot?: bigint;
  /**
   * The most lovelace the fee may take. The caps must leave room for it on
   * top of the outputs. `CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND` when
   * absent.
   */
  feeBound?: bigint;
};

/** An unsigned grant spend, for the agent to sign. */
export type CardanoCustodyGrantSpend = {
  /** Unsigned transaction CBOR. */
  transaction: HexBlob;
  /** What the agent signs: the transaction id. */
  bodyHash: Cardano.TransactionId;
  /** The fee in lovelace, within the spend's fee bound. */
  fee: bigint;
  /** The last slot the transaction may be included in. */
  invalidHereafter: Cardano.Slot;
};

/**
 * The agent's witness of a grant spend: its Ed25519 public key (32 bytes)
 * and its signature over the body hash (64 bytes), both in hex, as an
 * external wallet signs a hash.
 */
export type CardanoCustodyAgentWitness = {
  /** The agent's Ed25519 public key, 32 bytes as hex. */
  vkey: string;
  /** The signature over `bodyHash`, 64 bytes as hex. */
  signature: string;
};

/** The options of `submitCardanoCustodyGrantSpend`. */
export type SubmitCardanoCustodyGrantSpendProps = {
  /** The account the spend was built on. */
  accountId: AccountId;
  /** The unsigned transaction `buildCardanoCustodyGrantSpend` returned. */
  transaction: HexBlob;
  /** The agent's witness over the spend's `bodyHash`. */
  agentWitness: CardanoCustodyAgentWitness;
  /** The fee sponsor; it signs for its collateral. */
  sponsor: Pick<CardanoCustodySponsor, 'collateral' | 'signCollateral'>;
  /**
   * The app's own reference for the spend, such as a payment-intent id, of
   * at most 200 characters. `readCardanoCustodyUnsettledOperations` lists
   * it with the spend until the spend settles or expires.
   */
  reference?: string;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const buildExclusively = async (
  wallet: WalletWithCardanoCustody,
  {
    accountId,
    grantee,
    outputs,
    sponsor,
    slot,
    feeBound,
  }: BuildCardanoCustodyGrantSpendProps,
): Promise<Result<CardanoCustodyGrantSpend, Error>> => {
  await readCardanoBuildChain(wallet);
  await readCardanoCustodyAccount(wallet, accountId);
  await readSettledLiveState(wallet, accountId);
  const collateral = await sponsor.collateral();
  sponsorKeyHashOf(collateral.sponsorAddress);
  const spender = { accountId, grantee };
  // Begun only now, so another grantee's build waits at most for this one's
  // build request, which times out, and never for a sponsor answer.
  const build = beginGrantSpendBuild(wallet, spender);
  try {
    await build.earlierBuilds;
    const now = Date.now();
    const funding = collateralFundingOf(collateral, now);
    const excludedInputs = inputsHeldByOtherGrantees(wallet, spender, now);
    const built = await requestCardanoCustodyBuild(wallet, {
      accountId,
      operation: {
        type: 'grant-spend',
        grantee,
        outputs,
        ...(slot !== undefined && { slot }),
        ...(feeBound !== undefined && { feeBound }),
        ...(excludedInputs.length > 0 && { excludedInputs }),
      },
      funding,
    });
    if (!built.ok) return Err(custodyBuildErrorOf(built.error, accountId));
    const { transaction, bodyHash, fee, invalidHereafter, resolvedInputs } =
      built.result;
    build.hold({
      txId: bodyHash,
      inputs: Serialization.Transaction.fromCbor(transaction).body().toCore()
        .inputs,
      resolvedInputs,
      expiresAt: funding.validUntil,
    });
    return Ok({
      transaction: HexBlob(transaction),
      bodyHash,
      fee,
      invalidHereafter,
    });
  } finally {
    build.release();
  }
};

/**
 * Builds a grant spend for the grantee to sign: the account pays `outputs`
 * and the fee from its plain funds under the grantee's grant, and the fee
 * sponsor lends its shared collateral. The spend references the account's
 * control UTxO, spends the grant UTxO and recreates it with the remaining
 * caps lowered by the outputs and the fee. The transaction is final; its
 * script budgets are evaluated and its validity bound lies inside both the
 * grant's expiry and the sponsor's window. It works for an observer
 * account, as an agent opens one.
 *
 * Spends under different grants of one account may be built side by side,
 * and take disjoint fund UTxOs: a build waits for the builds of other
 * grantees begun before it, and until a spend built here is submitted, or
 * its validity ends, every other grantee's spend leaves its fund UTxOs out.
 * A second spend for the same grantee takes the same grant UTxO, so only
 * one of the two can settle.
 *
 * Lace never signs a grant spend: the agent's own wallet signs `bodyHash`,
 * and `submitCardanoCustodyGrantSpend` adds the sponsor's witness and
 * submits. A spend the contract would refuse is not built. Nor is
 * one while the logic's stake credential is not registered
 * (`CardanoCustodyLogicNotRegisteredError`), or while the logic's reward
 * account holds a balance, which a grant spend may not draw
 * (`CardanoCustodyLogicRewardBalanceError`).
 *
 * @param wallet - A wallet holding the account.
 * @returns A `Result`: the unsigned transaction, its `bodyHash` for the agent
 *   to sign, its fee and its `invalidHereafter`.
 */
export const buildCardanoCustodyGrantSpend = async (
  wallet: WalletWithCardanoCustody,
  props: BuildCardanoCustodyGrantSpendProps,
): Promise<Result<CardanoCustodyGrantSpend, Error>> => {
  try {
    const grantee = props.grantee.toLowerCase() as Ed25519KeyHashHex;
    return await withExclusiveCustodyOperation(
      wallet,
      { accountId: props.accountId, grantee },
      async () => buildExclusively(wallet, { ...props, grantee }),
    );
  } catch (error) {
    return Err(toError(error));
  }
};

/**
 * The grantee whose witness the spend needs, read with the custody
 * inspector from the transaction and the UTxOs it spends and references:
 * the grant UTxO's datum names it. The spend must still be one the
 * validator accepts on them.
 */
const granteeOf = ({
  transaction,
  account,
  chainId,
  eraSummaries,
  resolvedInputs,
}: {
  transaction: Serialization.Transaction;
  account: CardanoCustodyAccount;
  chainId: Cardano.ChainId;
  eraSummaries: EraSummary[];
  resolvedInputs: Cardano.Utxo[];
}): Ed25519KeyHashHex => {
  const slotTime = createSlotTimeCalc(eraSummaries);
  const inspection = inspectCustodyTransaction(transaction, resolvedInputs, {
    chainId,
    now: Date.now(),
    slotToPosixMs: slot => slotTime(slot).getTime(),
    accountRecord: createCustodyAccountRecord(verifiedIdentityOf(account)),
    allowGrantSpend: true,
  });
  if (!inspection.ok) {
    throw new CardanoCustodyBuildFailedError({
      code: 'inspection-refused',
      refusals: [...inspection.error.refusals],
    });
  }
  const grantSpend = inspection.value.accounts.find(
    inspected => inspected.address === account.blockchainSpecific.address,
  )?.grantSpend;
  if (!grantSpend) {
    throw new CardanoCustodyInvalidOperationError('unknown-operation', {
      reason: 'not a grant spend',
    });
  }
  return grantSpend.grant.grantee.toLowerCase() as Ed25519KeyHashHex;
};

/** The agent witness, when it is a valid signature by `grantee`. */
const verifyAgentWitness = async (
  witness: CardanoVkeyWitness,
  bodyHash: Cardano.TransactionId,
  grantee: Ed25519KeyHashHex,
): Promise<CardanoVkeyWitness> => {
  const { valid } = await verifyVkeyWitnesses(bodyHash, [witness]);
  const [signed] = [...valid];
  if (!signed) throw new CardanoCustodyAgentWitnessError('invalid-signature');
  const [keyHash, verified] = signed;
  if (keyHash !== grantee) {
    throw new CardanoCustodyAgentWitnessError('unexpected-key');
  }
  return verified;
};

/**
 * Whether the transaction already carries vkey or bootstrap witnesses. The
 * fee covers exactly the agent's and the sponsor's, so any other would make
 * the node refuse it after the sponsor spent a witness on it.
 */
const carriesKeyWitnesses = (transaction: Serialization.Transaction) => {
  const witnessSet = transaction.witnessSet();
  return (
    (witnessSet.vkeys()?.size() ?? 0) > 0 ||
    (witnessSet.bootstraps()?.size() ?? 0) > 0
  );
};

/**
 * The UTxOs that park the contract scripts of the account's version on its
 * network, which a spend references. No wallet syncs them, so they are
 * rebuilt from the version's pinned catalogue.
 */
const parkedScriptUtxosOf = (
  account: CardanoCustodyAccount,
): Cardano.Utxo[] => {
  const { contractVersion, chainId } = verifiedIdentityOf(account);
  return custodyReferenceScriptUtxos(contractVersion, chainId.networkMagic);
};

/**
 * The UTxOs a spend's inputs may resolve to, by outpoint: the confirmed
 * UTxOs, those the build of a spend held here read from the chain, which
 * the wallet may not have synced yet, and the parked contract scripts.
 */
const knownUtxosOf = async (
  wallet: WalletWithCardanoCustody,
  account: CardanoCustodyAccount,
  txId: Cardano.TransactionId,
): Promise<Map<string, Cardano.Utxo>> =>
  new Map(
    [
      ...parkedScriptUtxosOf(account),
      ...heldResolutionsOf(wallet, account.accountId, txId),
      ...(await readSettledUtxos(wallet, account.accountId)),
    ].map(utxo => [outpointKey(utxo[0]), utxo] as const),
  );

const isResolved = (
  resolution: Cardano.Utxo | undefined,
): resolution is Cardano.Utxo => resolution !== undefined;

const submitExclusively = async (
  wallet: WalletWithCardanoCustody,
  {
    accountId,
    transaction,
    agentWitness,
    sponsor,
    reference,
  }: SubmitCardanoCustodyGrantSpendProps,
): Promise<Result<CardanoCustodySubmission, Error>> => {
  const { chainId, eraSummaries } = await readCardanoBuildChain(wallet);
  const account = await readCardanoCustodyAccount(wallet, accountId);
  const { address } = account.blockchainSpecific;
  await readSettledLiveState(wallet, accountId);
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(transaction),
  );
  if (carriesKeyWitnesses(tx)) {
    return Err(new CardanoCustodyGrantSpendError('transaction-witnessed'));
  }
  const body = tx.body().toCore();
  const invalidHereafter = body.validityInterval?.invalidHereafter;
  if (invalidHereafter === undefined) {
    return Err(
      new CardanoCustodyInvalidOperationError('unknown-operation', {
        reason: 'no validity upper bound',
      }),
    );
  }

  const collateral = await sponsor.collateral();
  const sponsorKeyHash = sponsorKeyHashOf(collateral.sponsorAddress);
  const collaterals = body.collaterals ?? [];
  if (
    collaterals.length !== 1 ||
    outpointKey(collaterals[0]) !== outpointKey(collateral.collateralUtxo[0])
  ) {
    return Err(new CardanoCustodyGrantSpendError('collateral-changed'));
  }
  const spentInFlight = await readSpentInFlight(wallet, account);
  if (body.inputs.some(input => spentInFlight.has(outpointKey(input)))) {
    return Err(new CardanoCustodyOperationInProgressError(accountId));
  }
  const bodyHash = tx.getId();
  const known = await knownUtxosOf(wallet, account, bodyHash);
  const resolve = (input: Cardano.TxIn) => known.get(outpointKey(input));
  const referenced = (body.referenceInputs ?? []).map(resolve);
  if (!referenced.every(isResolved)) {
    return Err(new CardanoCustodyStaleControlError());
  }
  const spent = body.inputs.map(resolve);
  if (!spent.every(isResolved)) {
    const roles = custodyInputRolesOf(
      transaction,
      spent.filter(isResolved),
      address,
    );
    return Err(
      roles.grants.length === 0
        ? new CardanoCustodyStaleGrantError()
        : new CardanoCustodyFundContentionError(
            body.inputs.filter((_, index) => spent[index] === undefined),
          ),
    );
  }
  const resolvedInputs = [...spent, ...referenced, collateral.collateralUtxo];

  const grantee = granteeOf({
    transaction: tx,
    account,
    chainId,
    eraSummaries,
    resolvedInputs,
  });
  const agent = await verifyAgentWitness(
    {
      vkey: Ed25519PublicKeyHex(agentWitness.vkey.toLowerCase()),
      signature: Ed25519SignatureHex(agentWitness.signature.toLowerCase()),
    },
    bodyHash,
    grantee,
  );

  let sponsorWitnessSet: HexBlob;
  try {
    sponsorWitnessSet = await sponsor.signCollateral(transaction);
  } catch (error) {
    const refused =
      persistentSponsorRefusalOf(error) ??
      staleSponsorRefusalOf(
        error,
        custodyInputRolesOf(transaction, resolvedInputs, address),
      );
    if (refused) return Err(refused);
    throw error;
  }
  const sponsorWitness = await expectSignerWitness({
    signer: 'sponsor',
    witnessSet: sponsorWitnessSet,
    bodyHash,
    keyHash: sponsorKeyHash,
  });

  return submitCardanoCustodyTransaction(wallet, {
    signedTransaction: assembleCustodyTransaction({
      transaction,
      witnesses: [agent, sponsorWitness],
      resolvedInputs,
    }),
    accountId,
    address,
    resolvedInputs,
    invalidHereafter,
    operation: 'grant-spend',
    ...(reference !== undefined && { reference }),
  });
};

/**
 * Whether the same spend may still be submitted: its own witness was wrong,
 * or another call holds its scope. Every other outcome submits it or calls
 * for a new build.
 */
const isResubmittable = (result: Result<CardanoCustodySubmission, Error>) =>
  result.isErr() &&
  (result.error instanceof CardanoCustodyAgentWitnessError ||
    result.error instanceof CardanoCustodyOperationInProgressError ||
    (result.error instanceof CardanoCustodyGrantSpendError &&
      result.error.reason === 'transaction-witnessed'));

/**
 * Submits a grant spend the agent signed. The agent witness must be a valid
 * Ed25519 signature over the body hash by the grantee of the spent grant,
 * as the grant UTxO holds it. Then the fee sponsor signs for its
 * collateral, both witnesses are merged at the CBOR layer, and the spend is
 * submitted with its pending activity.
 *
 * `transaction` must be the unsigned transaction the build returned: one
 * that already carries vkey or bootstrap witnesses is refused with
 * {@link CardanoCustodyGrantSpendError} (`transaction-witnessed`), since its
 * fee pays for the agent's and the sponsor's witnesses only. A `reference`
 * over 200 characters is refused before any sponsor request
 * ({@link CardanoCustodyInvalidOperationError}, `reference-too-long`).
 *
 * The spend must still fit the chain. It is refused while an owner
 * operation on the account has not settled, while a submitted transaction
 * that has not settled spends one of its inputs, or while another
 * submission of a spend by the same grantee runs
 * ({@link CardanoCustodyOperationInProgressError}), and for collateral the
 * sponsor has replaced ({@link CardanoCustodyGrantSpendError},
 * `collateral-changed`). An input spent since the build, as the wallet, the
 * sponsor or the node sees it, fails with
 * {@link CardanoCustodyStaleControlError} when an owner operation replaced
 * the control UTxO, {@link CardanoCustodyStaleGrantError} when the grant
 * UTxO moved, or {@link CardanoCustodyFundContentionError} when another
 * transaction took its funds. A reward balance the spend withdraws that
 * changed since the build, as at an epoch boundary, fails with
 * `CardanoCustodyRewardBalanceChangedError`. In each case, build again and
 * have the agent sign the new body. A sponsor that does not serve the
 * account's logic (`CardanoCustodyLogicNotServedError`) or hashes the
 * script data otherwise (`CardanoCustodyScriptDataHashError`) refuses every
 * rebuild too.
 *
 * @param wallet - A wallet holding the account.
 * @returns A `Result`: the submission's `txId` and `invalidHereafter`.
 */
export const submitCardanoCustodyGrantSpend = async (
  wallet: WalletWithCardanoCustody,
  props: SubmitCardanoCustodyGrantSpendProps,
): Promise<Result<CardanoCustodySubmission, Error>> => {
  try {
    if (!isWellFormedVkeyWitness(props.agentWitness)) {
      return Err(new CardanoCustodyAgentWitnessError('malformed'));
    }
    const referenceTooLong = custodyReferenceTooLongError(props.reference);
    if (referenceTooLong) return Err(referenceTooLong);
    const tx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(props.transaction),
    );
    // A grant spend names its grantee as its only required signer.
    const [grantee] = tx.body().toCore().requiredExtraSignatures ?? [];
    const submitted = await withExclusiveCustodyOperation(
      wallet,
      { accountId: props.accountId, ...(grantee && { grantee }) },
      async () => {
        try {
          return await submitExclusively(wallet, props);
        } catch (error) {
          return Err(toError(error));
        }
      },
    );
    if (!isResubmittable(submitted)) {
      releaseGrantSpendInputs(wallet, props.accountId, tx.getId());
    }
    return submitted;
  } catch (error) {
    return Err(toError(error));
  }
};
