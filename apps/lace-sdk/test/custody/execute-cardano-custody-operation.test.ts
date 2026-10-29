import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { ActivityType } from '@lace-contract/activities';
import { RemoteSignerError } from '@lace-lib/passkey';
import { Timestamp } from '@lace-lib/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openCardanoCustodyAccount } from '../../src/custody/cardano-custody-account-entity';
import {
  createLocalCardanoCustodyDeviceSigner,
  createRemoteCardanoCustodyDeviceSigner,
} from '../../src/custody/cardano-custody-device-signer';
import {
  CardanoCustodyBuildFailedError,
  CardanoCustodyDeviceNotListedError,
  CardanoCustodyFundContentionError,
  CardanoCustodyGrantSpendError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyLogicNotServedError,
  CardanoCustodyLogicRewardBalanceError,
  CardanoCustodyOperationInProgressError,
  CardanoCustodyOutcomeUnknownError,
  CardanoCustodyRewardBalanceChangedError,
  CardanoCustodyScriptDataHashError,
  CardanoCustodyStaleControlError,
  CardanoCustodyUnsupportedSignerError,
} from '../../src/custody/cardano-custody-errors';
import { CardanoCustodySponsorError } from '../../src/custody/cardano-custody-sponsor';
import { executeCardanoCustodyOperation } from '../../src/custody/execute-cardano-custody-operation';
import { waitForCardanoCustodyOperation } from '../../src/custody/wait-for-cardano-custody-operation';

import {
  agentGrant,
  agentGrantUtxo,
  buildResultOf,
  controlOutput,
  createCustodyTestWallet,
  creatorBinding,
  DEVICE_1,
  fundUtxo,
  grantedControl,
  hostedChannel,
  initialState,
  issueGrantShape,
  liveControl,
  localChannel,
  LOGIC_REWARD_ACCOUNT,
  ownerSpendShape,
  RECIPIENT_ADDRESS,
  preprodEraSummaries,
  record,
  sponsorCollateral,
  sweepGrantShape,
  transactionOf,
  utxo,
  words,
} from './custody-fixtures';
import { collateral, createSponsorFake, NOW } from './custody-sponsor-fake';

import type {
  CardanoCustodyDeviceSigner,
  CardanoCustodyDeviceSignRequest,
} from '../../src/custody/cardano-custody-device-signer';
import type { CardanoCustodyOperation } from '../../src/custody/execute-cardano-custody-operation';
import type {
  CardanoCustodyBuildError,
  CardanoCustodyDeviceBinding,
} from '@lace-contract/cardano-context';
import type { PasskeyKeySource } from '@lace-lib/passkey';

const LOGIC_HASH = Hash28ByteBase16(initialState.logic);

const keySource = (): PasskeyKeySource => ({
  ensureCredential: vi.fn(),
  credentialRef: vi.fn(() => ({
    ...localChannel,
    recipeVersion: 'v1' as const,
  })),
  withPasskeyMnemonic: async use => use(words),
});

const issueGrant: CardanoCustodyOperation = {
  type: 'issue-grant',
  scope: {
    grantee: agentGrant.grantee,
    asset: agentGrant.scope.asset,
    perCallCap: agentGrant.scope.perCallCap,
    cap: agentGrant.scope.cap,
    lovelacePerCallCap: 0n,
    lovelaceCap: 0n,
    expiresAt: agentGrant.scope.expiresAt,
    recipients: [],
  },
};

const setup = async ({
  device = creatorBinding(localChannel),
}: { device?: CardanoCustodyDeviceBinding | null } = {}) => {
  const test = createCustodyTestWallet();
  const { sponsor, calls } = createSponsorFake();
  const local = createLocalCardanoCustodyDeviceSigner({
    keySource: keySource(),
    now: () => NOW,
  });
  const deviceSigner: CardanoCustodyDeviceSigner = {
    signTransaction: vi.fn(async (request: CardanoCustodyDeviceSignRequest) => {
      calls.push('device');
      return local.signTransaction(request);
    }),
  };
  const { accountId } = await openCardanoCustodyAccount(test.wallet, {
    record,
    ...(device && { device }),
    name: 'Treasury',
  });
  test.settledUtxos$.next({ [accountId]: [liveControl, fundUtxo] });
  test.control.answerBuild = () => {
    calls.push('build');
    return { ok: true, result: buildResultOf(issueGrantShape()) };
  };
  const failBuildWith = (error: CardanoCustodyBuildError) => {
    test.control.answerBuild = () => ({ ok: false, error });
  };
  const execute = async (
    operation: CardanoCustodyOperation = issueGrant,
    signer: CardanoCustodyDeviceSigner = deviceSigner,
    extra: {
      reference?: string;
      metadataMeanings?: Record<string, string>;
    } = {},
  ) =>
    executeCardanoCustodyOperation(test.wallet, {
      accountId,
      operation,
      deviceSigner: signer,
      sponsor,
      ...extra,
    });
  return {
    ...test,
    accountId,
    sponsor,
    calls,
    deviceSigner,
    failBuildWith,
    execute,
  };
};

