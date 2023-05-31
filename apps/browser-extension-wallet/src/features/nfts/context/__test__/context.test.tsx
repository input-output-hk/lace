/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
import React, { FunctionComponent } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useNftsFoldersContext } from '../context';
import { NftsFoldersProvider } from '../NftsFoldersProvider';
import { WalletDatabase, NftFoldersSchema, nftFoldersSchema } from '@src/lib/storage';
import { DatabaseProvider } from '@src/providers/DatabaseProvider';
import { StoreProvider } from '@src/stores';
import create from 'zustand';
import { AppSettingsProvider } from '@providers';

jest.mock('../NftsFoldersProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../NftsFoldersProvider'),
  withNftsFoldersContext: jest.fn()
}));

const makeDbContextWrapper =
  (dbIntance: WalletDatabase): FunctionComponent =>
  ({ children }: { children?: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <StoreProvider appMode="browser" store={create(() => ({ environmentName: 'Preprod' } as any))}>
          <DatabaseProvider dbCustomInstance={dbIntance}>
            <NftsFoldersProvider>{children}</NftsFoldersProvider>
          </DatabaseProvider>
        </StoreProvider>
      </AppSettingsProvider>
    );

describe('testing useNftsFoldersState', () => {
  let db: WalletDatabase;
  const mockFolderList: NftFoldersSchema[] = Array.from({ length: 15 }, (_v, i) => ({
    id: i + 1,
    assets: [`asset${i + 1}`],
    name: `test folder ${i + 1}`,
    network: 'Preprod'
  }));

  beforeEach(async () => {
    db = new WalletDatabase();
    db.getConnection(nftFoldersSchema).bulkAdd(mockFolderList);
  });

  afterEach(() => db.delete());

  test('should return state and utils', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNftsFoldersContext(), {
      wrapper: makeDbContextWrapper(db)
    });
    expect(result.current.utils.deleteRecord).toBeDefined();
    expect(result.current.utils.saveRecord).toBeDefined();
    expect(result.current.utils.extendLimit).toBeDefined();

    await waitForNextUpdate();

    expect(result.current.list.length).toBe(10);
    expect(result.current.count).toBe(15);
  });

  test('should add new folder and extend limit', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNftsFoldersContext(), {
      wrapper: makeDbContextWrapper(db)
    });

    await waitForNextUpdate();

    result.current.utils.saveRecord({ assets: ['folder_test16'], name: 'test folder 16' });

    await waitForNextUpdate();

    result.current.utils.extendLimit();

    await waitForNextUpdate();

    expect(result.current.list).toContainEqual({
      assets: ['folder_test16'],
      id: 16,
      name: 'test folder 16',
      network: 'Preprod'
    });
    expect(result.current.list.length).toBe(16);
    expect(result.current.count).toBe(16);
  });

  test('should delete folder', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNftsFoldersContext(), {
      wrapper: makeDbContextWrapper(db)
    });

    await waitForNextUpdate();

    result.current.utils.deleteRecord(1);

    await waitForNextUpdate();

    result.current.utils.extendLimit();

    await waitForNextUpdate();

    expect(result.current.list).not.toContainEqual({
      assets: ['asset_test1'],
      name: 'test folder',
      id: 1
    });
    expect(result.current.list.length).toBe(14);
    expect(result.current.count).toBe(14);
  });
});
