import { Err, Ok } from '@lace-lib/util';

import {
  CardanoCustodyDeviceNotListedError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyOutcomeUnknownError,
  CardanoCustodyRewardBalanceChangedError,
  custodyMetadataMeaningError,
  custodyReferenceTooLongError,
} from './cardano-custody-errors';
import {
  collateralFundingOf,
  isSharedCollateralRefusal,
  readSettledLiveState,
  sponsorKeyHashOf,
  withExclusiveCustodyOperation,
} from './cardano-custody-operation-guards';
import { persistentSponsorRefusalOf } from './cardano-custody-sponsor-refusals';
import {
  custodyInputRolesOf,
  staleSponsorRefusalOf,
} from './cardano-custody-stale-answers';
import {
  readCardanoBuildChain,
  readCardanoCustodyAccount,
} from './cardano-custody-wallet';
import {
  assembleCustodyTransaction,
  expectSignerWitness,
} from './cardano-custody-witnesses';
import {
  custodyBuildErrorOf,
  requestCardanoCustodyBuild,
} from './request-cardano-custody-build';
import { submitCardanoCustodyTransaction } from './submit-cardano-custody-transaction';

import type {
  CardanoCustodyDeviceSigner,
  CardanoCustodyRequestedGrantScope,
} from './cardano-custody-device-signer';
import type { CardanoCustodySponsor } from './cardano-custody-sponsor';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { CardanoCustodySubmission } from './submit-cardano-custody-transaction';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildResult,
  CardanoCustodyDeviceBinding,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { CustodyAccountState } from '@lace-lib/cardano-custody';
import type { Result } from '@lace-lib/util';

/**
 * An owner operation on a live account, signed by a listed device and paid
 * from the account:
 *
 * - `issue-grant` issues `scope` in the account's next slot, in its own
 *   grant UTxO, and tops the control output's headroom up to the owner fee
 *   reserve from plain funds;
 * - `replace-grant` revokes the grant in `slot` and issues `scope` in the
 *   next slot in one transaction, topping the headroom up likewise;
 * - `revoke-grant` adds the slot of a current grant to the revoked list;
 * - `revoke-all-grants` raises the grant generation, which stops every
 *   grant, and empties the revoked list;
 * - `sweep-grants` removes 1 to 8 dead grants: it burns their tokens, takes
 *   their slots off the revoked list and moves their lovelace into the
 *   control output;
 * - `add-device` (the key hash of a new device's enrollment) and
 *   `remove-device`, which refuses the last device;
 * - `owner-spend` pays outputs from the account's funds and reserves, and
 *   carries its optional `metadata` as auxiliary data (`invalid-metadata`
 *   when the ledger would refuse it);
 * - `delegate` delegates the account's stake to a pool;
 * - `withdraw-rewards` withdraws the whole reward balance to the account.
 */
export type CardanoCustodyOperation = Exclude<
  CardanoCustodyAccountOperation,
  { type: 'grant-spend' }
>;

/** The options of `executeCardanoCustodyOperation`. */
export type ExecuteCardanoCustodyOperationProps = {
  /** An owner account this app's device is bound to. */
  accountId: AccountId;
  /** The owner operation to run. */
  operation: CardanoCustodyOperation;
  /** The bound device's signer; it signs after the sponsor. */
  deviceSigner: CardanoCustodyDeviceSigner;
  /** The fee sponsor; it lends its shared collateral (collateral mode). */
  sponsor: CardanoCustodySponsor;
  /**
   * The grants the operation issues, as the device is told to expect them.
   * Defaults to the grant an `issue-grant` or `replace-grant` operation
   * issues in the account's next slot; the hosted signer refuses a
   * transaction that issues any other.
   */
  requestedScopes?: readonly CardanoCustodyRequestedGrantScope[];
  /**
   * What the metadata an `owner-spend` carries means, by decimal label, as
   * the device's consent shows it beside the metadata itself. Each key is a
   * decimal label the operation's metadata carries, and each meaning is
   * non-empty text of at most 200 characters; anything else is refused with
   * `invalid-metadata-meaning` before the sponsor is asked.
   */
  metadataMeanings?: Readonly<Record<string, string>>;
  /**
   * The app's own reference for the operation, such as a payment-intent id,
   * of at most 200 characters. `readCardanoCustodyUnsettledOperations`
   * lists it with the operation until the operation settles or expires.
   */
  reference?: string;
};

