import { Err, Ok } from '@lace-lib/util';

import {
  createCardanoCustodyAccountEntity,
  putCardanoCustodyAccount,
} from './cardano-custody-account-entity';
import { deriveCardanoCustodyDevice } from './cardano-custody-device';
import {
  CardanoCustodyAlreadyRegisteredError,
  CardanoCustodyBuildFailedError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyOutcomeUnknownError,
  CardanoCustodyRewardBalanceChangedError,
} from './cardano-custody-errors';
import {
  buildWithLeasedSponsorWitness,
  leaseFundingOf,
} from './cardano-custody-lease';
import { isAlreadyRegisteredRefusal } from './cardano-custody-stale-answers';
import { readCardanoBuildChain } from './cardano-custody-wallet';
import {
  assembleCustodyTransaction,
  expectSignerWitness,
} from './cardano-custody-witnesses';
import {
  custodyBuildErrorOf,
  requestCardanoCustodyBuild,
} from './request-cardano-custody-build';
import { submitCardanoCustodyTransaction } from './submit-cardano-custody-transaction';

import type { CardanoCustodyDeviceKey } from './cardano-custody-device';
import type { CardanoCustodyDeviceSigner } from './cardano-custody-device-signer';
import type {
  LeasedBuild,
  LeasedSponsorWitness,
} from './cardano-custody-lease';
import type { CardanoCustodyAccountRecord } from './cardano-custody-records';
import type {
  CardanoCustodySponsor,
  CardanoCustodySponsorLease,
} from './cardano-custody-sponsor';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoCustodyDeviceBinding,
  CardanoCustodyWalletEntity,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';

/** The options of `createCardanoCustodyAccount`. */
export type CreateCardanoCustodyAccountProps = {
  /** The passkey's custody device keys, from `requestCardanoCustodyDeviceKey`. */
  device: Pick<
    CardanoCustodyDeviceKey,
    'channel' | 'extendedAccountPublicKey' | 'networkMagic'
  >;
  /** Signs the creation for the device, after the sponsor. */
  deviceSigner: CardanoCustodyDeviceSigner;
  /** The fee sponsor; creation leases its fee UTxO (fee mode). */
  sponsor: CardanoCustodySponsor;
  /** The account name in the wallet. */
  name?: string;
  /** The first creator index to try; 0 by default. */
  startIndex?: number;
};

/**
 * The custody account a creation request ended with, whether it created the
 * account or reopened one: the part of every
 * {@link CardanoCustodyAccountCreation}.
 */
export type CardanoCustodyCreatedAccount = {
  /** The account's ID in the wallet. */
  accountId: AccountId;
  /** The account's public record; export it to share the account. */
  record: CardanoCustodyAccountRecord;
  /** The wallet entity that holds the account in the wallet. */
  entity: CardanoCustodyWalletEntity;
  /** The creator key, bound as this app's device. */
  device: CardanoCustodyDeviceBinding;
  /**
   * The creator index the account was created at, which the device key
   * derives from.
   */
  creatorIndex: number;
};

/**
 * `created`: the creation transaction was submitted; the account goes live
 * when it settles. `exists`: this passkey already created the account at the
 * first used creator index of the scan, so it was reopened and nothing was
 * signed.
 */
export type CardanoCustodyAccountCreation = CardanoCustodyCreatedAccount &
  (
    | {
        status: 'created';
        txId: Cardano.TransactionId;
        invalidHereafter: Cardano.Slot;
      }
    | { status: 'exists' }
  );

const DEFAULT_ACCOUNT_NAME = 'Cardano custody account';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** The account at a creator index, with the creator key bound as the device. */
const custodyAccountAt = async (
  wallet: WalletWithCardanoCustody,
  {
    record,
    creatorIndex,
    props: { device, name = DEFAULT_ACCOUNT_NAME },
  }: {
    record: CardanoCustodyAccountRecord;
    creatorIndex: number;
    props: CreateCardanoCustodyAccountProps;
  },
): Promise<CardanoCustodyCreatedAccount> => {
  const { keyHash } = await deriveCardanoCustodyDevice(
    device.extendedAccountPublicKey,
    creatorIndex,
  );
  const binding: CardanoCustodyDeviceBinding = {
    extendedAccountPublicKey: device.extendedAccountPublicKey,
    index: creatorIndex,
    keyHash,
    channel: device.channel,
  };
  const { entity } = await createCardanoCustodyAccountEntity(wallet, {
    record,
    device: binding,
    name,
  });
  return {
    accountId: entity.accounts[0].accountId,
    record,
    entity,
    device: binding,
    creatorIndex,
  };
};

