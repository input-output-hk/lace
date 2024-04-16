/* eslint-disable import/imports-first */
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
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
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import {
  DEFAULT_MNEMONIC_LENGTH,
  createAssetsRoute,
  fillMnemonic,
  getNextButton,
  mnemonicWords,
  setupStep
} from '../tests/utils';
import { StoreProvider } from '@src/stores';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { AppSettingsProvider, DatabaseProvider } from '@providers';
import { UseWalletManager } from '@hooks/useWalletManager';
import { AnalyticsTracker } from '@providers/AnalyticsProvider/analyticsTracker';
import { CreateWallet } from './CreateWallet';

jest.mock('@providers/AnalyticsProvider', () => ({
  useAnalyticsContext: jest.fn<Pick<AnalyticsTracker, 'sendMergeEvent' | 'sendEventToPostHog'>, []>().mockReturnValue({
    sendMergeEvent: jest.fn().mockReturnValue(''),
    sendEventToPostHog: jest.fn().mockReturnValue('')
  })
}));

const recoveryPhraseStep = async () => {
  const nextButton = getNextButton();

  fireEvent.click(nextButton);

  await fillMnemonic(0, DEFAULT_MNEMONIC_LENGTH);

  await screen.findByText('Total wallet balance');
};

describe('Multi Wallet Setup/Create Wallet', () => {
  let providers = {} as {
    createWallet: jest.Mock;
    generateMnemonicWords: jest.Mock;
    confirmationDialog: {
      shouldShowDialog$: BehaviorSubject<boolean>;
    };
  };

  beforeEach(() => {
    providers = {
      createWallet: jest.fn(),
      generateMnemonicWords: jest.fn(),
      confirmationDialog: {
        shouldShowDialog$: new BehaviorSubject(false)
      }
    };
  });

  test('setting up a new hot wallet', async () => {
    providers.generateMnemonicWords.mockReturnValue(mnemonicWords);
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <MemoryRouter initialEntries={[walletRoutePaths.newWallet.create.setup]}>
              <CreateWallet providers={providers as Providers} />
              {createAssetsRoute()}
            </MemoryRouter>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    await setupStep();
    await recoveryPhraseStep();
  });

  test('should emit correct value for shouldShowDialog', async () => {
    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <MemoryRouter initialEntries={[walletRoutePaths.newWallet.create.setup]}>
              <CreateWallet providers={providers as Providers} />
              {createAssetsRoute()}
            </MemoryRouter>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    const nameInput = screen.getByTestId('wallet-name-input');

    fireEvent.change(nameInput, { target: { value: 'My X Wallet' } });

    expect(await firstValueFrom(providers.confirmationDialog.shouldShowDialog$)).toBe(true);

    fireEvent.change(nameInput, { target: { value: '' } });

    expect(await firstValueFrom(providers.confirmationDialog.shouldShowDialog$)).toBe(false);
  });
});
