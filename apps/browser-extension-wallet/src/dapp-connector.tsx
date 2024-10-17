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
import { ExperimentsProvider } from '@providers/ExperimentsProvider/context';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';
import { useEffect, useState } from 'react';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { NamiDappConnector } from './views/nami-mode/indexInternal';

const App = (): React.ReactElement => {
  const [mode, setMode] = useState<'lace' | 'nami'>();
  useEffect(() => {
    const getWalletMode = async () => {
      const { namiMigration } = await getBackgroundStorage();
      if (namiMigration?.mode === 'nami') {
        document.title = POPUP_WINDOW_NAMI_TITLE;
      }
      setMode(namiMigration?.mode || 'lace');
    };

    getWalletMode();
  }, []);

  return (
    <BackgroundServiceAPIProvider>
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_POPUP}>
            <CurrencyStoreProvider>
              <HashRouter>
                <PostHogClientProvider>
                  <ExperimentsProvider>
                    <AnalyticsProvider>
                      <ThemeProvider>
                        <ExternalLinkOpenerProvider>
                          <AddressesDiscoveryOverlay>
                            <UIThemeProvider>
                              {mode === 'nami' ? <NamiDappConnector /> : <DappConnectorView />}
                            </UIThemeProvider>
                          </AddressesDiscoveryOverlay>
                        </ExternalLinkOpenerProvider>
                      </ThemeProvider>
                    </AnalyticsProvider>
                  </ExperimentsProvider>
                </PostHogClientProvider>
              </HashRouter>
            </CurrencyStoreProvider>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    </BackgroundServiceAPIProvider>
  );
};

const mountNode = document.querySelector('#lace-popup');
render(<App />, mountNode);