/**
 * Builds the creation on a lease, or meets the account this passkey already
 * created at a creator index the scan reached.
 */
const buildOnLease = async (
  wallet: WalletWithCardanoCustody,
  {
    lease,
    props,
  }: {
    lease: CardanoCustodySponsorLease;
    props: CreateCardanoCustodyAccountProps;
  },
): Promise<
  Result<
    LeasedBuild<CardanoCustodyCreatedAccount, CardanoCustodyCreatedAccount>,
    Error
  >
> => {
  const { device, startIndex } = props;
  const built = await requestCardanoCustodyBuild(wallet, {
    operation: {
      type: 'create',
      deviceAccountPublicKey: device.extendedAccountPublicKey,
      ...(startIndex === undefined ? {} : { startIndex }),
    },
    funding: leaseFundingOf(lease),
  });
  if (!built.ok) {
    const { error } = built;
    if (error.code !== 'account-exists') {
      return Err(custodyBuildErrorOf(error));
    }
    const existing = await custodyAccountAt(wallet, {
      record: error.record,
      creatorIndex: error.creatorIndex,
      props,
    });
    return Ok({ status: 'stopped', value: existing });
  }
  const { result } = built;
  if (!result.creation) {
    throw new CardanoCustodyBuildFailedError({
      code: 'build-failed',
      message: 'The creation build names no creator index',
    });
  }
  const account = await custodyAccountAt(wallet, {
    record: result.accountRecord,
    creatorIndex: result.creation.creatorIndex,
    props,
  });
  if (account.device.keyHash !== result.creation.identity.creatorKeyHash) {
    throw new CardanoCustodyBuildFailedError({
      code: 'build-failed',
      message: 'The creation build does not match its device',
    });
  }
  return Ok({ status: 'built', result, built: account });
};

/** A creation the sponsor signed, or the existing account the scan met. */
type SponsoredCreation = LeasedSponsorWitness<
  CardanoCustodyCreatedAccount,
  CardanoCustodyCreatedAccount
>;

/**
 * Has the device sign a creation the sponsor signed, after verifying the
 * sponsor's witness, and submits it. A passkey ceremony therefore never runs
 * for a transaction the sponsor refused. The account is opened once the
 * provider accepts the transaction, or when the submission has an unknown
 * outcome, so the caller can wait for it.
 */
const signAndSubmitCreation = async (
  wallet: WalletWithCardanoCustody,
  {
    sponsored: { result, built: account, sponsorKeyHash, sponsorWitnessSet },
    chainId,
    deviceSigner,
  }: {
    sponsored: Extract<SponsoredCreation, { status: 'signed' }>;
    chainId: Cardano.ChainId;
    deviceSigner: CardanoCustodyDeviceSigner;
  },
): Promise<Result<CardanoCustodyAccountCreation, Error>> => {
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
      device: account.device,
    }),
    bodyHash: result.bodyHash,
    keyHash: account.device.keyHash,
  });
  const submitted = await submitCardanoCustodyTransaction(wallet, {
    signedTransaction: assembleCustodyTransaction({
      transaction: result.transaction,
      witnesses: [sponsorWitness, deviceWitness],
      resolvedInputs: result.resolvedInputs,
    }),
    accountId: account.accountId,
    address: result.accountRecord.address,
    resolvedInputs: result.resolvedInputs,
    invalidHereafter: result.invalidHereafter,
    operation: 'create',
  });
  if (
    submitted.isOk() ||
    submitted.error instanceof CardanoCustodyOutcomeUnknownError
  ) {
    await putCardanoCustodyAccount(wallet, account.entity);
  }
  if (submitted.isErr()) {
    return Err(
      isAlreadyRegisteredRefusal(submitted.error)
        ? new CardanoCustodyAlreadyRegisteredError(account.creatorIndex)
        : submitted.error,
    );
  }
  return Ok({ ...account, status: 'created', ...submitted.value });
};

