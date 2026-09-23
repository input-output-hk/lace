import { passportActions } from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { beforeEach, describe, it, vi } from 'vitest';

import { accManifest } from '../../../src/acc/manifest';
import { sealRecord } from '../../../src/store/envelope';
import { restorePassportAccount } from '../../../src/store/side-effects/restore-account';

import type { ActionCreators, Selectors } from '@lace-contract/passport';

const actions = { ...passportActions };

const accountAddress = 'ac'.repeat(32);
const expectedRecord = {
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  localUseCounter: '0',
};

describe('restorePassportAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores the persisted account and use counter on startup', () => {
    const record = {
      address: accountAddress,
      bindingVersion: '0.1.0-lace.1',
      localUseCounter: '4',
    };
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
          } as never,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab|)', {
              a: actions.passport.setAccount({
                address: record.address,
                bindingVersion: record.bindingVersion,
                status: 'ready',
              }),
              b: actions.passport.setLocalUseCounter('4'),
            });
          },
        };
      },
    );
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
    testSideEffect<Selectors, ActionCreators>(
      restorePassportAccount,
      ({ expectObservable, cold }) => {
        const storage = {
          getValues: vi.fn(() => cold('(a|)', { a: [sealed] })),
          setValue: vi.fn(),
        };
        return {
          dependencies: {
            actions,
            createKeyValueStorage: vi.fn(() => storage),
          } as never,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');
          },
        };
      },
    );
  });

  it('emits nothing when no account record is persisted', () => {
    testSideEffect<Selectors, ActionCreators>(
      restorePassportAccount,
      ({ expectObservable, cold }) => {
        const storage = {
          getValues: vi.fn(() => cold('|')),
          setValue: vi.fn(),
        };
        return {
          dependencies: {
            actions,
            createKeyValueStorage: vi.fn(() => storage),
          } as never,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');
          },
        };
      },
    );
  });
});
