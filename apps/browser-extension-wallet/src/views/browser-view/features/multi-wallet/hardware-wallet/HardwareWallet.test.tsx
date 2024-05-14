/* eslint-disable import/imports-first */
import { of, Subject } from 'rxjs';

jest.mock('@lib/wallet-api-ui', () => ({
  walletRepository: {
    addWallet: jest.fn().mockResolvedValue(''),
    wallets$: of([])
  },
  walletManager: {
    activate: jest.fn().mockReturnValue(void 0)
  }
}));

import React from 'react';
import '@testing-library/jest-dom';
import { createMemoryHistory } from 'history';
import { act, fireEvent, render, waitFor, screen } from '@testing-library/react';
import { HardwareWallet } from './HardwareWallet';
import { MemoryRouter, Router } from 'react-router-dom';
import { Providers } from './types';
import { walletRoutePaths } from '@routes';
import { Wallet } from '@lace/cardano';
import { createAssetsRoute, getNextButton } from '../tests/utils';
import { AnalyticsTracker } from '@providers/AnalyticsProvider/analyticsTracker';
import { APP_MODE_BROWSER } from '@utils/constants';
import { StoreProvider } from '@src/stores';
import { AppSettingsProvider, DatabaseProvider } from '@providers';
import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { WalletType } from '@cardano-sdk/web-extension';

jest.mock('@providers/AnalyticsProvider', () => ({
  useAnalyticsContext: jest
    .fn<Pick<AnalyticsTracker, 'sendEventToPostHog' | 'sendMergeEvent' | 'sendAliasEvent'>, []>()
    .mockReturnValue({
      sendEventToPostHog: jest.fn().mockReturnValue(''),
      sendMergeEvent: jest.fn(),
      sendAliasEvent: jest.fn()
    })
}));

const connectHardwareWalletStep = async () => {
  await waitFor(async () => expect(await screen.findByTestId('wallet-setup-register-name-input')));
};

const selectAccountNameStep = async () => {
  const nextButton = getNextButton();
  expect(nextButton).toBeEnabled();

  const nameInput = screen.queryByTestId('wallet-setup-register-name-input');
  expect(nameInput).toHaveValue('Wallet 1');
  act(() => {
    fireEvent.change(nameInput, { target: { value: '' } });
  });
  expect(nextButton).toBeDisabled();
  act(() => {
    fireEvent.change(nameInput, { target: { value: 'Ada Lovalace' } });
  });
  const acountSelect = screen.queryByTestId('select-group-input');
  expect(acountSelect).toHaveTextContent('Account #0');

  act(() => {
    fireEvent.click(nextButton);
  });
  await waitFor(() => screen.findByTestId('loader-image'));
};

const createStep = async () => {
  await waitFor(() => screen.findByText('Total wallet balance'));
};

describe('Multi Wallet Setup/Hardware Wallet', () => {
  let providers = {} as {
    shouldShowConfirmationDialog$: Subject<boolean>;
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const originalUsbDeviceClass = globalThis.USBDevice;
  const originalNavigatorUsbObject = navigator.usb;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let addEventListenerCallback: (event: { device: any }) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deviceObject: any;

  beforeEach(() => {
    providers = {
      shouldShowConfirmationDialog$: new Subject()
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    globalThis.USBDevice = class USBDevice {};

    jest.spyOn(Wallet, 'connectDeviceRevamped').mockImplementation(() =>
      Promise.resolve({
        type: WalletType.Ledger,
        value: {
          transport: {
            close: () => void 0
          }
        } as Wallet.LedgerConnection
      })
    );

    jest
      .spyOn(Wallet, 'getHwExtendedAccountPublicKey')
      .mockImplementation(() => Promise.resolve('' as Bip32PublicKeyHex));

    jest.spyOn(Wallet, 'getDeviceSpec').mockImplementation(() =>
      Promise.resolve({
        model: 'Nano S',
        cardanoAppVersion: '1.1.1'
      })
    );

    const nanoS = Wallet.ledgerDescriptors[0];
    deviceObject = Object.assign(new USBDevice(), nanoS);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore usb api is not available in the jest env
    navigator.usb = {
      addEventListener: (_: string, callback: () => void) => {
        addEventListenerCallback = callback;
      },
      removeEventListener: jest.fn(),
      requestDevice: jest.fn().mockResolvedValue(deviceObject)
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    globalThis.USBDevice = originalUsbDeviceClass;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore usb api is not available in the jest env
    navigator.usb = originalNavigatorUsbObject;
  });

  test('setting up a new hardware wallet', async () => {
    const history = createMemoryHistory();
    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <Router history={history}>
              <HardwareWallet providers={providers as Providers} />
              {createAssetsRoute()}
            </Router>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    act(() => {
      history.push(walletRoutePaths.newWallet.hardware.connect);
    });

    await connectHardwareWalletStep();
    await selectAccountNameStep();
    await createStep();
  });

  test('device disconnected during process', async () => {
    render(
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <MemoryRouter initialEntries={[walletRoutePaths.newWallet.hardware.connect]}>
              <HardwareWallet providers={providers as Providers} />
            </MemoryRouter>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

    await connectHardwareWalletStep();

    act(() => {
      addEventListenerCallback({
        device: deviceObject
      });
    });

    await waitFor(() => expect(screen.queryByText('Oops! Something went wrong')).toBeInTheDocument());
  });
});