/**
 * Creates this passkey's custody account on the wallet's network, in the
 * fee sponsor's fee mode, which serves creation alone: the sponsor pays the
 * fee, the stake deposit and the control output. The control output takes
 * what the sponsor's limit leaves, and its lovelace above the ledger
 * minimum is the owner fee reserve, so the account can revoke and change
 * devices before its first deposit. Creation takes the first creator index
 * whose stake credential nobody registered, skipping indices someone else
 * registered first. When this passkey already created an account at an
 * index the scan meets, that account is reopened instead (`exists`).
 * Someone who registers the credential between the scan and the
 * submission makes the node refuse the creation: that fails with
 * {@link CardanoCustodyAlreadyRegisteredError}, and the index is lost.
 *
 * Order: the sponsor's lease, the build, the sponsor's witness, then the
 * device's. Both witnesses are verified over the body hash and merged at the
 * CBOR layer before submission, which records the pending activity. A lease
 * is released only when the request fails before the sponsor may have
 * signed. A `uses_shared_collateral` refusal builds once more on a new
 * lease. A submission the node refuses because the balance of the logic's
 * reward account changed since the build, as one credited at an epoch
 * boundary does, runs once more from a new lease, which asks the device
 * again; a second such refusal fails with
 * {@link CardanoCustodyRewardBalanceChangedError}.
 *
 * The account is opened in the wallet, with the creator key bound as this
 * app's device, once the creation is submitted or found. It goes live when
 * the creation settles: wait for it with `waitForCardanoCustodyOperation`.
 * A submission that does not answer in time opens the account all the same
 * and fails with {@link CardanoCustodyOutcomeUnknownError}, which names the
 * account and the transaction to wait for.
 *
 * It is safe to call right after `createLaceWallet`: before the lease, it
 * waits up to 30 seconds for the wallet's network and the era summaries the
 * build reads, and fails with `CardanoCustodyNetworkNotReadyError` when they
 * do not arrive.
 *
 * @param wallet - A wallet with the Cardano modules loaded.
 * @returns A `Result`: the account's id, record and device binding, with
 *   `status: 'created'` and the transaction to wait for, or
 *   `status: 'exists'`. Persist `record` and `device`.
 */
export const createCardanoCustodyAccount = async (
  wallet: WalletWithCardanoCustody,
  props: CreateCardanoCustodyAccountProps,
): Promise<Result<CardanoCustodyAccountCreation, Error>> => {
  try {
    const { device, deviceSigner } = props;
    const { chainId } = await readCardanoBuildChain(wallet);
    if (device.networkMagic !== chainId.networkMagic) {
      return Err(
        new CardanoCustodyInvalidOperationError('network-mismatch', {
          networkMagic: device.networkMagic,
        }),
      );
    }
    for (let attempt = 0; ; attempt++) {
      const sponsored = await buildWithLeasedSponsorWitness(
        props.sponsor,
        async lease => buildOnLease(wallet, { lease, props }),
      );
      if (sponsored.isErr()) return Err(sponsored.error);
      if (sponsored.value.status === 'stopped') {
        const { value: account } = sponsored.value;
        await putCardanoCustodyAccount(wallet, account.entity);
        return Ok({ ...account, status: 'exists' });
      }
      const created = await signAndSubmitCreation(wallet, {
        sponsored: sponsored.value,
        chainId,
        deviceSigner,
      });
      const isRewardBalanceChange =
        created.isErr() &&
        created.error instanceof CardanoCustodyRewardBalanceChangedError;
      if (attempt > 0 || !isRewardBalanceChange) return created;
    }
  } catch (error) {
    return Err(toError(error));
  }
};
