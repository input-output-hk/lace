import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, waitFor, screen } from '@testing-library/react';
import { HardwareWallet } from './HardwareWallet';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { Subject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { createAssetsRoute, getNextButton } from '../tests/utils';
import { AnalyticsTracker } from '@providers/AnalyticsProvider/analyticsTracker';

jest.mock('@providers/AnalyticsProvider', () => ({
  useAnalyticsContext: jest.fn<Pick<AnalyticsTracker, 'sendEventToPostHog'>, []>().mockReturnValue({
    sendEventToPostHog: jest.fn().mockReturnValue('')
  })
}));

const connectHardwareWalletStep = async () => {
  const nextButton = getNextButton();
  expect(nextButton).toBeDisabled();
  const connectButton = screen.queryByTestId('connect-hardware-wallet-button-ledger');
  fireEvent.click(connectButton);

  await waitFor(() => expect(nextButton).toBeEnabled());
  fireEvent.click(nextButton);

  await screen.findByText('Select Account');
};

const selectAccountStep = async () => {
  const nextButton = getNextButton();
  expect(nextButton).toBeDisabled();

  const selectFirstAccount = screen.queryByTestId('select-account-0');
  fireEvent.click(selectFirstAccount);

  await waitFor(() => expect(nextButton).toBeEnabled());
  fireEvent.click(nextButton);

  await screen.findByText('Name your wallet');
};

const nameWalletStep = async () => {
  const nextButton = getNextButton();
  expect(nextButton).toBeDisabled();

  const nameInput = screen.queryByTestId('wallet-setup-register-name-input');

  fireEvent.change(nameInput, { target: { value: 'Ada Lovalace' } });

  await waitFor(() => expect(nextButton).toBeEnabled());
  fireEvent.click(nextButton);

  await screen.findByText('Total wallet balance');
};

describe('Multi Wallet Setup/Hardware Wallet', () => {
  let providers = {} as {
    connectHardwareWallet: jest.Mock;
    createWallet: jest.Mock;
    disconnectHardwareWallet$: Subject<USBConnectionEvent>;
    shouldShowConfirmationDialog$: Subject<boolean>;
  };

  beforeEach(() => {
    providers = {
      connectHardwareWallet: jest.fn(),
      createWallet: jest.fn(),
      disconnectHardwareWallet$: new Subject<USBConnectionEvent>(),
      shouldShowConfirmationDialog$: new Subject()
    };
  });

  test('setting up a new hardware wallet', async () => {
    providers.connectHardwareWallet.mockResolvedValue({} as Wallet.DeviceConnection);
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <MemoryRouter initialEntries={[walletRoutePaths.newWallet.hardware.connect]}>
        <HardwareWallet providers={providers as Providers} />
        {createAssetsRoute()}
      </MemoryRouter>
    );
    await connectHardwareWalletStep();
    await selectAccountStep();
    await nameWalletStep();
  });

  test('device disconnected during process', async () => {
    providers.connectHardwareWallet.mockResolvedValue({} as Wallet.DeviceConnection);
    providers.createWallet.mockResolvedValue(void 0);

    render(
      <MemoryRouter initialEntries={[walletRoutePaths.newWallet.hardware.connect]}>
        <HardwareWallet providers={providers as Providers} />
      </MemoryRouter>
    );

    await connectHardwareWalletStep();
    await selectAccountStep();

    act(() => {
      providers.disconnectHardwareWallet$.next({ device: { opened: true } } as USBConnectionEvent);
    });

    await waitFor(() => expect(screen.queryByText('Oops! Something went wrong')).toBeInTheDocument());
  });
});
