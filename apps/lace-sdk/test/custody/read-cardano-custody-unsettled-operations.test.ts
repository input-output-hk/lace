import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import {
  combineContracts,
  inferModuleContext,
  inferStoreContext,
  ModuleName,
} from '@lace-contract/module';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { storageDependencyContract } from '@lace-contract/storage';
import { HexBytes, Milliseconds, Timestamp } from '@lace-lib/util';
import {
  InMemoryCollectionStore,
  InMemoryDocumentStore,
} from '@lace-module/storage-in-memory';
import { EMPTY, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { createLaceWallet } from '../../src/create-lace-wallet';
import { openCardanoCustodyAccount } from '../../src/custody/cardano-custody-account-entity';
import { blockchainCardanoCustody } from '../../src/custody/modules';
import { readCardanoCustodyUnsettledOperations } from '../../src/custody/read-cardano-custody-unsettled-operations';
import { submitCardanoCustodyTransaction } from '../../src/custody/submit-cardano-custody-transaction';
import { waitForCardanoCustodyOperation } from '../../src/custody/wait-for-cardano-custody-operation';
import * as m from '../../src/modules-cardano';
import { createPasskeyVaultModule } from '../../src/passkey-vault-module';

import {
  buildResultOf,
  createCustodyTestWallet,
  fundUtxo,
  grantedControl,
  issueGrantShape,
  liveControl,
  record,
} from './custody-fixtures';
import { NOW } from './custody-sponsor-fake';

import type { Activity } from '@lace-contract/activities';
import type {
  CreateKeyValueStorageProps,
  KeyValueStorage,
  KeyValueStorageDependencies,
  LaceInit,
  LaceModuleStoreInit,
} from '@lace-contract/module';
import type {
  CreateCollectionStorageProps,
  StorageDependencies,
} from '@lace-contract/storage';
import type { AccountId } from '@lace-contract/wallet-repo';
import type * as CardanoProviderCore from '@lace-lib/cardano-provider-core';
import type { PasskeyKeySource } from '@lace-lib/passkey';

vi.mock('@lace-lib/cardano-provider-core', async importActual => ({
  ...(await importActual<typeof CardanoProviderCore>()),
  getBlockfrostClient: () => ({
    request: async () => {
      throw new Error('offline');
    },
  }),
}));

const setup = async () => {
  const test = createCustodyTestWallet();
  const { accountId } = await openCardanoCustodyAccount(test.wallet, {
    record,
    name: 'Treasury',
  });
  test.settledUtxos$.next({ [accountId]: [liveControl, fundUtxo] });
  const { transaction, resolvedInputs, invalidHereafter } = buildResultOf(
    issueGrantShape(),
  );
  const submit = async (reference?: string) =>
    submitCardanoCustodyTransaction(test.wallet, {
      signedTransaction: HexBytes(transaction),
      accountId,
      address: record.address,
      resolvedInputs,
      invalidHereafter,
      operation: 'issue-grant',
      ...(reference !== undefined && { reference }),
    });
  const read = async (id: AccountId = accountId) =>
    readCardanoCustodyUnsettledOperations(test.wallet, id);
  return { ...test, accountId, invalidHereafter, submit, read };
};

/** A storage module whose key-value stores outlive the wallet, as a device's storage outlives the app. */
const persistentStorageModule = () => {
  const stores = new Map<string, Map<string, unknown>>();
  const createKeyValueStorage = <K extends string, V>({
    collectionId,
  }: Readonly<CreateKeyValueStorageProps>): KeyValueStorage<K, V> => {
    const values = stores.get(collectionId) ?? new Map<string, unknown>();
    stores.set(collectionId, values);
    return {
      getValues: keys => {
        const found = keys.map(key => values.get(key) as V | undefined);
        return found.every(value => value !== undefined)
          ? of(found as V[])
          : EMPTY;
      },
      setValue: (key, value) => {
        if (value === undefined) values.delete(key);
        else values.set(key, value);
        return of(void 0);
      },
    };
  };
  const sideEffectDependencies: KeyValueStorageDependencies &
    StorageDependencies = {
    createKeyValueStorage,
    createDocumentStorage: () => new InMemoryDocumentStore(),
    createCollectionStorage: <T extends object>({
      computeDocId,
    }: Readonly<CreateCollectionStorageProps<T>>) =>
      new InMemoryCollectionStore<T>(computeDocId),
  };
  const store: LaceInit<LaceModuleStoreInit> = () => ({
    sideEffectDependencies,
  });
  const module = inferModuleContext({
    moduleName: ModuleName('storage-persistent'),
    implements: combineContracts([storageDependencyContract] as const),
    store: inferStoreContext({
      load: async () => ({ default: store }),
      context: { actions: {}, selectors: {} },
    }),
    addons: {},
  });
  return { module, persisted: () => stores.get('redux') };
};

const startWallet = async (
  storage: ReturnType<typeof persistentStorageModule>,
) =>
  createLaceWallet({
    modules: [
      m.featureDev,
      storage.module,
      m.blockchainCardano,
      blockchainCardanoCustody,
      m.cardanoProviderBlockfrost,
      m.cryptoCardanoSdk,
      createPasskeyVaultModule({ keySource: {} as PasskeyKeySource }),
    ] as const,
    environment: 'development',
    featureFlags: [
      { key: FEATURE_FLAG_CARDANO },
      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
    ],
    config: {
      defaultFeatureFlags: [
        { key: FEATURE_FLAG_CARDANO },
        { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
      ],
      extraFeatureFlags: [],
      defaultTestnetChainId: Cardano.ChainIds.Preprod,
      cardanoProvider: {
        tipPollFrequency: Milliseconds(30_000),
        blockfrostConfigs: {
          1: {
            clientConfig: {
              baseUrl: 'https://cardano-preprod.blockfrost.io',
              apiVersion: 'v0',
              projectId: 'restart-test',
            },
            rateLimiterConfig: {
              size: 500,
              increaseAmount: 10,
              increaseInterval: Milliseconds(1000),
            },
          },
        },
      },
      cexplorerUrls: { 1: 'https://preprod.cexplorer.io' },
    },
  });

describe('readCardanoCustodyUnsettledOperations', () => {
  it('lists a submitted operation with what a wait needs, its status and its reference', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    try {
      const { submit, read, accountId, invalidHereafter } = await setup();
      const submitted = (await submit('intent-42')).unwrap();

      expect(await read()).toEqual([
        {
          accountId,
          txId: submitted.txId,
          operation: 'issue-grant',
          invalidHereafter,
          submittedAt: Timestamp(NOW),
          status: 'pending',
          reference: 'intent-42',
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('omits the reference when the operation was given none', async () => {
    const { submit, read } = await setup();
    await submit();

    const [listed] = await read();
    expect(listed).toMatchObject({ status: 'pending' });
    expect(listed).not.toHaveProperty('reference');
  });

  it('reports a submission that did not answer as outcome-unknown', async () => {
    vi.useFakeTimers();
    try {
      const { submit, read, control } = await setup();
      control.answerSubmit = () => 'silent';
      const submitting = submit('intent-42');
      await vi.runAllTimersAsync();
      expect((await submitting).isErr()).toBe(true);

      expect(await read()).toEqual([
        expect.objectContaining({
          status: 'outcome-unknown',
          reference: 'intent-42',
        }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves out pending transactions that are not custody operations', async () => {
    const { read, activities$, accountId } = await setup();
    const keyWalletPending: Activity = {
      accountId,
      activityId: 'ab'.repeat(32),
      timestamp: Timestamp(0),
      tokenBalanceChanges: [],
      type: ActivityType.Pending,
    };
    activities$.next({ [accountId]: [keyWalletPending] });

    expect(await read()).toEqual([]);
  });

  it('lists nothing for an account the wallet does not hold', async () => {
    const { submit, read } = await setup();
    await submit();

    expect(await read('missing' as AccountId)).toEqual([]);
  });

  it('drops an operation once its activity is no longer pending', async () => {
    const { submit, read, activities$, accountId } = await setup();
    await submit();
    activities$.next({
      [accountId]: activities$.value[accountId].map(activity => ({
        ...activity,
        type: ActivityType.Send,
      })),
    });

    expect(await read()).toEqual([]);
  });

  it('drops an operation once the wallet removed its activity as expired', async () => {
    const { submit, read, activities$, accountId } = await setup();
    await submit();
    activities$.next({ [accountId]: [] });

    expect(await read()).toEqual([]);
  });

  it('resumes a wait from a listed entry', async () => {
    const { submit, read, wallet, settledUtxos$, accountId } = await setup();
    await submit('intent-42');
    const [listed] = await read();

    const waiting = waitForCardanoCustodyOperation(wallet, {
      ...listed,
      timeout: Milliseconds(5000),
    });
    settledUtxos$.next({
      [accountId]: [
        [{ ...grantedControl[0], txId: listed.txId }, grantedControl[1]],
        fundUtxo,
      ],
    });

    expect((await waiting).unwrap()).toEqual({ txId: listed.txId });
  });

  describe('a submission recorded before the operation and the status were kept', () => {
    const recordedWithBoundOnly = async () => {
      const test = await setup();
      await test.submit('intent-42');
      const { activities$, accountId } = test;
      activities$.next({
        [accountId]: activities$.value[accountId].map(activity => ({
          ...activity,
          blockchainSpecific: {
            Cardano: {
              ...(activity.blockchainSpecific as { Cardano: object }).Cardano,
              custody: { invalidHereafter: test.invalidHereafter },
            },
          },
        })),
      });
      return test;
    };

    it('is listed as an unknown pending operation without a reference', async () => {
      const { read, accountId, invalidHereafter } =
        await recordedWithBoundOnly();

      const [listed] = await read();
      expect(listed).toMatchObject({
        accountId,
        operation: 'unknown',
        invalidHereafter,
        status: 'pending',
      });
      expect(listed).not.toHaveProperty('reference');
    });

    it('still resumes a wait from the listed entry', async () => {
      const { read, wallet, settledUtxos$, accountId } =
        await recordedWithBoundOnly();
      const [listed] = await read();

      const waiting = waitForCardanoCustodyOperation(wallet, {
        ...listed,
        timeout: Milliseconds(5000),
      });
      settledUtxos$.next({
        [accountId]: [
          [{ ...grantedControl[0], txId: listed.txId }, grantedControl[1]],
          fundUtxo,
        ],
      });

      expect((await waiting).unwrap()).toEqual({ txId: listed.txId });
    });
  });

  it('lists an operation again after a restart from the persisted state', async () => {
    const { submit, activities$, accountId, invalidHereafter } = await setup();
    const submitted = (await submit('intent-42')).unwrap();
    const [recorded] = activities$.value[accountId];

    const storage = persistentStorageModule();
    const before = await startWallet(storage);
    await openCardanoCustodyAccount(before, { record, name: 'Treasury' });
    before.dispatch('activities.upsertActivities', {
      accountId,
      activities: [recorded],
    });
    await vi.waitFor(() => {
      expect(storage.persisted()?.get('persist:activities')).toContain(
        submitted.txId,
      );
    });

    const after = await startWallet(storage);

    expect(
      await readCardanoCustodyUnsettledOperations(after, accountId),
    ).toEqual([
      {
        accountId,
        txId: submitted.txId,
        operation: 'issue-grant',
        invalidHereafter,
        submittedAt: recorded.timestamp,
        status: 'pending',
        reference: 'intent-42',
      },
    ]);
  });
});
