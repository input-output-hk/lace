/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from 'react';
import { HashRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import dayjs from 'dayjs';
import i18n from 'i18next';
import { Wallet } from '@lace/cardano';
import { AnalyticsProvider, AppSettingsProvider, CurrencyStoreProvider, DatabaseProvider } from '@providers';
import { BackgroundServiceAPIProvider } from '@providers/BackgroundServiceAPI';
import { MockWalletStore, walletStoreMock } from '@utils/mocks/store';
import { WalletStore } from '@stores/types';
import { AppSettings } from '@types';
import { WalletDatabase } from '@lib/storage';
import { mockBlockchainProviders } from './blockchain-providers';
import { SetState, GetState } from 'zustand';
import { ExternalLinkOpenerProvider } from '@providers/ExternalLinkOpenerProvider';
import { IBlockchainProvider } from '@src/stores/slices/blockchain-provider-slice';
import { mockAnalyticsTracker, postHogClientMocks } from './test-helpers';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';

interface ProvidersConfig {
  blockchainProviders?: Partial<IBlockchainProvider>;
  walletStore?: Partial<WalletStore>;
  appSettings?: Partial<AppSettings>;
  walletDatabase?: WalletDatabase;
}

interface MockProvidersProps {
  children: React.ReactNode;
  config?: ProvidersConfig;
}

export type IMockProviders = (props: MockProvidersProps) => React.ReactElement;

export interface buildMockProvidersResponse {
  blockchainProviders: IBlockchainProvider;
  initialMockStore: WalletStore;
  initialMockAppSettings: AppSettings;
  MockProviders: IMockProviders;
}

export const buildMockProviders = async (
  config?: ProvidersConfig,
  mockPersonalWallet?: Wallet.ObservableWallet,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storeCustomSlice?: (set: SetState<any>, get: GetState<any>) => Partial<WalletStore>
): Promise<buildMockProvidersResponse> => {
  const blockchainProviders: IBlockchainProvider = mockBlockchainProviders(config?.blockchainProviders);
  const mockStore: WalletStore = await walletStoreMock(config?.walletStore, mockPersonalWallet);
  const mockAppSettings: AppSettings = {
    mnemonicVerificationFrequency: '',
    lastMnemonicVerification: dayjs().valueOf().toString(),
    ...config?.appSettings
  };

  return {
    blockchainProviders,
    initialMockStore: mockStore,
    initialMockAppSettings: mockAppSettings,
    MockProviders: ({ children, config: overrideConfig }: MockProvidersProps): React.ReactElement => (
      <BackgroundServiceAPIProvider>
        <I18nextProvider i18n={i18n}>
          <AppSettingsProvider initialState={{ ...mockAppSettings, ...overrideConfig?.appSettings }}>
            {/* Check `SendAddressInput.test.tsx` for an example to handle the db in tests */}
            <DatabaseProvider dbCustomInstance={overrideConfig?.walletDatabase ?? config?.walletDatabase}>
              <MockWalletStore
                mockStore={{ ...mockStore, ...overrideConfig?.walletStore }}
                customSlice={storeCustomSlice}
              >
                <CurrencyStoreProvider>
                  <PostHogClientProvider postHogCustomClient={postHogClientMocks as any}>
                    <AnalyticsProvider analyticsDisabled tracker={mockAnalyticsTracker as any}>
                      <ExternalLinkOpenerProvider>
                        <HashRouter>{children}</HashRouter>
                      </ExternalLinkOpenerProvider>
                    </AnalyticsProvider>
                  </PostHogClientProvider>
                </CurrencyStoreProvider>
              </MockWalletStore>
            </DatabaseProvider>
          </AppSettingsProvider>
        </I18nextProvider>
      </BackgroundServiceAPIProvider>
    )
  };
};
