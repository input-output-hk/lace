import { Cardano, Serialization } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import {
  CardanoAccountId,
  CardanoCustodyWalletId,
  verifyVkeyWitnesses,
} from '@lace-contract/cardano-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CARDANO_CUSTODY_LOGIC_HASH } from '../../src/custody/cardano-custody-contract';
import { createLocalCardanoCustodyDeviceSigner } from '../../src/custody/cardano-custody-device-signer';
import {
  CardanoCustodyAlreadyRegisteredError,
  CardanoCustodyBuildFailedError,
  CardanoCustodyIndexExhaustedError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyLogicNotRegisteredError,
  CardanoCustodyLogicRewardBalanceError,
  CardanoCustodyNetworkNotReadyError,
  CardanoCustodyOperationInProgressError,
  CardanoCustodyOutcomeUnknownError,
  CardanoCustodyRewardBalanceChangedError,
  CardanoCustodyWitnessError,
} from '../../src/custody/cardano-custody-errors';
import { CardanoCustodySponsorError } from '../../src/custody/cardano-custody-sponsor';
import { vkeyWitnessSetOf } from '../../src/custody/cardano-custody-witnesses';
import { createCardanoCustodyAccount } from '../../src/custody/create-cardano-custody-account';
import { executeCardanoCustodyOperation } from '../../src/custody/execute-cardano-custody-operation';
import { waitForCardanoCustodyOperation } from '../../src/custody/wait-for-cardano-custody-operation';

import {
  createCustodyTestWallet,
  creationResult,
  creationShape,
  DEVICE_0,
  identity,
  localChannel,
  LOGIC_REWARD_ACCOUNT,
  PREPROD,
  preprodEraSummaries,
  record,
  sponsorKey,
  sponsorWitnessSetFor,
  strangerKey,
  TESTNET_CUSTODY_XPUB,
  words,
} from './custody-fixtures';
import {
  bodyHashOf,
  createSponsorFake,
  lease,
  NOW,
} from './custody-sponsor-fake';

import type {
  CardanoCustodyDeviceSigner,
  CardanoCustodyDeviceSignRequest,
} from '../../src/custody/cardano-custody-device-signer';
import type { CardanoCustodyBuildError } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { PasskeyKeySource } from '@lace-lib/passkey';

const PREPROD_MAGIC = Cardano.NetworkMagics.Preprod;
const accountId = CardanoAccountId(
  CardanoCustodyWalletId.derive(PREPROD_MAGIC, identity.stakeScriptHash),
  0,
  PREPROD_MAGIC,
) as AccountId;

const device = {
  extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
  networkMagic: PREPROD_MAGIC,
  channel: localChannel,
};

const keySource = (): PasskeyKeySource => ({
  ensureCredential: vi.fn(),
  credentialRef: vi.fn(() => ({
    ...localChannel,
    recipeVersion: 'v1' as const,
  })),
  withPasskeyMnemonic: async use => use(words),
});

/** The local passkey signer, logging its call to `calls`. */
const deviceSignerLogging = (calls: string[]): CardanoCustodyDeviceSigner => {
  const signer = createLocalCardanoCustodyDeviceSigner({
    keySource: keySource(),
    now: () => NOW,
  });
  return {
    signTransaction: vi.fn(async (request: CardanoCustodyDeviceSignRequest) => {
      calls.push('device');
      return signer.signTransaction(request);
    }),
  };
};

const setup = () => {
  const test = createCustodyTestWallet();
  const { sponsor, calls } = createSponsorFake();
  const deviceSigner = deviceSignerLogging(calls);
  test.control.answerBuild = () => {
    calls.push('build');
    return { ok: true, result: creationResult() };
  };
  const failBuildWith = (error: CardanoCustodyBuildError) => {
    test.control.answerBuild = () => {
      calls.push('build');
      return { ok: false, error };
    };
  };
  const create = async (props: { startIndex?: number } = {}) =>
    createCardanoCustodyAccount(test.wallet, {
      device,
      deviceSigner,
      sponsor,
      name: 'Treasury',
      ...props,
    });
  return { ...test, sponsor, calls, deviceSigner, failBuildWith, create };
};

