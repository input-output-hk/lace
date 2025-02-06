/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import { render } from '@testing-library/react';
import { ReceiveInfo, ReceiveInfoProps } from '../ReceiveInfo';
import '@testing-library/jest-dom';
import { i18n } from '../../../../lib/i18n';
import { mockWalletInfoTestnet } from '@src/utils/mocks/test-helpers';
import { ThemeProvider } from '@providers/ThemeProvider';
import { logger } from '@lace/common';

jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useAnalyticsContext: jest.fn().mockReturnValue({ sendEventToPostHog: jest.fn() })
}));

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Testing ReceiveInfo component', () => {
  window.ResizeObserver = ResizeObserver;
  beforeAll(() => {
    // qrcode.react lib is printing these warning in development mode only:
    // https://github.com/zpao/qrcode.react/issues/134
    jest.spyOn(logger, 'warn').mockImplementation(jest.fn());
    jest.spyOn(logger, 'error').mockImplementation(jest.fn());
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const props: ReceiveInfoProps = {
    name: mockWalletInfoTestnet.name,
    address: mockWalletInfoTestnet.addresses[0].address,
    goBack: jest.fn()
  };
  test('should render a back button and the addressQR screen', async () => {
    const { findByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ReceiveInfo {...props} />
        </ThemeProvider>
      </I18nextProvider>
    );
    const copyButton = await findByTestId('copy-address-btn');
    const addressQR = await findByTestId('receive-address-qr');

    expect(addressQR).toBeInTheDocument();
    expect(copyButton).toBeInTheDocument();
  });
});
