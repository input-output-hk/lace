import * as React from 'react';
import { Wallet } from '@lace/cardano';
import { render, queryByText } from '@testing-library/react';
import '@testing-library/jest-dom';
import { i18n } from '../../../../../lib/i18n';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { SideMenu } from '../SideMenu';
import { AnalyticsProvider } from '@providers';
import { mockKeyAgentDataTestnet, mockWalletInfoTestnet, postHogClientMocks } from '@src/utils/mocks/test-helpers';

jest.mock('../../../../../stores', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../../../../stores'),
  useWalletStore: () => ({
    currentChain: Wallet.Cardano.ChainIds.Preprod,
    walletInfo: mockWalletInfoTestnet,
    keyAgentData: mockKeyAgentDataTestnet
  })
}));

jest.mock('@providers/PostHogClientProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers/PostHogClientProvider'),
  usePostHogClientContext: () => postHogClientMocks
}));

describe('Testing SideMenu component', () => {
  beforeEach(() => {
    process.env.DEFAULT_CHAIN = 'Preprod';
    jest.resetAllMocks();
  });

  const TestSideMenu = () => (
    <I18nextProvider i18n={i18n}>
      <AnalyticsProvider analyticsDisabled>
        <BrowserRouter>
          <SideMenu />
          <Switch>
            <Route path="/" component={() => <div>main</div>} />
            <Route path="/crypto/dashboard" component={() => <div>crypto-dashboard</div>} />
            <Route path="/address-book" component={() => <div>address-book</div>} />
            <Route path="/activity" component={() => <div>activity</div>} />
          </Switch>
        </BrowserRouter>
      </AnalyticsProvider>
    </I18nextProvider>
  );

  test('should render side menu', async () => {
    const { findByTestId } = render(<TestSideMenu />);
    const menuContainer = await findByTestId('side-menu');

    expect(queryByText(menuContainer, 'Activity')).toBeInTheDocument();
    expect(queryByText(menuContainer, 'Staking')).toBeInTheDocument();
    expect(queryByText(menuContainer, 'NFTs')).toBeInTheDocument();
    expect(queryByText(menuContainer, 'Tokens')).toBeInTheDocument();
  });
});
