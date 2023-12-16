import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateWallet } from './CreateWallet';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { createAssetsRoute, fillMnemonic, getNextButton, mnemonicWords, setupStep } from '../tests/utils';
import { Subject } from 'rxjs';

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
      shouldShowDialog$: Subject<boolean>;
      withConfirmationDialog: jest.Mock;
    };
  };

  beforeEach(() => {
    providers = {
      createWallet: jest.fn(),
      generateMnemonicWords: jest.fn(),
      confirmationDialog: {
        shouldShowDialog$: new Subject(),
        withConfirmationDialog: jest.fn().mockReturnValue((): void => void 0)
      }
    };
  });

  test('setting up a new hot wallet', async () => {
    providers.generateMnemonicWords.mockReturnValue(mnemonicWords);
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <MemoryRouter initialEntries={[walletRoutePaths.newWallet.create.setup]}>
        <CreateWallet providers={providers as Providers} />
        {createAssetsRoute()}
      </MemoryRouter>
    );

    await setupStep();
    await keepWalletSecureStep();
    await recoveryPhraseStep();
  });

  test.only('should emit correct value for shouldShowDialog', (done) => {
    render(
      <MemoryRouter initialEntries={[walletRoutePaths.newWallet.create.setup]}>
        <CreateWallet providers={providers as Providers} />
        {createAssetsRoute()}
      </MemoryRouter>
    );

    const nameInput = screen.getByTestId('wallet-name-input');

    const firstSub = providers.confirmationDialog.shouldShowDialog$.subscribe((value) => {
      expect(value).toBe(true);
      firstSub.unsubscribe();
    });

    fireEvent.change(nameInput, { target: { value: 'My X Wallet' } });

    const secondSub = providers.confirmationDialog.shouldShowDialog$.subscribe((value) => {
      expect(value).toBe(false);
      secondSub.unsubscribe();
      done();
    });

    fireEvent.change(nameInput, { target: { value: '' } });
  });
});