describe('createCardanoCustodyAccount', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leases, builds, has the sponsor sign before the device, and submits', async () => {
    const { create, calls, submitted, builds } = setup();

    const created = await create();

    expect(created.isOk()).toBe(true);
    expect(calls).toEqual(['lease', 'build', 'signLeased', 'device']);
    expect(builds[0]).toMatchObject({
      operation: {
        type: 'create',
        deviceAccountPublicKey: TESTNET_CUSTODY_XPUB,
      },
      funding: {
        mode: 'fee',
        feeUtxo: lease.feeUtxo,
        collateralUtxo: lease.collateralUtxo,
        sponsorAddress: lease.sponsorAddress,
        maxSponsoredLovelace: lease.maxSponsoredLovelace,
        validUntil: lease.expiresAt,
      },
    });
    expect(builds[0].operation).not.toHaveProperty('startIndex');
    expect(created.unwrap()).toMatchObject({
      status: 'created',
      txId: creationResult().bodyHash,
      invalidHereafter: creationResult().invalidHereafter,
      accountId,
      record,
      creatorIndex: 0,
      device: {
        extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
        index: 0,
        keyHash: DEVICE_0,
        channel: localChannel,
      },
    });
    expect(submitted).toHaveLength(1);
  });

  it('submits the unsigned body with exactly the sponsor and device witnesses', async () => {
    const { create, submitted } = setup();

    await create();

    const signed = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(submitted[0]),
    );
    expect(signed.getId()).toBe(creationResult().bodyHash);
    const vkeys = (signed.witnessSet().vkeys()?.toCore() ?? []).map(
      ([vkey, signature]) => ({ vkey, signature }),
    );
    const { valid, invalid } = await verifyVkeyWitnesses(signed.getId(), vkeys);
    expect(invalid).toEqual([]);
    expect([...valid.keys()].sort()).toEqual(
      [DEVICE_0, sponsorKey.keyHash].sort(),
    );
    expect(signed.witnessSet().redeemers()?.toCbor()).toBe(
      Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(creationResult().transaction),
      )
        .witnessSet()
        .redeemers()
        ?.toCbor(),
    );
  });

  it('opens the account with the creator key bound and records its pending creation', async () => {
    const { create, custodyAccount, activities$ } = setup();

    await create();

    expect(custodyAccount(accountId)).toMatchObject({
      metadata: { name: 'Treasury' },
      blockchainSpecific: {
        address: record.address,
        device: { index: 0, keyHash: DEVICE_0, channel: localChannel },
      },
    });
    const [pending] = activities$.value[accountId];
    expect(pending).toMatchObject({
      activityId: creationResult().bodyHash,
      type: ActivityType.Pending,
      blockchainSpecific: {
        Cardano: {
          custody: {
            invalidHereafter: creationResult().invalidHereafter,
            operation: 'create',
            status: 'pending',
          },
        },
      },
    });
    expect(pending.tokenBalanceChanges.map(({ tokenId }) => tokenId)).toEqual([
      'lovelace',
    ]);
  });

  it('starts the creator scan at the requested index', async () => {
    const { create, builds } = setup();

    await create({ startIndex: 5 });

    expect(builds[0].operation).toMatchObject({ startIndex: 5 });
  });

  it('reopens the account this passkey already created, releasing the lease', async () => {
    const { create, failBuildWith, calls, sponsor, custodyAccount } = setup();
    failBuildWith({ code: 'account-exists', creatorIndex: 0, record });

    const created = await create();

    expect(created.unwrap()).toMatchObject({
      status: 'exists',
      accountId,
      record,
      creatorIndex: 0,
    });
    expect(calls).toEqual(['lease', 'build', 'releaseLease']);
    expect(sponsor.releaseLease).toHaveBeenCalledWith(lease.leaseId);
    expect(custodyAccount(accountId)?.blockchainSpecific.device).toMatchObject({
      keyHash: DEVICE_0,
    });
  });

  it.each<[string, CardanoCustodyBuildError, new (...args: never[]) => Error]>([
    [
      'index-exhausted',
      { code: 'index-exhausted', startIndex: 0, scanned: 100 },
      CardanoCustodyIndexExhaustedError,
    ],
    [
      'unavailable',
      { code: 'unavailable', message: 'provider down' },
      CardanoCustodyBuildFailedError,
    ],
    [
      'sponsor-limit',
      {
        code: 'sponsor-limit',
        sponsoredLovelace: 11n,
        maxSponsoredLovelace: 10n,
      },
      CardanoCustodyBuildFailedError,
    ],
    [
      'logic-not-registered',
      { code: 'logic-not-registered', rewardAccount: LOGIC_REWARD_ACCOUNT },
      CardanoCustodyLogicNotRegisteredError,
    ],
  ])(
    'releases the lease when the build fails with %s',
    async (_, error, type) => {
      const { create, failBuildWith, calls } = setup();
      failBuildWith(error);

      const created = await create();

      expect(created.isErr() && created.error).toBeInstanceOf(type);
      expect(calls).toEqual(['lease', 'build', 'releaseLease']);
    },
  );

  it('reports the build failure when releasing the lease fails too', async () => {
    const { create, failBuildWith, sponsor } = setup();
    failBuildWith({ code: 'unavailable', message: 'provider down' });
    sponsor.releaseLease.mockRejectedValueOnce(new Error('offline'));

    const created = await create();

    expect(created.isErr() && created.error).toBeInstanceOf(
      CardanoCustodyBuildFailedError,
    );
  });

  it('releases the lease when the sponsor refuses to sign, and never asks the device', async () => {
    const { create, sponsor, calls, deviceSigner } = setup();
    const refusal = new CardanoCustodySponsorError({
      status: 422,
      code: 'invalid_transaction',
      rule: 'fee_mode_draw',
    });
    sponsor.signLeased.mockRejectedValueOnce(refusal);

    const created = await create();

    expect(created.isErr() && created.error).toBe(refusal);
    expect(calls).toEqual(['lease', 'build', 'releaseLease']);
    expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
  });

  it('names the logic reward account that is not registered', async () => {
    const { create, failBuildWith } = setup();
    failBuildWith({
      code: 'logic-not-registered',
      rewardAccount: LOGIC_REWARD_ACCOUNT,
    });

    const created = await create();

    expect(created.isErr() && created.error).toMatchObject({
      code: 'custody-logic-not-registered',
      rewardAccount: LOGIC_REWARD_ACCOUNT,
    });
  });

  it('answers a refusal of the logic the creation runs with its typed error, releasing the lease once', async () => {
    const { create, sponsor, calls, deviceSigner } = setup();
    sponsor.signLeased.mockRejectedValueOnce(
      new CardanoCustodySponsorError({
        status: 422,
        code: 'invalid_transaction',
        rule: 'no_foreign_scripts',
        detail: `The withdrawal that runs logic ${CARDANO_CUSTODY_LOGIC_HASH} draws 7 lovelace, and a logic runs on a withdrawal of zero`,
      }),
    );

    const created = await create();

    expect(created.isErr() && created.error).toBeInstanceOf(
      CardanoCustodyLogicRewardBalanceError,
    );
    expect(created.isErr() && created.error).toMatchObject({ balance: 7n });
    expect(calls).toEqual(['lease', 'build', 'releaseLease']);
    expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
  });

  describe('after a shared-collateral refusal', () => {
    const refusal = new CardanoCustodySponsorError({
      status: 422,
      code: 'invalid_transaction',
      rule: 'uses_shared_collateral',
    });

    it('builds once more on a new lease', async () => {
      const { create, sponsor, calls, builds } = setup();
      sponsor.signLeased.mockRejectedValueOnce(refusal);

      const created = await create();

      expect(created.isOk()).toBe(true);
      expect(calls).toEqual([
        'lease',
        'build',
        'releaseLease',
        'lease',
        'build',
        'signLeased',
        'device',
      ]);
      expect(builds).toHaveLength(2);
    });

    it('gives up after a second refusal, releasing both leases', async () => {
      const { create, sponsor, deviceSigner, submitted } = setup();
      sponsor.signLeased.mockRejectedValue(refusal);

      const created = await create();

      expect(created.isErr() && created.error).toBe(refusal);
      expect(sponsor.lease).toHaveBeenCalledTimes(2);
      expect(sponsor.releaseLease).toHaveBeenCalledTimes(2);
      expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
      expect(submitted).toEqual([]);
    });
  });

  it('refuses a sponsor address that holds no payment key before building', async () => {
    const { create, sponsor, builds } = setup();
    sponsor.lease.mockResolvedValueOnce({
      ...lease,
      sponsorAddress: record.address,
    });

    const created = await create();

    expect(created.isErr() && created.error).toEqual(
      new CardanoCustodyBuildFailedError({
        code: 'build-failed',
        message: 'The sponsor address has no payment key',
      }),
    );
    expect(builds).toEqual([]);
    expect(sponsor.releaseLease).toHaveBeenCalledWith(lease.leaseId);
  });

  it.each([
    [
      'a consumed lease',
      new CardanoCustodySponsorError({ status: 409, code: 'lease_consumed' }),
    ],
    [
      'an unreadable answer',
      new CardanoCustodySponsorError({
        status: 200,
        code: 'unexpected_response',
      }),
    ],
    ['a transport failure', new TypeError('fetch failed')],
  ])(
    'keeps the lease after %s, which may follow a witness',
    async (_, error) => {
      const { create, sponsor } = setup();
      sponsor.signLeased.mockRejectedValueOnce(error);

      const created = await create();

      expect(created.isErr() && created.error).toBe(error);
      expect(sponsor.releaseLease).not.toHaveBeenCalled();
    },
  );

  it('refuses a sponsor witness by another key before the device signs', async () => {
    const { create, sponsor, deviceSigner } = setup();
    sponsor.signLeased.mockImplementationOnce(async (_, transaction) =>
      sponsorWitnessSetFor(bodyHashOf(transaction), strangerKey),
    );

    const created = await create();

    expect(created.isErr() && created.error).toEqual(
      new CardanoCustodyWitnessError('sponsor', 'unexpected-key'),
    );
    expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
    expect(sponsor.releaseLease).not.toHaveBeenCalled();
  });

  it.each([
    ['not a witness set', '00', 'malformed'],
    [
      'a signature over another body',
      sponsorWitnessSetFor(Cardano.TransactionId('ab'.repeat(32))),
      'invalid-signature',
    ],
  ])('refuses a sponsor answer that is %s', async (_, answer, reason) => {
    const { create, sponsor } = setup();
    sponsor.signLeased.mockResolvedValueOnce(answer as never);

    const created = await create();

    expect(created.isErr() && created.error).toMatchObject({
      signer: 'sponsor',
      reason,
    });
  });

  it('refuses a device witness by another key without submitting', async () => {
    const { create, deviceSigner, submitted, sponsor } = setup();
    vi.mocked(deviceSigner.signTransaction).mockImplementationOnce(
      async ({ transaction }) =>
        vkeyWitnessSetOf([strangerKey.witnessOver(bodyHashOf(transaction))]),
    );

    const created = await create();

    expect(created.isErr() && created.error).toEqual(
      new CardanoCustodyWitnessError('device', 'unexpected-key'),
    );
    expect(submitted).toEqual([]);
    expect(sponsor.releaseLease).not.toHaveBeenCalled();
  });

  it('keeps the lease when the device declines', async () => {
    const { create, deviceSigner, sponsor, submitted } = setup();
    const declined = new Error('The passkey ceremony was cancelled.');
    vi.mocked(deviceSigner.signTransaction).mockRejectedValueOnce(declined);

    const created = await create();

    expect(created.isErr() && created.error).toBe(declined);
    expect(sponsor.releaseLease).not.toHaveBeenCalled();
    expect(submitted).toEqual([]);
  });

  it('refuses a device key of another network before leasing', async () => {
    const { wallet, sponsor, deviceSigner } = setup();

    const created = await createCardanoCustodyAccount(wallet, {
      device: { ...device, networkMagic: Cardano.NetworkMagics.Mainnet },
      deviceSigner,
      sponsor,
    });

    expect(created.isErr() && created.error).toBeInstanceOf(
      CardanoCustodyInvalidOperationError,
    );
    expect(created.isErr() && created.error).toMatchObject({
      reason: 'network-mismatch',
    });
    expect(sponsor.lease).not.toHaveBeenCalled();
  });

  it('waits for a new wallet to select its network before leasing', async () => {
    const { create, chainId$, sponsor } = setup();
    chainId$.next(undefined);

    const creating = create();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(sponsor.lease).not.toHaveBeenCalled();
    chainId$.next(PREPROD);

    expect((await creating).isOk()).toBe(true);
  });

  it('reports a wallet that selects no network within 30 seconds', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({
      now: NOW,
      toFake: [
        'Date',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
      ],
    });
    const { create, chainId$, sponsor } = setup();
    chainId$.next(undefined);

    const creating = create();
    await vi.advanceTimersByTimeAsync(30_000);

    const created = await creating;
    expect(created.isErr() && created.error).toEqual(
      new CardanoCustodyNetworkNotReadyError(30_000),
    );
    expect(created.isErr() && created.error).toMatchObject({
      missing: 'network',
    });
    expect(sponsor.lease).not.toHaveBeenCalled();
  });

  it('waits for the era summaries the build reads before leasing', async () => {
    const { create, eraSummaries$, sponsor, calls } = setup();
    eraSummaries$.next(undefined);

    const creating = create();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(sponsor.lease).not.toHaveBeenCalled();
    eraSummaries$.next(preprodEraSummaries);

    expect((await creating).isOk()).toBe(true);
    expect(calls).toEqual(['lease', 'build', 'signLeased', 'device']);
  });

  it('reports era summaries the provider does not load within 30 seconds', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({
      now: NOW,
      toFake: [
        'Date',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
      ],
    });
    const { create, eraSummaries$, sponsor } = setup();
    eraSummaries$.next([]);

    const creating = create();
    await vi.advanceTimersByTimeAsync(30_000);

    const created = await creating;
    expect(created.isErr() && created.error).toEqual(
      new CardanoCustodyNetworkNotReadyError(30_000, 'era-summaries'),
    );
    expect(created.isErr() && created.error).toMatchObject({
      missing: 'era-summaries',
    });
    expect(sponsor.lease).not.toHaveBeenCalled();
  });

  it('reports a lease the sponsor refuses', async () => {
    const { create, sponsor, builds } = setup();
    const refusal = new CardanoCustodySponsorError({
      status: 503,
      code: 'no_utxo_available',
    });
    sponsor.lease.mockRejectedValueOnce(refusal);

    const created = await create();

    expect(created.isErr() && created.error).toBe(refusal);
    expect(builds).toEqual([]);
  });

  it('releases the lease when the build names another creator key', async () => {
    const { create, control, sponsor } = setup();
    const result = creationResult();
    control.answerBuild = () => ({
      ok: true,
      result: {
        ...result,
        creation: {
          ...result.creation!,
          identity: {
            ...result.creation!.identity,
            creatorKeyHash: strangerKey.keyHash,
          },
        },
      },
    });

    const created = await create();

    expect(created.isErr() && created.error).toBeInstanceOf(
      CardanoCustodyBuildFailedError,
    );
    expect(sponsor.releaseLease).toHaveBeenCalled();
    expect(sponsor.signLeased).not.toHaveBeenCalled();
  });

  it('releases the lease when the build names no creator index', async () => {
    const { create, control, sponsor } = setup();
    control.answerBuild = () => ({
      ok: true,
      result: { ...creationResult(), creation: undefined },
    });

    const created = await create();

    expect(created.isErr() && created.error).toBeInstanceOf(
      CardanoCustodyBuildFailedError,
    );
    expect(sponsor.releaseLease).toHaveBeenCalled();
  });

  it('opens nothing and records nothing when the provider refuses the transaction', async () => {
    const { create, control, custodyAccount, activities$ } = setup();
    control.answerSubmit = () => ({ error: 'BadInputsUTxO' });

    const created = await create();

    expect(created.isErr() && created.error.message).toBe('BadInputsUTxO');
    expect(custodyAccount(accountId)).toBeUndefined();
    expect(activities$.value).toEqual({});
  });

  it.each([
    'ConwayCertsFailure (CertFailure (DelegFailure (StakeKeyRegisteredDELEG (ScriptHashObj (ScriptHash "ab")))))',
    '{"code":3145,"message":"CredentialAlreadyRegistered"}',
  ])(
    'names a credential someone registered since the scan, and opens nothing: %s',
    async error => {
      const { create, control, custodyAccount, activities$ } = setup();
      control.answerSubmit = () => ({ error });

      const created = await create();

      expect(created.isErr() && created.error).toEqual(
        new CardanoCustodyAlreadyRegisteredError(0),
      );
      expect(custodyAccount(accountId)).toBeUndefined();
      expect(activities$.value).toEqual({});
    },
  );

  describe('after a node refusal of a changed logic reward balance', () => {
    const incompleteWithdrawal = {
      error: 'ConwayLedgerFailure (ConwayIncompleteWithdrawals (fromList []))',
    };

    it('runs once more from a new lease', async () => {
      const { create, control, calls, submitted, custodyAccount } = setup();
      let refusals = 1;
      control.answerSubmit = () =>
        refusals-- > 0 ? incompleteWithdrawal : 'ok';

      const created = await create();

      expect(created.isOk()).toBe(true);
      expect(calls).toEqual([
        'lease',
        'build',
        'signLeased',
        'device',
        'lease',
        'build',
        'signLeased',
        'device',
      ]);
      expect(submitted).toHaveLength(2);
      expect(custodyAccount(accountId)).toBeDefined();
    });

    it('fails with the typed error after a second such refusal, and opens nothing', async () => {
      const { create, control, builds, custodyAccount, activities$ } = setup();
      control.answerSubmit = () => incompleteWithdrawal;

      const created = await create();

      expect(created.isErr() && created.error).toBeInstanceOf(
        CardanoCustodyRewardBalanceChangedError,
      );
      expect(builds).toHaveLength(2);
      expect(custodyAccount(accountId)).toBeUndefined();
      expect(activities$.value).toEqual({});
    });
  });

  it('opens the account and records its creation when the submission has an unknown outcome', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({
      now: NOW,
      toFake: [
        'Date',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
      ],
    });
    const {
      create,
      control,
      wallet,
      sponsor,
      deviceSigner,
      custodyAccount,
      activities$,
      settledUtxos$,
    } = setup();
    control.answerSubmit = () => 'silent';

    let isSettled = false;
    const pending = create().finally(() => {
      isSettled = true;
    });
    while (!isSettled) await vi.advanceTimersByTimeAsync(10_000);
    const created = await pending;

    const { bodyHash: txId, invalidHereafter } = creationResult();
    expect(created.isErr() && created.error).toBeInstanceOf(
      CardanoCustodyOutcomeUnknownError,
    );
    expect(created.isErr() && created.error).toMatchObject({
      accountId,
      txId,
      invalidHereafter,
    });
    expect(custodyAccount(accountId)?.blockchainSpecific.device).toMatchObject({
      keyHash: DEVICE_0,
    });
    expect(activities$.value[accountId]).toEqual([
      expect.objectContaining({
        activityId: txId,
        type: ActivityType.Pending,
      }),
    ]);

    const next = await executeCardanoCustodyOperation(wallet, {
      accountId,
      operation: { type: 'revoke-all-grants' },
      deviceSigner,
      sponsor,
    });
    expect(next.isErr() && next.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );

    const waiting = waitForCardanoCustodyOperation(wallet, {
      accountId,
      txId,
      invalidHereafter,
    });
    const [controlOutput] = creationShape().outputs;
    settledUtxos$.next({
      [accountId]: [
        [{ txId, index: 0, address: record.address }, controlOutput],
      ],
    });
    expect((await waiting).unwrap()).toEqual({ txId });
  });
});
