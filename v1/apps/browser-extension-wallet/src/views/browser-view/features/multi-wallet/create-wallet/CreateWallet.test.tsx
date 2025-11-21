/* eslint-disable import/imports-first */
import { of } from 'rxjs';
jest.doMock('@hooks/useWalletManager', () => ({
  useWalletManager: jest.fn().mockReturnValue({
    createWallet: jest.fn().mockResolvedValue({
      source: {
        account: {
          extendedAccountPublicKey: ''
        }
      }
    }) as UseWalletManager['createWallet'],
    walletRepository: {
      wallets$: of([])
    } as UseWalletManager['walletRepository']
  } as UseWalletManager)
}));

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  DEFAULT_MNEMONIC_LENGTH,
  createAssetsRoute,
  fillMnemonic,
  getNextButton,
  setupStep,
  getBackButton,
  mnemonicWords
} from '../tests/utils';
import { StoreProvider } from '@src/stores';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { AppSettingsProvider, DatabaseProvider } from '@providers';
import { UseWalletManager } from '@hooks/useWalletManager';
import { AnalyticsTracker, postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { MemoryRouter, Router } from 'react-router-dom';
import { WalletOnboardingFlows } from '../WalletOnboardingFlows';
import { walletRoutePaths } from '@routes';
import { createMemoryHistory } from 'history';
import { postHogClientMocks } from '@src/utils/mocks/test-helpers';

jest.mock('@providers/AnalyticsProvider', () => ({
  useAnalyticsContext: jest
    .fn<Pick<AnalyticsTracker, 'sendMergeEvent' | 'sendEventToPostHog' | 'sendAliasEvent'>, []>()
    .mockReturnValue({
      sendMergeEvent: jest.fn().mockReturnValue(''),
      sendEventToPostHog: jest.fn().mockReturnValue(''),
      sendAliasEvent: jest.fn().mockReturnValue('')
    })
}));

jest.mock('@providers/PostHogClientProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers/PostHogClientProvider'),
  usePostHogClientContext: () => postHogClientMocks
}));

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual('@lace/cardano');
  return {
    ...actual,
    Wallet: {
      ...actual.Wallet,
      KeyManagement: {
        ...actual.Wallet.KeyManagement,
        util: {
          ...actual.Wallet.KeyManagement.util,
          generateMnemonicWords: () => mnemonicWords
        }
      }
    }
  };
});

const recoveryPhraseStep = async () => {
  await screen.findByTestId('wallet-setup-step-btn-next');
  fireEvent.click(getNextButton());
  fireEvent.click(getNextButton());
  await fillMnemonic(0, DEFAULT_MNEMONIC_LENGTH);
  await screen.findByText("Let's set up your new wallet");
};

describe('Multi Wallet Setup/Create Wallet', () => {
  test('setting up a new hot wallet', async () => {
    const history = createMemoryHistory();
    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <Router history={history}>
              <WalletOnboardingFlows
                urlPath={walletRoutePaths.newWallet}
                postHogActions={postHogMultiWalletActions}
                renderHome={() => <></>}
              />
              {createAssetsRoute()}
            </Router>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    history.push(walletRoutePaths.newWallet.create);
    await screen.findByTestId('wallet-setup-step-btn-next');
    await recoveryPhraseStep();
    await setupStep();
  });

  test('should properly mark for dirty', async () => {
    let formDirty = false;
    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <MemoryRouter initialEntries={[walletRoutePaths.newWallet.create]}>
              <WalletOnboardingFlows
                urlPath={walletRoutePaths.newWallet}
                postHogActions={postHogMultiWalletActions}
                renderHome={() => <></>}
                setFormDirty={(dirty) => {
                  formDirty = dirty;
                }}
              />
            </MemoryRouter>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    // Initial state - on SelectBlockchain step
    await screen.findByTestId('wallet-setup-step-btn-next');
    expect(formDirty).toBe(false);

    // Navigate to RecoveryPhraseWriteDown step
    const nextButton = getNextButton();
    fireEvent.click(nextButton);
    await screen.findByTestId('wallet-setup-step-btn-next');
    expect(formDirty).toBe(false);

    // Navigate to RecoveryPhraseInput step - this marks form as dirty
    const nextButton2 = getNextButton();
    fireEvent.click(nextButton2);
    await waitFor(() => expect(formDirty).toBe(true));

    // Go back to RecoveryPhraseWriteDown - form should still be dirty
    const backButton = getBackButton();
    fireEvent.click(backButton);
    await screen.findByTestId('wallet-setup-step-btn-next');
    expect(formDirty).toBe(true);
  });
});