const OWNER_OPERATION_TYPES: ReadonlySet<string> = new Set<
  CardanoCustodyOperation['type']
>([
  'add-device',
  'delegate',
  'issue-grant',
  'owner-spend',
  'remove-device',
  'replace-grant',
  'revoke-all-grants',
  'revoke-grant',
  'sweep-grants',
  'withdraw-rewards',
]);

/**
 * The grant the operation issues. A new grant takes the account's next
 * slot, as the settled control state the build spends holds it.
 */
const issuedScopeOf = (
  operation: CardanoCustodyOperation,
  state: CustodyAccountState,
): CardanoCustodyRequestedGrantScope | undefined =>
  operation.type === 'issue-grant' || operation.type === 'replace-grant'
    ? { slot: state.nextSlot, ...operation.scope }
    : undefined;

/**
 * The submission with the slot of the grant the operation issues, so the
 * caller can export the agent policy without searching the settled state.
 */
const withGrantSlot = (
  submitted: Result<CardanoCustodySubmission, Error>,
  grantSlot: bigint | undefined,
): Result<CardanoCustodySubmission, Error> => {
  if (grantSlot === undefined) return submitted;
  if (submitted.isOk()) return Ok({ ...submitted.value, grantSlot });
  const { error } = submitted;
  return error instanceof CardanoCustodyOutcomeUnknownError
    ? Err(
        new CardanoCustodyOutcomeUnknownError(error.accountId, {
          txId: error.txId,
          invalidHereafter: error.invalidHereafter,
          grantSlot,
        }),
      )
    : submitted;
};

/**
 * Whether the node refused the submission because a reward balance the
 * transaction withdraws changed after the build read it.
 */
const isRewardBalanceChange = (
  submitted: Result<CardanoCustodySubmission, Error>,
): boolean =>
  submitted.isErr() &&
  submitted.error instanceof CardanoCustodyRewardBalanceChangedError;

type SponsorSignedBuild = {
  result: CardanoCustodyBuildResult;
  sponsorKeyHash: Ed25519KeyHashHex;
  sponsorWitnessSet: string;
};

/**
 * Builds the operation on the sponsor's current collateral and has the
 * sponsor sign it. A sponsor that replaced its collateral in between refuses
 * under `uses_shared_collateral`; the build runs once more on the new one.
 * A refusal that means the control UTxO or a fund UTxO is gone from the
 * chain, or that no build can avoid, answers its typed error. A sponsor
 * address without a payment key is refused before the build.
 */
const buildWithCollateralWitness = async (
  wallet: WalletWithCardanoCustody,
  {
    accountId,
    address,
    operation,
    sponsor,
  }: {
    accountId: AccountId;
    address: Cardano.PaymentAddress;
    operation: CardanoCustodyOperation;
    sponsor: CardanoCustodySponsor;
  },
): Promise<Result<SponsorSignedBuild, Error>> => {
  for (let attempt = 0; ; attempt++) {
    const collateral = await sponsor.collateral();
    const sponsorKeyHash = sponsorKeyHashOf(collateral.sponsorAddress);
    const built = await requestCardanoCustodyBuild(wallet, {
      accountId,
      operation,
      funding: collateralFundingOf(collateral, Date.now()),
    });
    if (!built.ok) return Err(custodyBuildErrorOf(built.error, accountId));
    const { result } = built;
    try {
      const sponsorWitnessSet = await sponsor.signCollateral(
        result.transaction,
      );
      return Ok({ result, sponsorKeyHash, sponsorWitnessSet });
    } catch (error) {
      const refused =
        persistentSponsorRefusalOf(error) ??
        staleSponsorRefusalOf(
          error,
          custodyInputRolesOf(
            result.transaction,
            result.resolvedInputs,
            address,
          ),
        );
      if (refused) return Err(refused);
      if (attempt > 0 || !isSharedCollateralRefusal(error)) throw error;
    }
  }
};

