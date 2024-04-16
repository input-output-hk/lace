/* eslint-disable import/imports-first */
import { Subject, of } from 'rxjs';
jest.doMock('@hooks/useWalletManager', () => ({
  useWalletManager: jest.fn().mockReturnValue({
    createWallet: jest.fn().mockResolvedValue({
      source: {
        account: {
          extendedAccountPublicKey: ''
        }
      },
      wallet: { addresses$: of([{}]) }
    }) as UseWalletManager['createWallet'],
    walletRepository: {
      wallets$: of([{}])
    } as UseWalletManager['walletRepository']
  } as UseWalletManager)
}));

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { DEFAULT_MNEMONIC_LENGTH, createAssetsRoute, fillMnemonic, setupStep } from '../tests/utils';
import { StoreProvider } from '@src/stores';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { AppSettingsProvider, DatabaseProvider } from '@providers';
import { UseWalletManager } from '@hooks/useWalletManager';
import { AnalyticsTracker } from '@providers/AnalyticsProvider/analyticsTracker';
import { RestoreWallet } from './RestoreWallet';

jest.mock('@providers/AnalyticsProvider', () => ({
  useAnalyticsContext: jest.fn<Pick<AnalyticsTracker, 'sendMergeEvent' | 'sendEventToPostHog'>, []>().mockReturnValue({
    sendMergeEvent: jest.fn().mockReturnValue(''),
    sendEventToPostHog: jest.fn().mockReturnValue('')
  })
}));

const recoveryPhraseStep = async () => {
  await fillMnemonic(0, DEFAULT_MNEMONIC_LENGTH);
  await screen.findByText('Total wallet balance');
};

describe('Multi Wallet Setup/Restore Wallet', () => {
  let providers = {} as {
    createWallet: jest.Mock;
    confirmationDialog: {
      shouldShowDialog$: Subject<boolean>;
    };
  };

  const originalWarn = console.error.bind(console.error);
  beforeAll(() => {
    console.error = (msg) => !msg.toString().includes('Warning: [antd:') && originalWarn(msg);
  });
  afterAll(() => {
    console.error = originalWarn;
  });

  beforeEach(() => {
    providers = {
      createWallet: jest.fn(),
      confirmationDialog: {
        shouldShowDialog$: new Subject()
      }
    };
  });

  test('setting up a new hot wallet', async () => {
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <MemoryRouter initialEntries={[walletRoutePaths.newWallet.restore.setup]}>
              <RestoreWallet providers={providers as Providers} />
              {createAssetsRoute()}
            </MemoryRouter>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    await setupStep('restore');
    await recoveryPhraseStep();
  });
});
