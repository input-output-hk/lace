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
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { DEFAULT_MNEMONIC_LENGTH, createAssetsRoute, fillMnemonic, setupStep, getNextButton } from '../tests/utils';
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
  const nextButton = getNextButton();
  fireEvent.click(nextButton);
  await screen.findByText("Let's set up your new wallet");
};

describe('Multi Wallet Setup/Restore Wallet', () => {
  let providers = {} as {
    createWallet: jest.Mock;
    shouldShowConfirmationDialog$: Subject<boolean>;
  };

  beforeEach(() => {
    providers = {
      createWallet: jest.fn(),
      shouldShowConfirmationDialog$: new Subject()
    };
  });

  test('setting up a new hot wallet', async () => {
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <MemoryRouter initialEntries={[walletRoutePaths.newWallet.restore.root]}>
              <RestoreWallet providers={providers as Providers} />
              {createAssetsRoute()}
            </MemoryRouter>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    await recoveryPhraseStep();
    await setupStep();
  });
});