type LiveOperation = {
  accountId: AccountId;
  operation: CardanoCustodyOperation;
  deviceSigner: CardanoCustodyDeviceSigner;
  sponsor: CardanoCustodySponsor;
  chainId: Cardano.ChainId;
  address: Cardano.PaymentAddress;
  device: CardanoCustodyDeviceBinding;
  requestedScopes?: readonly CardanoCustodyRequestedGrantScope[];
  grantUtxos: Cardano.Utxo[];
  metadataMeanings?: Readonly<Record<string, string>>;
  reference?: string;
};

/** Builds the operation, has the sponsor and the device sign it, and submits it. */
const buildSignAndSubmit = async (
  wallet: WalletWithCardanoCustody,
  {
    accountId,
    operation,
    deviceSigner,
    sponsor,
    chainId,
    address,
    device,
    requestedScopes,
    grantUtxos,
    metadataMeanings,
    reference,
  }: LiveOperation,
): Promise<Result<CardanoCustodySubmission, Error>> => {
  const signed = await buildWithCollateralWitness(wallet, {
    accountId,
    address,
    operation,
    sponsor,
  });
  if (signed.isErr()) return signed;
  const { result, sponsorKeyHash, sponsorWitnessSet } = signed.value;

  const sponsorWitness = await expectSignerWitness({
    signer: 'sponsor',
    witnessSet: sponsorWitnessSet,
    bodyHash: result.bodyHash,
    keyHash: sponsorKeyHash,
  });
  const deviceWitness = await expectSignerWitness({
    signer: 'device',
    witnessSet: await deviceSigner.signTransaction({
      transaction: result.transaction,
      resolvedInputs: result.resolvedInputs,
      accountRecord: result.accountRecord,
      chainId,
      device,
      ...(requestedScopes && { requestedScopes }),
      grantUtxos,
      ...(metadataMeanings && { metadataMeanings }),
    }),
    bodyHash: result.bodyHash,
    keyHash: device.keyHash,
  });

  return submitCardanoCustodyTransaction(wallet, {
    signedTransaction: assembleCustodyTransaction({
      transaction: result.transaction,
      witnesses: [sponsorWitness, deviceWitness],
      resolvedInputs: result.resolvedInputs,
    }),
    accountId,
    address,
    resolvedInputs: result.resolvedInputs,
    invalidHereafter: result.invalidHereafter,
    operation: operation.type,
    ...(reference !== undefined && { reference }),
  });
};

const executeExclusively = async (
  wallet: WalletWithCardanoCustody,
  {
    accountId,
    operation,
    deviceSigner,
    sponsor,
    requestedScopes,
    metadataMeanings,
    reference,
  }: ExecuteCardanoCustodyOperationProps,
): Promise<Result<CardanoCustodySubmission, Error>> => {
  const { chainId } = await readCardanoBuildChain(wallet);
  const account = await readCardanoCustodyAccount(wallet, accountId);
  const { device } = account.blockchainSpecific;
  if (!device) {
    return Err(new CardanoCustodyInvalidOperationError('observer-account'));
  }
  const live = await readSettledLiveState(wallet, accountId);
  if (!live.currentDeviceListed) {
    return Err(new CardanoCustodyDeviceNotListedError(device.keyHash));
  }
  const issued = issuedScopeOf(operation, live.state);
  const scopes = requestedScopes ?? (issued && [issued]);
  const liveOperation: LiveOperation = {
    accountId,
    operation,
    deviceSigner,
    sponsor,
    chainId,
    address: account.blockchainSpecific.address,
    device,
    ...(scopes && { requestedScopes: scopes }),
    grantUtxos: live.grants.map(({ utxo }) => utxo),
    ...(metadataMeanings && { metadataMeanings }),
    ...(reference !== undefined && { reference }),
  };

  let submitted = await buildSignAndSubmit(wallet, liveOperation);
  if (isRewardBalanceChange(submitted)) {
    submitted = await buildSignAndSubmit(wallet, liveOperation);
  }
  return withGrantSlot(submitted, issued?.slot);
};

