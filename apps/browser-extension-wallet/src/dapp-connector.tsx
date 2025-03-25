/* eslint-disable unicorn/no-nested-ternary */
import * as React from 'react';
import { render } from 'react-dom';
import { DappConnectorView } from '@routes';
import { StoreProvider } from '@stores';
import '@lib/i18n';
import 'antd/dist/antd.css';
import { CurrencyStoreProvider } from '@providers/currency';
import { DatabaseProvider, AppSettingsProvider, AnalyticsProvider, ExternalLinkOpenerProvider } from '@providers';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from '@providers/ThemeProvider';
import { UIThemeProvider } from '@providers/UIThemeProvider';
import { BackgroundServiceAPIProvider } from '@providers/BackgroundServiceAPI';
import { APP_MODE_POPUP, POPUP_WINDOW_NAMI_TITLE } from './utils/constants';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';
import { useEffect, useState } from 'react';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { NamiDappConnector } from './views/nami-mode/indexInternal';
import { storage } from 'webextension-polyfill';
import { TxWitnessRequestProvider } from '@providers/TxWitnessRequestProvider';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { BitcoinDappConnectorView } from './views/BitcoinDappConnectorView';

const CARDANO_LACE = 'lace';
const BITCOIN_LACE = 'bitcoin';

const App = (): React.ReactElement => {
  const [mode, setMode] = useState<'lace' | 'nami' | 'bitcoin'>(CARDANO_LACE);

  storage.onChanged.addListener((changes) => {
    const oldModeValue = changes.BACKGROUND_STORAGE?.oldValue?.namiMigration;
    const newModeValue = changes.BACKGROUND_STORAGE?.newValue?.namiMigration;
    if (oldModeValue?.mode !== newModeValue?.mode) {
      setMode(newModeValue);
    }
  });

  useEffect(() => {
    (async () => {
      const { namiMigration, activeBlockchain } = await getBackgroundStorage();
      if (activeBlockchain === 'bitcoin') {
        setMode(BITCOIN_LACE);
      } else {
        if (namiMigration?.mode === 'nami') {
          document.title = POPUP_WINDOW_NAMI_TITLE;
        }
        setMode(namiMigration?.mode || CARDANO_LACE);
      }
    })();
  }, []);

  const getDappConnectorComponent = () => {
    if (mode === BITCOIN_LACE) {
      return <BitcoinDappConnectorView />;
    }
    if (mode === 'nami') {
      return <NamiDappConnector />;
    }
    if (mode === CARDANO_LACE) {
      return <DappConnectorView />;
    }
    return <></>;
  };

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
                          <AddressesDiscoveryOverlay>
                            <UIThemeProvider>
                              <TxWitnessRequestProvider>{getDappConnectorComponent()}</TxWitnessRequestProvider>
                            </UIThemeProvider>
                          </AddressesDiscoveryOverlay>
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
render(<App />, mountNode);
