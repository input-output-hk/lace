import React, { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { PopupView, walletRoutePaths } from '@routes';
import { StoreProvider } from '@stores';
import { CurrencyStoreProvider } from '@providers/currency';
import { AppSettingsProvider, DatabaseProvider, ThemeProvider, AnalyticsProvider } from '@providers';
import '@lib/i18n';
import 'antd/dist/antd.css';
import './styles/index.scss';
import 'normalize.css';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';
import { BackgroundServiceAPIProvider } from '@providers/BackgroundServiceAPI';
import { ExternalLinkOpenerProvider } from '@providers/ExternalLinkOpenerProvider';
import { APP_MODE_POPUP, TRACK_POPUP_CHANNEL } from './utils/constants';
import { MigrationContainer } from '@components/MigrationContainer';
import { DataCheckContainer } from '@components/DataCheckContainer';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { BackgroundPageProvider } from '@providers/BackgroundPageProvider';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';
import { NamiPopup } from './views/nami-mode';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import {runtime, Storage, storage} from 'webextension-polyfill';
import { NamiMigrationGuard } from './features/nami-migration/NamiMigrationGuard';
import { createNonBackgroundMessenger } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { AppVersionGuard } from './utils/AppVersionGuard';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { BitcoinPopupView } from "@src/views/bitcoin-mode";

const CARDANO_LACE = 'lace';
const BITCOIN_LACE = 'lace-bitcoin';

const App = (): React.ReactElement => {
  const [mode, setMode] = useState<'lace' | 'nami' | 'lace-bitcoin'>('lace');

  useEffect(() => {
    const handleStorageChange = async (changes: Record<string, Storage.StorageChange>) => {
      const oldModeValue = changes.BACKGROUND_STORAGE?.oldValue?.namiMigration;
      const newModeValue = changes.BACKGROUND_STORAGE?.newValue?.namiMigration;
      const activeBlockchainOldValue = changes.BACKGROUND_STORAGE?.oldValue?.activeBlockchain;
      const activeBlockchainNewValue = changes.BACKGROUND_STORAGE?.newValue?.activeBlockchain;

      if (activeBlockchainOldValue?.activeBlockchain !== activeBlockchainNewValue?.activeBlockchain) {
        const isCardano = activeBlockchainNewValue?.activeBlockchain === 'cardano';
        setMode(isCardano ? CARDANO_LACE : BITCOIN_LACE);
        window.location.hash = '#';
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
      const { namiMigration, activeBlockchain } = await getBackgroundStorage();
      if (activeBlockchain === 'cardano') {
        setMode(namiMigration?.mode || CARDANO_LACE);
      } else {
        setMode(BITCOIN_LACE);
      }
    };

    getWalletMode();

    return () => {
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <BackgroundServiceAPIProvider>
        <AppSettingsProvider>
          <DatabaseProvider>
            <StoreProvider appMode={APP_MODE_POPUP}>
              <CurrencyStoreProvider>
                <HashRouter>
                  <PostHogClientProvider>
                    <AnalyticsProvider>
                      <ThemeProvider>
                        <ExternalLinkOpenerProvider>
                          <MigrationContainer appMode={APP_MODE_POPUP}>
                            <DataCheckContainer appMode={APP_MODE_POPUP}>
                              <AddressesDiscoveryOverlay>
                                <NamiMigrationGuard>
                                  <BackgroundPageProvider>
                                    <AppVersionGuard>{ mode === BITCOIN_LACE ? <BitcoinPopupView /> : (mode === 'nami' ? <NamiPopup /> : <PopupView />) }</AppVersionGuard>
                                  </BackgroundPageProvider>
                                </NamiMigrationGuard>
                              </AddressesDiscoveryOverlay>
                            </DataCheckContainer>
                          </MigrationContainer>
                        </ExternalLinkOpenerProvider>
                      </ThemeProvider>
                    </AnalyticsProvider>
                  </PostHogClientProvider>
                </HashRouter>
              </CurrencyStoreProvider>
            </StoreProvider>
          </DatabaseProvider>
        </AppSettingsProvider>
      </BackgroundServiceAPIProvider>
    </ErrorBoundary>
  );
};

const mountNode = document.querySelector('#lace-popup');
ReactDOM.render(<App />, mountNode);

// not exposing any API; used to keep track of connection with SW to determine whether popup is open
createNonBackgroundMessenger({ baseChannel: TRACK_POPUP_CHANNEL }, { logger, runtime });
