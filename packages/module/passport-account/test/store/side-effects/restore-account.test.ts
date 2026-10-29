import { GrantId, GrantSlot, passportActions } from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { accManifest } from '../../../src/acc/manifest';
import { sealRecord } from '../../../src/store/envelope';
import { restorePassportAccount } from '../../../src/store/side-effects/restore-account';

import type {
  ActionCreators,
  GrantRecord,
  Selectors,
} from '@lace-contract/passport';
import type { Action } from '@reduxjs/toolkit';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  readGrants: vi.fn(),
}));

vi.mock('../../../src/infra/indexer', () => ({
  createIndexerClient: mocks.createIndexerClient,
}));
vi.mock('../../../src/acc/acc-module', () => ({
  ledger: mocks.ledger,
}));
vi.mock('../../../src/acc/read-grants', () => ({
  readGrants: mocks.readGrants,
}));

const actions = { ...passportActions };

const accountAddress = 'ac'.repeat(32);
const grantId = GrantId('ab'.repeat(32));
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const contractState = { data: 'charged-state' };
const decodedLedgerState = { tag: 'decoded-ledger-state' };
const expectedRecord = {
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  localUseCounter: '0',
};
const record = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '4',
};
const grantRecord: GrantRecord = {
  id: grantId,
  slot: GrantSlot(3),
  active: true,
  epoch: 0,
  generation: 0,
  issuedAt: 1,
  scope: {
    operations: ['withdraw-unshielded'],
    read: false,
    objectCommit: '00'.repeat(32),
    perCallCap: '300',
    cap: '450',
    expiresAt: null,
    rpCommit: '00'.repeat(32),
    readPkHash: '00'.repeat(32),
    window: null,
    callerCommit: '00'.repeat(32),
  },
  spentWindow: { start: 0, spent: '0' },
};
const restoredAccount = [
  actions.passport.setAccount({
    address: record.address,
    bindingVersion: record.bindingVersion,
    status: 'ready',
    networkId: 'undeployed',
  }),
  actions.passport.setLocalUseCounter('4'),
];

const queryContractState = vi.fn(async () => contractState);

/**
 * Runs the restore over a real subscription, since the roster read is a
 * promise the virtual scheduler cannot settle, and collects what it
 * publishes until it completes.
 */
const restore = async (stored: unknown[]) => {
  const published: Action[] = [];
  const storage = {
    getValues: vi.fn(() => of(stored)),
    setValue: vi.fn(),
  };
  await new Promise<void>((resolve, reject) => {
    restorePassportAccount(
      {} as never,
      {} as never,
      {
        actions,
        createKeyValueStorage: vi.fn(() => storage),
        passportNetwork: network,
      } as never,
    ).subscribe({
      next: action => {
        published.push(action);
      },
      error: reject,
      complete: resolve,
    });
  });
  return published;
};

describe('restorePassportAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryContractState.mockResolvedValue(contractState);
    mocks.createIndexerClient.mockReturnValue({ queryContractState });
    mocks.ledger.mockReturnValue(decodedLedgerState);
    mocks.readGrants.mockReturnValue([]);
  });

  it('restores the persisted account and use counter on startup, in the frame of the read', () => {
    testSideEffect<Selectors, ActionCreators>(
      restorePassportAccount,
      ({ expectObservable, cold }) => {
        const storage = {
          getValues: vi.fn(() => cold('(a|)', { a: [record] })),
          setValue: vi.fn(),
        };
        return {
          dependencies: {
            actions,
            createKeyValueStorage: vi.fn(() => storage),
            passportNetwork: network,
          } as never,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: restoredAccount[0],
              b: restoredAccount[1],
            });
          },
        };
      },
    );
  });

  it('then publishes the grant roster read from chain with the slots the record kept', async () => {
    mocks.readGrants.mockReturnValue([grantRecord]);
    const storedGrant = {
      slot: 3,
      scopeSalt: '07'.repeat(32),
      granteePublicKey: 'cd'.repeat(32),
      origin: 'lace.io',
    };

    await expect(
      restore([{ ...record, grants: { [grantId]: storedGrant } }]),
    ).resolves.toEqual([
      ...restoredAccount,
      actions.passport.setGrants([grantRecord]),
    ]);

    expect(mocks.createIndexerClient).toHaveBeenCalledExactlyOnceWith({
      indexerUrl: network.indexerUrl,
      indexerWsUrl: network.indexerWsUrl,
    });
    expect(queryContractState).toHaveBeenCalledExactlyOnceWith(accountAddress);
    expect(mocks.ledger).toHaveBeenCalledExactlyOnceWith(contractState.data);
    expect(mocks.readGrants).toHaveBeenCalledExactlyOnceWith(
      decodedLedgerState,
      new Map([[grantId, GrantSlot(3)]]),
    );
  });

  it('publishes an empty roster for an account that issued no grant', async () => {
    await expect(restore([record])).resolves.toEqual([
      ...restoredAccount,
      actions.passport.setGrants([]),
    ]);
    expect(mocks.readGrants).toHaveBeenCalledExactlyOnceWith(
      decodedLedgerState,
      new Map(),
    );
  });

  it('leaves the roster alone when the indexer serves no contract at the address', async () => {
    queryContractState.mockResolvedValue(null as never);

    await expect(restore([record])).resolves.toEqual(restoredAccount);
    expect(mocks.readGrants).not.toHaveBeenCalled();
  });

  it('leaves the roster alone when the indexer read fails, keeping the account restored', async () => {
    queryContractState.mockRejectedValue(new Error('indexer down'));

    await expect(restore([record])).resolves.toEqual(restoredAccount);
  });

  it('emits nothing for a sealed record, which needs a ceremony to open', async () => {
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32).fill(7),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
    const sealed = await sealRecord(key, expectedRecord);

    await expect(restore([sealed])).resolves.toEqual([]);
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });

  it('emits nothing for a record whose deployment is still pending', async () => {
    const pendingRecord = {
      ...expectedRecord,
      deployment: {
        operations: ['deposit_unshielded'],
        lockAccount: true,
        saltHex: '07'.repeat(32),
        authorityKey: { tag: 'schnorr', value: 'authority-key' },
        handoverAuthority: { tag: 'schnorr', value: 'cd'.repeat(32) },
      },
    };

    await expect(restore([pendingRecord])).resolves.toEqual([]);
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });

  it('emits nothing when no account record is persisted', async () => {
    await expect(restore([])).resolves.toEqual([]);
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });
});
