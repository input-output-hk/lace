import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateWallet } from './CreateWallet';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { createAssetsRoute, fillMnemonic, getNextButton, mnemonicWords, setupStep } from '../tests/utils';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { StoreProvider } from '@src/stores';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { AppSettingsProvider, DatabaseProvider } from '@providers';
import { UseWalletManager } from '@hooks/useWalletManager';
import { AnalyticsTracker } from '@providers/AnalyticsProvider/analyticsTracker';

jest.mock('@providers/AnalyticsProvider', () => ({
  useAnalyticsContext: jest.fn<Pick<AnalyticsTracker, 'sendMergeEvent'>, []>().mockReturnValue({
    sendMergeEvent: jest.fn().mockReturnValue('')
  })
}));

jest.mock('@hooks/useWalletManager', () => ({
  useWalletManager: jest.fn().mockReturnValue({
    createWallet: jest.fn().mockResolvedValue({
      source: {
        account: {
          extendedAccountPublicKey: ''
        }
      }
    }) as UseWalletManager['createWallet']
  } as UseWalletManager)
}));

const keepWalletSecureStep = async () => {
  const nextButton = getNextButton();

  fireEvent.click(nextButton);

  await screen.findByText('Write down your secret passphrase');
};

const recoveryPhraseStep = async () => {
  const nextButton = getNextButton();

  // 08/24
  fireEvent.click(nextButton);
  // 16/24
  fireEvent.click(nextButton);
  // 24/24
  fireEvent.click(nextButton);

  const step1 = 8;
  const step2 = 16;
  const step3 = 24;

  await fillMnemonic(0, step1);
  await fillMnemonic(step1, step2);
  await fillMnemonic(step2, step3);

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
    await keepWalletSecureStep();
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
