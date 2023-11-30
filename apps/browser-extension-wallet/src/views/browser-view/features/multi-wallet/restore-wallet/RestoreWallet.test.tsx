import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { RestoreWallet } from './RestoreWallet';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { fillMnemonic, getNextButton, setupStep } from '../tests/utils';

const keepWalletSecureStep = async () => {
  const nextButton = getNextButton();

  fireEvent.click(nextButton);

  await screen.findByText('Recovery phrase length');
};

const selectRecoveryPhraseLengthStep = async () => {
  const nextButton = getNextButton();

  const defaultLength = screen.queryByTestId('24-word-passphrase-radio-button');
  fireEvent.click(defaultLength);

  fireEvent.click(nextButton);

  await screen.findByText('Enter your secret passphrase');
};

const recoveryPhraseStep = async () => {
  const step1 = 8;
  const step2 = 16;
  const step3 = 24;

  await fillMnemonic(0, step1);
  await fillMnemonic(step1, step2);
  await fillMnemonic(step2, step3);

  await screen.findByText('Hurray! All done :)');
};

describe('Multi Wallet Setup/Restore Wallet', () => {
  let providers = {} as {
    createWallet: jest.Mock;
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
      createWallet: jest.fn()
    };
  });

  test('setting up a new hot wallet', async () => {
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <MemoryRouter initialEntries={[walletRoutePaths.newWallet.restore.setup]}>
        <RestoreWallet providers={providers as Providers} />
      </MemoryRouter>
    );

    await setupStep();
    await keepWalletSecureStep();
    await selectRecoveryPhraseLengthStep();
    await recoveryPhraseStep();
  });
});
