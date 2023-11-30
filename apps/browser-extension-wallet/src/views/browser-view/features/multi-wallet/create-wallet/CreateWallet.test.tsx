import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateWallet } from './CreateWallet';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { fillMnemonic, getNextButton, mnemonicWords, setupStep } from '../tests/utils';

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

  await screen.findByText('Hurray! All done :)');
};

describe('Multi Wallet Setup/Create Wallet', () => {
  let providers = {} as {
    createWallet: jest.Mock;
    generateMnemonicWords: jest.Mock;
  };

  beforeEach(() => {
    providers = {
      createWallet: jest.fn(),
      generateMnemonicWords: jest.fn()
    };
  });

  test('setting up a new hot wallet', async () => {
    providers.generateMnemonicWords.mockReturnValue(mnemonicWords);
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <MemoryRouter initialEntries={[walletRoutePaths.newWallet.create.setup]}>
        <CreateWallet providers={providers as Providers} />
      </MemoryRouter>
    );

    await setupStep();
    await keepWalletSecureStep();
    await recoveryPhraseStep();
  });
});
