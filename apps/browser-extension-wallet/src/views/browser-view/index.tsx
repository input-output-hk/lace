import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { BrowserViewRoutes } from '@views/browser/routes';
import { BitcoinBrowserViewRoutes } from '../bitcoin-mode/BitcoinBrowserViewRoutes';
import {
  CurrencyStoreProvider,
  DatabaseProvider,
  AppSettingsProvider,
  ThemeProvider,
  AnalyticsProvider,
  UIThemeProvider
} from '@providers';
import { StoreProvider } from '@stores';
import 'antd/dist/antd.css';
import '../../styles/index.scss';
import 'normalize.css';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';
import { BackgroundServiceAPIProvider } from '@providers/BackgroundServiceAPI';
import { ExternalLinkOpenerProvider } from '@providers/ExternalLinkOpenerProvider';
import { BackgroundPageProvider } from '@providers/BackgroundPageProvider';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { MigrationContainer } from '@components/MigrationContainer';
import { DataCheckContainer } from '@components/DataCheckContainer';
import '../../lib/scripts/keep-alive-ui';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';
import { NamiMigrationGuard } from '@src/features/nami-migration/NamiMigrationGuard';
import { AppVersionGuard } from '@src/utils/AppVersionGuard';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { storage, Storage } from 'webextension-polyfill';
import { walletRoutePaths } from '@routes';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { BlockchainProvider, useCurrentBlockchain, Blockchain } from './../../multichain/BlockchainProvider';

const CARDANO_LACE = 'lace';
const BITCOIN_LACE = 'lace-bitcoin';

const App = (): React.ReactElement => {
  const [mode, setMode] = useState<'lace' | 'lace-bitcoin'>('lace');
  const { setBlockchain } = useCurrentBlockchain();

  /* eslint-disable sonarjs/cognitive-complexity */
  useEffect(() => {
    const handleStorageChange = async (changes: Record<string, Storage.StorageChange>) => {
      const oldModeValue = changes.BACKGROUND_STORAGE?.oldValue?.namiMigration;
      const newModeValue = changes.BACKGROUND_STORAGE?.newValue?.namiMigration;
      const activeBlockchainOldValue = changes.BACKGROUND_STORAGE?.oldValue?.activeBlockchain;
      const activeBlockchainNewValue = changes.BACKGROUND_STORAGE?.newValue?.activeBlockchain;

      if (activeBlockchainOldValue !== activeBlockchainNewValue) {
        const isCardano = !activeBlockchainNewValue || activeBlockchainNewValue === 'cardano';
        setMode(isCardano ? CARDANO_LACE : BITCOIN_LACE);
        setBlockchain(isCardano ? Blockchain.Cardano : Blockchain.Bitcoin);
        return;
      }

      if (oldModeValue?.mode !== newModeValue?.mode) {
        setMode(newModeValue?.mode || CARDANO_LACE);
        // Force back to original routing unless it is staking route
        if (window.location.hash.split('#')[1] !== walletRoutePaths.earn) {
          window.location.hash = '#';
        }
      }
    };

    storage.onChanged.addListener(handleStorageChange);

    const getWalletMode = async () => {
      const { activeBlockchain } = await getBackgroundStorage();
      if (activeBlockchain === 'bitcoin') {
        setMode(BITCOIN_LACE);
        setBlockchain(Blockchain.Bitcoin);
      } else {
        setMode(CARDANO_LACE);
        setBlockchain(Blockchain.Cardano);
      }
    };

    getWalletMode();

    return () => {
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, [setBlockchain]);

  return (
    <ErrorBoundary>
      <BackgroundServiceAPIProvider>
        <AppSettingsProvider>
          <DatabaseProvider>
            <StoreProvider appMode={APP_MODE_BROWSER}>
              <CurrencyStoreProvider>
                <HashRouter>
                  <BackgroundPageProvider>
                    <PostHogClientProvider>
                      <AnalyticsProvider>
                        <ThemeProvider>
                          <UIThemeProvider>
                            <ExternalLinkOpenerProvider>
                              <MigrationContainer appMode={APP_MODE_BROWSER}>
                                <DataCheckContainer appMode={APP_MODE_BROWSER}>
                                  <AddressesDiscoveryOverlay>
                                    <NamiMigrationGuard>
                                      <AppVersionGuard>
                                        {mode === BITCOIN_LACE ? <BitcoinBrowserViewRoutes /> : <BrowserViewRoutes />}
                                      </AppVersionGuard>
                                    </NamiMigrationGuard>
                                  </AddressesDiscoveryOverlay>
                                </DataCheckContainer>
                              </MigrationContainer>
                            </ExternalLinkOpenerProvider>
                          </UIThemeProvider>
                        </ThemeProvider>
                      </AnalyticsProvider>
                    </PostHogClientProvider>
                  </BackgroundPageProvider>
                </HashRouter>
              </CurrencyStoreProvider>
            </StoreProvider>
          </DatabaseProvider>
        </AppSettingsProvider>
      </BackgroundServiceAPIProvider>
    </ErrorBoundary>
  );
};

const mountNode = document.querySelector('#lace-app');
ReactDOM.render(
  <BlockchainProvider>
    <App />
  </BlockchainProvider>,
  mountNode
);
