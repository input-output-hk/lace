/* eslint-disable import/imports-first */
import { of } from 'rxjs';
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
import { DEFAULT_MNEMONIC_LENGTH, createAssetsRoute, fillMnemonic, setupStep, getNextButton } from '../tests/utils';
import { StoreProvider } from '@src/stores';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { AppSettingsProvider, DatabaseProvider } from '@providers';
import { UseWalletManager } from '@hooks/useWalletManager';
import { AnalyticsTracker, postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { MemoryRouter } from 'react-router-dom';
import { walletRoutePaths } from '@routes';
import { WalletOnboardingFlows } from '@views/browser/features/multi-wallet/WalletOnboardingFlows';

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
  test('setting up a new hot wallet', async () => {
    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <MemoryRouter initialEntries={[walletRoutePaths.newWallet.restore]}>
              <WalletOnboardingFlows
                urlPath={walletRoutePaths.newWallet}
                postHogActions={postHogMultiWalletActions}
                renderHome={() => <></>}
              />
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