type Setup = Awaited<ReturnType<typeof setup>>;

describe('executeCardanoCustodyOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds on the sponsor collateral, has the sponsor sign before the device, and submits', async () => {
    const { execute, calls, builds, submitted, accountId, activities$ } =
      await setup();

    const executed = await execute();

    expect(executed.unwrap()).toEqual({
      txId: buildResultOf(issueGrantShape()).bodyHash,
      invalidHereafter: buildResultOf(issueGrantShape()).invalidHereafter,
      grantSlot: 0n,
    });
    expect(calls).toEqual(['collateral', 'build', 'signCollateral', 'device']);
    expect(builds[0]).toMatchObject({
      accountId,
      operation: issueGrant,
      funding: {
        mode: 'collateral',
        collateralUtxo: sponsorCollateral,
        sponsorAddress: collateral.sponsorAddress,
        validUntil: NOW + 600_000 - 60_000,
      },
    });
    expect(submitted).toHaveLength(1);
    expect(activities$.value[accountId]).toEqual([
      expect.objectContaining({
        blockchainSpecific: {
          Cardano: expect.objectContaining({
            custody: {
              invalidHereafter: buildResultOf(issueGrantShape())
                .invalidHereafter,
              operation: 'issue-grant',
              status: 'pending',
            },
          }) as unknown,
        },
      }),
    ]);
  });

  it('keeps the app reference on the pending activity', async () => {
    const { execute, accountId, activities$ } = await setup();

    await execute(issueGrant, undefined, { reference: 'intent-42' });

    expect(activities$.value[accountId]).toEqual([
      expect.objectContaining({
        blockchainSpecific: {
          Cardano: expect.objectContaining({
            custody: expect.objectContaining({
              reference: 'intent-42',
            }) as unknown,
          }) as unknown,
        },
      }),
    ]);
  });

  it('waits for the era summaries the build reads', async () => {
    const { execute, calls, eraSummaries$ } = await setup();
    eraSummaries$.next(undefined);

    const executing = execute();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calls).toEqual([]);
    eraSummaries$.next(preprodEraSummaries);

    expect((await executing).isOk()).toBe(true);
    expect(calls).toEqual(['collateral', 'build', 'signCollateral', 'device']);
  });

  it('declares the grant it issues and sends the grant UTxOs to the device', async () => {
    const { execute, deviceSigner } = await setup();

    await execute();

    expect(deviceSigner.signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        device: creatorBinding(localChannel),
        requestedScopes: [{ slot: 0n, ...issueGrant.scope }],
        grantUtxos: [],
      }),
    );
  });

  it('sends every grant UTxO of the account to the device, whatever the operation', async () => {
    const { execute, deviceSigner, settledUtxos$, accountId } = await setup();
    settledUtxos$.next({
      [accountId]: [grantedControl, agentGrantUtxo, fundUtxo],
    });

    await execute({ type: 'revoke-grant', slot: 0n });

    expect(
      vi.mocked(deviceSigner.signTransaction).mock.calls[0][0],
    ).toMatchObject({ grantUtxos: [agentGrantUtxo] });
  });

  it.each<CardanoCustodyOperation>([
    { type: 'sweep-grants', slots: [0n] },
    { type: 'revoke-all-grants' },
    { type: 'replace-grant', slot: 0n, scope: issueGrant.scope },
  ])('builds a $type operation as given', async operation => {
    const { wallet, accountId, sponsor, builds } = await setup();

    await executeCardanoCustodyOperation(wallet, {
      accountId,
      operation,
      deviceSigner: {
        signTransaction: vi.fn(async () => Promise.reject(new Error('stop'))),
      },
      sponsor,
    });

    expect(builds[0].operation).toEqual(operation);
  });

  describe('names the slot of the grant it issues', () => {
    // The fake build always answers the transaction that issues slot 0, so
    // the device is told to expect that grant whatever the operation names.
    const executeDeclaringSlot0 = async (
      { wallet, accountId, sponsor, deviceSigner }: Setup,
      operation: CardanoCustodyOperation,
    ) =>
      executeCardanoCustodyOperation(wallet, {
        accountId,
        operation,
        deviceSigner,
        sponsor,
        requestedScopes: [{ slot: 0n, ...issueGrant.scope }],
      });

    it('the next slot of the account state', async () => {
      const test = await setup();
      test.settledUtxos$.next({
        [test.accountId]: [grantedControl, fundUtxo],
      });

      const executed = await executeDeclaringSlot0(test, issueGrant);

      expect(test.builds[0].operation).not.toHaveProperty('slot');
      expect(executed.unwrap().grantSlot).toBe(1n);
    });

    it('the new slot of a replacement, not the revoked one', async () => {
      const test = await setup();
      test.settledUtxos$.next({
        [test.accountId]: [grantedControl, agentGrantUtxo, fundUtxo],
      });

      const executed = await executeDeclaringSlot0(test, {
        type: 'replace-grant',
        slot: 0n,
        scope: issueGrant.scope,
      });

      expect(executed.unwrap().grantSlot).toBe(1n);
    });

    it('no slot when the provider refuses the transaction', async () => {
      const { execute, control } = await setup();
      control.answerSubmit = () => ({ error: 'ValueNotConservedUTxO' });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toEqual(
        new Error('ValueNotConservedUTxO'),
      );
    });

    it('no slot for an operation that issues no grant', async () => {
      const { execute } = await setup();

      const executed = await execute({ type: 'revoke-grant', slot: 0n });

      expect(executed.unwrap()).not.toHaveProperty('grantSlot');
    });
  });

  it('passes declared scopes through as given', async () => {
    const { wallet, accountId, sponsor } = await setup();
    const signTransaction = vi.fn(async () => {
      throw new Error('stop');
    });
    const requestedScopes = [{ slot: 4n, ...issueGrant.scope }];

    await executeCardanoCustodyOperation(wallet, {
      accountId,
      operation: { type: 'revoke-grant', slot: 0n },
      deviceSigner: { signTransaction },
      sponsor,
      requestedScopes,
    });

    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ requestedScopes }),
    );
  });

  it('builds an owner spend with its metadata and tells the device what it means', async () => {
    const { wallet, accountId, sponsor, builds, control } = await setup();
    const metadata: Cardano.TxMetadata = new Map([
      [
        1971n,
        new Map<Cardano.Metadatum, Cardano.Metadatum>([['intentId', 'pi_42']]),
      ],
    ]);
    control.answerBuild = () => ({
      ok: true,
      result: buildResultOf({
        ...ownerSpendShape(),
        auxiliaryData: { blob: metadata },
      }),
    });
    const signTransaction = vi.fn(async () => {
      throw new Error('stop');
    });
    const metadataMeanings = { 1971: 'Midnight City subscription payment' };

    await executeCardanoCustodyOperation(wallet, {
      accountId,
      operation: {
        type: 'owner-spend',
        outputs: [{ address: RECIPIENT_ADDRESS, value: { coins: 2_000_000n } }],
        metadata,
      },
      deviceSigner: { signTransaction },
      sponsor,
      metadataMeanings,
    });

    expect(builds[0].operation).toMatchObject({
      type: 'owner-spend',
      metadata,
    });
    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ metadataMeanings }),
    );
  });

  it('tells the device no metadata meaning when the app gives none', async () => {
    const { execute, deviceSigner } = await setup();

    await execute();

    expect(
      vi.mocked(deviceSigner.signTransaction).mock.calls[0][0],
    ).not.toHaveProperty('metadataMeanings');
  });

  it('declares no scope for an operation that writes none', async () => {
    const { execute, deviceSigner } = await setup();

    await execute({ type: 'revoke-all-grants' });

    expect(
      vi.mocked(deviceSigner.signTransaction).mock.calls[0][0],
    ).not.toHaveProperty('requestedScopes');
  });

  it('keeps the validity bound half a short sponsor window from its edge', async () => {
    const { execute, sponsor, builds } = await setup();
    sponsor.collateral.mockResolvedValue({
      ...collateral,
      validitySeconds: 60,
    });

    await execute();

    expect(builds[0].funding.validUntil).toBe(NOW + 30_000);
  });

  it('refuses the next operation until the submitted one settles', async () => {
    const { execute, sponsor, accountId } = await setup();
    await execute();
    sponsor.collateral.mockClear();

    const next = await execute();

    expect(next.isErr() && next.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );
    expect(sponsor.collateral).not.toHaveBeenCalled();
  });

  it('rebuilds once on new collateral after a shared-collateral refusal', async () => {
    const { execute, sponsor, builds } = await setup();
    sponsor.signCollateral.mockRejectedValueOnce(
      new CardanoCustodySponsorError({
        status: 422,
        code: 'invalid_transaction',
        rule: 'uses_shared_collateral',
      }),
    );

    const executed = await execute();

    expect(executed.isOk()).toBe(true);
    expect(sponsor.collateral).toHaveBeenCalledTimes(2);
    expect(builds).toHaveLength(2);
  });

  it('gives up after a second shared-collateral refusal', async () => {
    const { execute, sponsor, deviceSigner } = await setup();
    const refusal = new CardanoCustodySponsorError({
      status: 422,
      code: 'invalid_transaction',
      rule: 'uses_shared_collateral',
    });
    sponsor.signCollateral.mockRejectedValue(refusal);

    const executed = await execute();

    expect(executed.isErr() && executed.error).toBe(refusal);
    expect(sponsor.collateral).toHaveBeenCalledTimes(2);
    expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
  });

  it('does not rebuild after any other sponsor refusal', async () => {
    const { execute, sponsor } = await setup();
    const refusal = new CardanoCustodySponsorError({
      status: 422,
      code: 'invalid_transaction',
      rule: 'collateral_mode_sponsor_input',
    });
    sponsor.signCollateral.mockRejectedValueOnce(refusal);

    const executed = await execute();

    expect(executed.isErr() && executed.error).toBe(refusal);
    expect(sponsor.collateral).toHaveBeenCalledTimes(1);
  });

  it.each<CardanoCustodyOperation>([
    issueGrant,
    { type: 'replace-grant', slot: 0n, scope: issueGrant.scope },
    { type: 'sweep-grants', slots: [0n] },
  ])(
    'maps a spent control during $type before device signing',
    async operation => {
      const { execute, sponsor, deviceSigner, submitted, control, builds } =
        await setup();
      if (operation.type === 'sweep-grants') {
        control.answerBuild = () => ({
          ok: true,
          result: buildResultOf(sweepGrantShape()),
        });
      }
      sponsor.signCollateral.mockRejectedValueOnce(
        new CardanoCustodySponsorError({
          status: 422,
          code: 'invalid_transaction',
          rule: 'account_transaction',
          detail:
            'An account creation mints exactly one token under the account policy',
        }),
      );

      const result = await execute(operation);

      expect(result.isErr() && result.error).toEqual(
        new CardanoCustodyStaleControlError(),
      );
      expect(builds).toHaveLength(1);
      expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
      expect(submitted).toEqual([]);
    },
  );

  it('maps sponsor uncovered outflow to fund contention before device signing', async () => {
    const { execute, sponsor, deviceSigner, submitted } = await setup();
    sponsor.signCollateral.mockRejectedValueOnce(
      new CardanoCustodySponsorError({
        status: 422,
        code: 'invalid_transaction',
        rule: 'no_sponsor_value_elsewhere',
        detail: 'Outputs exceed the non-sponsor inputs',
      }),
    );

    const result = await execute();

    expect(result.isErr() && result.error).toEqual(
      new CardanoCustodyFundContentionError([
        { txId: fundUtxo[0].txId, index: fundUtxo[0].index },
      ]),
    );
    expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
    expect(submitted).toEqual([]);
  });

  describe('refuses before any sponsor or device request', () => {
    it('an account opened as an observer', async () => {
      const { execute, sponsor } = await setup({ device: null });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'observer-account',
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
    });

    it('an account that is not live', async () => {
      const { execute, sponsor, settledUtxos$, accountId } = await setup();
      settledUtxos$.next({ [accountId]: [fundUtxo] });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'account-not-live',
        detail: { status: 'notCreated' },
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
    });

    it('an account whose control state names a logic the SDK does not accept', async () => {
      const { execute, sponsor, settledUtxos$, accountId } = await setup();
      const logic = HexBlob(
        '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
      );
      settledUtxos$.next({
        [accountId]: [
          utxo(0x10, controlOutput({ ...initialState, logic })),
          fundUtxo,
        ],
      });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'account-not-live',
        detail: { status: 'invalid', reason: { code: 'unknown-logic', logic } },
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
    });

    it('a device the state does not list', async () => {
      const { execute, sponsor } = await setup({
        device: {
          ...creatorBinding(localChannel),
          index: 1,
          keyHash: DEVICE_1,
        },
      });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toEqual(
        new CardanoCustodyDeviceNotListedError(DEVICE_1),
      );
      expect(sponsor.collateral).not.toHaveBeenCalled();
    });

    it('an account the wallet does not hold', async () => {
      const { wallet, sponsor, deviceSigner } = await setup();

      const executed = await executeCardanoCustodyOperation(wallet, {
        accountId: 'missing' as never,
        operation: issueGrant,
        deviceSigner,
        sponsor,
      });

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'unknown-account',
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
    });

    it.each(['grant-spend', 'create'])('a %s operation', async type => {
      const { execute, sponsor } = await setup();

      const executed = await execute({ type } as never);

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'unknown-operation',
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
    });

    it('a reference over 200 characters', async () => {
      const { execute, sponsor, deviceSigner } = await setup();

      const executed = await execute(issueGrant, undefined, {
        reference: 'x'.repeat(201),
      });

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'reference-too-long',
        detail: { length: 201, limit: 200 },
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
      expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
    });
  });

  describe('refuses a metadata meaning the device would refuse, before the sponsor', () => {
    const paying: CardanoCustodyOperation = {
      type: 'owner-spend',
      outputs: [{ address: RECIPIENT_ADDRESS, value: { coins: 2_000_000n } }],
      metadata: new Map([[1971n, 'intent-1']]),
    };

    it.each<[string, Record<string, string>, object]>([
      [
        'a key that is not a label',
        { x: 'plan' },
        { label: 'x', problem: 'not-a-label' },
      ],
      [
        'a label over 64 bits',
        { '18446744073709551616': 'plan' },
        { problem: 'not-a-label' },
      ],
      [
        'a label the metadata does not carry',
        { 674: 'plan' },
        { label: '674', problem: 'not-carried' },
      ],
      ['an empty meaning', { 1971: '' }, { label: '1971', problem: 'empty' }],
      [
        'a meaning over 200 characters',
        { 1971: 'x'.repeat(201) },
        { label: '1971', problem: 'too-long', limit: 200 },
      ],
    ])('%s', async (_, metadataMeanings, detail) => {
      const { execute, sponsor, deviceSigner } = await setup();

      const executed = await execute(paying, undefined, { metadataMeanings });

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'invalid-metadata-meaning',
        detail,
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
      expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
    });

    it('a meaning on an operation that carries no metadata', async () => {
      const { execute, sponsor } = await setup();

      const executed = await execute(issueGrant, undefined, {
        metadataMeanings: { 1971: 'plan' },
      });

      expect(executed.isErr() && executed.error).toMatchObject({
        reason: 'invalid-metadata-meaning',
        detail: { label: '1971', problem: 'not-carried' },
      });
      expect(sponsor.collateral).not.toHaveBeenCalled();
    });
  });

  it('accepts a reference of 200 characters', async () => {
    const { execute } = await setup();

    const executed = await execute(issueGrant, undefined, {
      reference: 'x'.repeat(200),
    });

    expect(executed.isOk()).toBe(true);
  });

  it.each<[string, CardanoCustodyBuildError, Error]>([
    [
      'stale-control',
      { code: 'stale-control' },
      new CardanoCustodyStaleControlError(),
    ],
    [
      'device-not-listed',
      { code: 'device-not-listed', keyHash: DEVICE_1 },
      new CardanoCustodyDeviceNotListedError(DEVICE_1),
    ],
    [
      'grant-spend',
      { code: 'grant-spend', reason: 'fee-above-bound', fee: 2n, feeBound: 1n },
      new CardanoCustodyGrantSpendError('fee-above-bound', {
        fee: 2n,
        feeBound: 1n,
      }),
    ],
    [
      'invalid-operation',
      {
        code: 'invalid-operation',
        reason: 'no-rewards',
        message: 'nothing to withdraw',
      },
      new CardanoCustodyInvalidOperationError('no-rewards', {
        message: 'nothing to withdraw',
      }),
    ],
    [
      'grantee-has-grant',
      {
        code: 'invalid-operation',
        reason: 'state-transition',
        error: {
          code: 'grantee-has-grant',
          grantee: agentGrant.grantee,
          slot: 0n,
        },
      },
      new CardanoCustodyInvalidOperationError('grantee-has-grant', {
        grantee: agentGrant.grantee,
        slot: 0n,
      }),
    ],
    [
      'grant-limit',
      { code: 'grant-limit', limit: 16 },
      new CardanoCustodyInvalidOperationError('grant-limit', { limit: 16 }),
    ],
    [
      'revoked-list-full',
      { code: 'revoked-list-full', limit: 32 },
      new CardanoCustodyInvalidOperationError('revoked-list-full', {
        limit: 32,
      }),
    ],
    [
      'sweep-not-dead',
      { code: 'sweep-not-dead', slot: 0n, liveness: 'current' },
      new CardanoCustodyInvalidOperationError('sweep-not-dead', {
        slot: 0n,
        liveness: 'current',
      }),
    ],
    [
      'owner-reserve-required',
      { code: 'owner-reserve-required', target: 1_500_000n, shortfall: 1n },
      new CardanoCustodyBuildFailedError({
        code: 'owner-reserve-required',
        target: 1_500_000n,
        shortfall: 1n,
      }),
    ],
    [
      'collateral-fee-ceiling',
      { code: 'collateral-fee-ceiling', fee: 3n, maxFee: 2n },
      new CardanoCustodyBuildFailedError({
        code: 'collateral-fee-ceiling',
        fee: 3n,
        maxFee: 2n,
      }),
    ],
    [
      'observer-account',
      { code: 'observer-account' },
      new CardanoCustodyInvalidOperationError('observer-account'),
    ],
    [
      'account-not-live',
      { code: 'account-not-live', status: 'invalid' },
      new CardanoCustodyInvalidOperationError('account-not-live', {
        status: 'invalid',
      }),
    ],
    [
      'insufficient-funds',
      { code: 'insufficient-funds', message: 'short by 1 ADA' },
      new CardanoCustodyBuildFailedError({
        code: 'insufficient-funds',
        message: 'short by 1 ADA',
      }),
    ],
    [
      'sponsor-rules logic draw',
      {
        code: 'sponsor-rules',
        violations: [
          {
            rule: 'no_foreign_scripts',
            reason: 'logic-draw',
            logic: LOGIC_HASH,
            quantity: 1_500_000n,
            rewardAccount: LOGIC_REWARD_ACCOUNT,
          },
        ],
      },
      new CardanoCustodyLogicRewardBalanceError(LOGIC_HASH, 1_500_000n),
    ],
    [
      'inspection-refused logic draw',
      {
        code: 'inspection-refused',
        refusals: [
          {
            code: 'custody-unsupported-operation',
            reason: 'logic-draw-leaves-account',
            account: {
              accountValidatorHash: Hash28ByteBase16(
                record.accountValidatorHash,
              ),
              stakeScriptHash: Hash28ByteBase16(record.stakeScriptHash),
            },
            logic: HexBlob(LOGIC_HASH),
            quantity: 1_500_000n,
          },
        ],
      },
      new CardanoCustodyLogicRewardBalanceError(LOGIC_HASH, 1_500_000n),
    ],
    [
      'inspection-refused',
      {
        code: 'inspection-refused',
        refusals: [
          {
            code: 'custody-unsupported-operation',
            reason: 'duplicate-withdrawal',
            rewardAccount: LOGIC_REWARD_ACCOUNT,
          },
        ],
      },
      new CardanoCustodyBuildFailedError({
        code: 'inspection-refused',
        refusals: [
          {
            code: 'custody-unsupported-operation',
            reason: 'duplicate-withdrawal',
            rewardAccount: LOGIC_REWARD_ACCOUNT,
          },
        ],
      }),
    ],
    [
      'sponsor-rules',
      {
        code: 'sponsor-rules',
        violations: [
          {
            rule: 'signers',
            reason: 'sponsor-required-signer',
            keyHash: 'ab'.repeat(28),
          },
        ],
      },
      new CardanoCustodyBuildFailedError({
        code: 'sponsor-rules',
        violations: [
          {
            rule: 'signers',
            reason: 'sponsor-required-signer',
            keyHash: 'ab'.repeat(28),
          },
        ],
      }),
    ],
  ])(
    'maps the %s build failure to its typed error',
    async (_, error, expected) => {
      const { execute, failBuildWith, sponsor } = await setup();
      failBuildWith(error);

      const executed = await execute();

      expect(executed.isErr() && executed.error).toEqual(expected);
      expect(executed.isErr() && executed.error.constructor).toBe(
        expected.constructor,
      );
      expect(sponsor.signCollateral).not.toHaveBeenCalled();
      expect(sponsor.lease).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'known_logic',
      `The control UTxO ${liveControl[0].txId}#0 of account ${
        record.stakeScriptHash
      } names logic ${'ab'.repeat(
        28,
      )}, which is not one of the logic scripts the service knows`,
      CardanoCustodyLogicNotServedError,
    ],
    [
      'script_data_hash',
      `The body commits to the script data hash ${'aa'.repeat(
        32,
      )} while the witness set carries script data hashing to ${'bb'.repeat(
        32,
      )}`,
      CardanoCustodyScriptDataHashError,
    ],
    [
      'no_foreign_scripts',
      `The withdrawal that runs logic ${LOGIC_HASH} draws 1500000 lovelace, and a logic runs on a withdrawal of zero`,
      CardanoCustodyLogicRewardBalanceError,
    ],
  ])(
    'answers a %s refusal no build can avoid with its typed error, without building again or asking the device',
    async (rule, detail, expected) => {
      const { execute, sponsor, deviceSigner, builds } = await setup();
      sponsor.signCollateral.mockRejectedValueOnce(
        new CardanoCustodySponsorError({
          status: 422,
          code: 'invalid_transaction',
          rule,
          detail,
        }),
      );

      const executed = await execute();

      expect(executed.isErr() && executed.error).toBeInstanceOf(expected);
      expect(builds).toHaveLength(1);
      expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
    },
  );

  describe('a sponsor refusal that means an input left the chain', () => {
    const refusal = (rule: string, detail: string) =>
      new CardanoCustodySponsorError({
        status: 422,
        code: 'invalid_transaction',
        rule,
        detail,
      });

    it.each<[string, CardanoCustodySponsorError, Error]>([
      [
        'a spent control UTxO',
        refusal(
          'account_transaction',
          'No input is an account control or grant UTxO and nothing is minted under the account policy',
        ),
        new CardanoCustodyStaleControlError(),
      ],
      [
        'a spent fund UTxO',
        refusal(
          'evaluates',
          `Input ${fundUtxo[0].txId}#${fundUtxo[0].index} is not an unspent output the chain knows`,
        ),
        new CardanoCustodyFundContentionError([
          { txId: fundUtxo[0].txId, index: fundUtxo[0].index },
        ]),
      ],
      [
        'a spent control UTxO named as an unknown input',
        refusal(
          'evaluates',
          `Input ${liveControl[0].txId}#0 is not an unspent output the chain knows`,
        ),
        new CardanoCustodyStaleControlError(),
      ],
    ])(
      'answers %s with its typed error, without a rebuild or the device',
      async (_, sponsorRefusal, expected) => {
        const { execute, sponsor, deviceSigner, builds } = await setup();
        sponsor.signCollateral.mockRejectedValueOnce(sponsorRefusal);

        const executed = await execute();

        expect(executed.isErr() && executed.error).toEqual(expected);
        expect(executed.isErr() && executed.error.constructor).toBe(
          expected.constructor,
        );
        expect(builds).toHaveLength(1);
        expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
      },
    );
  });

  describe('a node refusal of inputs it does not hold', () => {
    it('names the stale control UTxO', async () => {
      const { execute, control, activities$, accountId } = await setup();
      control.answerSubmit = () => ({
        error: `Bad Request (ConwayUtxowFailure (UtxoFailure (BadInputsUTxO (fromList [TxIn (TxId {unTxId = SafeHash \\"${liveControl[0].txId}\\"}) (TxIx 0)]))))`,
      });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toBeInstanceOf(
        CardanoCustodyStaleControlError,
      );
      expect(activities$.value[accountId]).toBeUndefined();
    });

    it('names fund contention when only a fund UTxO is gone', async () => {
      const { execute, control } = await setup();
      control.answerSubmit = () => ({
        error: `{"code":3117,"message":"UnknownOutputReferences","data":{"unknownOutputReferences":[{"transaction":{"id":"${fundUtxo[0].txId}"},"index":0}]}}`,
      });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toEqual(
        new CardanoCustodyFundContentionError([
          { txId: fundUtxo[0].txId, index: fundUtxo[0].index },
        ]),
      );
    });

    it('does not take another output of the same transaction for the input', async () => {
      const { execute, control } = await setup();
      control.answerSubmit = () => ({
        error: `BadInputsUTxO (fromList [TxIn (TxId {unTxId = SafeHash "${fundUtxo[0].txId}"}) (TxIx 7)])`,
      });

      const executed = await execute();

      expect(executed.isErr() && executed.error).toBeInstanceOf(
        CardanoCustodyStaleControlError,
      );
    });
  });

  describe('a node refusal of a changed reward balance', () => {
    const incompleteWithdrawal = {
      error: 'ConwayLedgerFailure (ConwayIncompleteWithdrawals (fromList []))',
    };

    it('builds, signs and submits once more', async () => {
      const { execute, control, sponsor, deviceSigner, builds, submitted } =
        await setup();
      let refusals = 1;
      control.answerSubmit = () =>
        refusals-- > 0 ? incompleteWithdrawal : 'ok';

      const executed = await execute();

      expect(executed.isOk()).toBe(true);
      expect(builds).toHaveLength(2);
      expect(sponsor.signCollateral).toHaveBeenCalledTimes(2);
      expect(deviceSigner.signTransaction).toHaveBeenCalledTimes(2);
      expect(submitted).toHaveLength(2);
    });

    it('fails with the typed error when the second submission is refused the same way', async () => {
      const { execute, control, deviceSigner, builds, activities$, accountId } =
        await setup();
      control.answerSubmit = () => incompleteWithdrawal;

      const executed = await execute();

      expect(executed.isErr() && executed.error).toBeInstanceOf(
        CardanoCustodyRewardBalanceChangedError,
      );
      expect(builds).toHaveLength(2);
      expect(deviceSigner.signTransaction).toHaveBeenCalledTimes(2);
      expect(activities$.value[accountId]).toBeUndefined();
    });
  });

  it('maps operation-in-progress and unknown-account to the account', async () => {
    const { execute, failBuildWith, accountId } = await setup();

    failBuildWith({ code: 'operation-in-progress' });
    const inProgress = await execute();
    failBuildWith({ code: 'unknown-account' });
    const unknown = await execute();

    expect(inProgress.isErr() && inProgress.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );
    expect(unknown.isErr() && unknown.error).toMatchObject({
      reason: 'unknown-account',
      detail: { accountId },
    });
  });

  it('reports a hosted signer without custody support', async () => {
    const { execute } = await setup({
      device: creatorBinding(hostedChannel),
    });

    const executed = await execute(
      issueGrant,
      createRemoteCardanoCustodyDeviceSigner({
        request: vi.fn(async () => {
          throw new RemoteSignerError(
            'unsupported-request',
            'Unknown request kind',
          );
        }),
      }),
    );

    expect(executed.isErr() && executed.error).toBeInstanceOf(
      CardanoCustodyUnsupportedSignerError,
    );
  });

  it('refuses a sponsor address that holds no payment key before building', async () => {
    const { execute, sponsor, deviceSigner, builds } = await setup();
    sponsor.collateral.mockResolvedValue({
      ...collateral,
      sponsorAddress: record.address,
    });

    const executed = await execute();

    expect(executed.isErr() && executed.error).toEqual(
      new CardanoCustodyBuildFailedError({
        code: 'build-failed',
        message: 'The sponsor address has no payment key',
      }),
    );
    expect(builds).toEqual([]);
    expect(sponsor.signCollateral).not.toHaveBeenCalled();
    expect(deviceSigner.signTransaction).not.toHaveBeenCalled();
  });

  it('records the operation and refuses the next when the submission has an unknown outcome', async () => {
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
    const { execute, control, activities$, accountId, sponsor } = await setup();
    control.answerSubmit = () => 'silent';

    let isSettled = false;
    const pending = execute().finally(() => {
      isSettled = true;
    });
    while (!isSettled) await vi.advanceTimersByTimeAsync(10_000);
    const executed = await pending;

    const { bodyHash: txId, invalidHereafter } = buildResultOf(
      issueGrantShape(),
    );
    expect(executed.isErr() && executed.error).toBeInstanceOf(
      CardanoCustodyOutcomeUnknownError,
    );
    expect(executed.isErr() && executed.error).toMatchObject({
      accountId,
      txId,
      invalidHereafter,
      grantSlot: 0n,
    });
    expect(activities$.value[accountId]).toEqual([
      expect.objectContaining({
        activityId: txId,
        type: ActivityType.Pending,
        blockchainSpecific: {
          Cardano: expect.objectContaining({
            custody: expect.objectContaining({
              status: 'outcome-unknown',
            }) as unknown,
          }) as unknown,
        },
      }),
    ]);
    sponsor.collateral.mockClear();

    const next = await execute();

    expect(next.isErr() && next.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );
    expect(sponsor.collateral).not.toHaveBeenCalled();
  });

  it('refuses a second operation started while the first runs', async () => {
    const { execute, sponsor, deviceSigner, submitted, accountId } =
      await setup();

    const [first, second] = await Promise.all([execute(), execute()]);

    expect(first.isOk()).toBe(true);
    expect(second.isErr() && second.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );
    expect(sponsor.collateral).toHaveBeenCalledTimes(1);
    expect(sponsor.signCollateral).toHaveBeenCalledTimes(1);
    expect(deviceSigner.signTransaction).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveLength(1);
  });

  it('lets the next operation run once a failed one returned', async () => {
    const { execute, failBuildWith, builds, control } = await setup();
    const answerBuild = control.answerBuild;
    failBuildWith({ code: 'unavailable', message: 'provider down' });
    expect((await execute()).isErr()).toBe(true);
    control.answerBuild = answerBuild;

    const executed = await execute();

    expect(executed.isOk()).toBe(true);
    expect(builds).toHaveLength(2);
  });

  it('runs the next operation once the wait sees the first settle', async () => {
    const {
      execute,
      wallet,
      accountId,
      sponsor,
      builds,
      deviceSigner,
      history$,
      activities$,
      settledUtxos$,
    } = await setup();
    const first = (await execute()).unwrap();
    const settled = vi.fn();
    const waiting = waitForCardanoCustodyOperation(wallet, {
      accountId,
      ...first,
    });
    void waiting.then(settled);
    const next = async () =>
      executeCardanoCustodyOperation(wallet, {
        accountId,
        operation: issueGrant,
        deviceSigner,
        sponsor,
        requestedScopes: [{ slot: 0n, ...issueGrant.scope }],
      });

    // The store learns of the settlement in this order: the history, the
    // confirmed activity in place of the pending one, then the UTxOs.
    history$.next({
      [accountId]: [
        {
          txId: first.txId,
          txIndex: Cardano.TxIndex(0),
          blockNumber: Cardano.BlockNo(2),
          blockTime: Timestamp(NOW),
        },
      ],
    });
    const whileHistoryOnly = await next();
    expect(whileHistoryOnly.isErr() && whileHistoryOnly.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );
    activities$.next({
      [accountId]: activities$.value[accountId].map(activity => ({
        ...activity,
        type: ActivityType.Send,
      })),
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    // The UTxOs still hold the control UTxO the first operation spent.
    expect(settled).not.toHaveBeenCalled();
    const outputs = transactionOf(issueGrantShape())
      .body()
      .toCore()
      .outputs.map(
        (output, index): Cardano.Utxo => [
          { txId: first.txId, index, address: output.address },
          output,
        ],
      );
    settledUtxos$.next({ [accountId]: outputs });

    expect((await waiting).isOk()).toBe(true);
    const second = await next();

    expect(second.isOk()).toBe(true);
    expect(builds).toHaveLength(2);
  });
});