/**
 * Runs an owner operation on a custody account, in the fee sponsor's
 * collateral mode: the account pays the fee and the sponsor lends only its
 * shared collateral. Plain funds and the account's own reserves pay first;
 * an operation that pays out nothing and issues no grant takes its fee from
 * the control output's headroom when they cannot. An issue or a
 * replacement also tops that headroom up to the owner fee reserve, so a
 * later revocation stays payable without funds.
 *
 * It refuses, before any sponsor or device request, an account the wallet
 * opened as an observer, an account that is not live, a device the account
 * state does not list, a `reference` over 200 characters
 * ({@link CardanoCustodyInvalidOperationError}, `reference-too-long`), and
 * an account with an operation this wallet is still running or has
 * submitted without seeing it settle
 * ({@link CardanoCustodyOperationInProgressError}).
 *
 * Order: the build, the sponsor's witness, then the device's, so a passkey
 * ceremony never runs for a transaction the sponsor refuses. The device is
 * told the grants the operation issues, what the metadata of an owner spend
 * means, and is sent the account's grant UTxOs, from which its consent
 * names the grantee of a revoked grant. Both
 * witnesses are verified over the body hash and merged at the CBOR layer
 * before submission, which records the pending activity. A control or fund
 * UTxO gone from the chain by the time the sponsor or the node sees the
 * transaction fails with {@link CardanoCustodyStaleControlError} or
 * {@link CardanoCustodyFundContentionError}: build again. A submission the
 * node refuses because a reward balance the transaction withdraws changed
 * since the build, such as the balance someone paid to the logic's reward
 * account at an epoch boundary, is built, signed and submitted once more,
 * which asks the sponsor and the device again; a second such refusal fails
 * with {@link CardanoCustodyRewardBalanceChangedError}.
 *
 * For `issue-grant` and `replace-grant`, the submission, and a
 * {@link CardanoCustodyOutcomeUnknownError}, name the `grantSlot` of the
 * grant the operation issues: once it settles, export the agent policy of
 * that slot.
 *
 * @param wallet - A wallet holding the account.
 * @returns A `Result`: the submission's `txId` and `invalidHereafter`, and
 *   `grantSlot` for an issue or replacement.
 */
export const executeCardanoCustodyOperation = async (
  wallet: WalletWithCardanoCustody,
  props: ExecuteCardanoCustodyOperationProps,
): Promise<Result<CardanoCustodySubmission, Error>> => {
  try {
    if (!OWNER_OPERATION_TYPES.has(props.operation.type)) {
      return Err(
        new CardanoCustodyInvalidOperationError('unknown-operation', {
          type: props.operation.type,
        }),
      );
    }
    const referenceTooLong = custodyReferenceTooLongError(props.reference);
    if (referenceTooLong) return Err(referenceTooLong);
    const meaningError = custodyMetadataMeaningError(
      props.metadataMeanings,
      props.operation.type === 'owner-spend'
        ? props.operation.metadata
        : undefined,
    );
    if (meaningError) return Err(meaningError);
    return await withExclusiveCustodyOperation(
      wallet,
      { accountId: props.accountId },
      async () => executeExclusively(wallet, props),
    );
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
