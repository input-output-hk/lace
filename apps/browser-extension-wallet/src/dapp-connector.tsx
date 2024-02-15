import * as React from 'react';
import { render } from 'react-dom';
import { DappConnectorView } from '@routes';
import { StoreProvider } from '@stores';
import '@lib/i18n';
import 'antd/dist/antd.css';
import { CurrencyStoreProvider } from '@providers/currency';
import { DatabaseProvider, AxiosClientProvider, AppSettingsProvider, AnalyticsProvider } from '@providers';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from '@providers/ThemeProvider';
import { BackgroundServiceAPIProvider } from '@providers/BackgroundServiceAPI';
import { APP_MODE_POPUP } from './utils/constants';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { ExperimentsProvider } from '@providers/ExperimentsProvider/context';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';

const App = (): React.ReactElement => (
  <BackgroundServiceAPIProvider>
    <AppSettingsProvider>
      <DatabaseProvider>
        <StoreProvider appMode={APP_MODE_POPUP}>
          <AxiosClientProvider>
            <CurrencyStoreProvider>
              <HashRouter>
                <PostHogClientProvider>
                  <ExperimentsProvider>
                    <AnalyticsProvider>
                      <ThemeProvider>
                        <AddressesDiscoveryOverlay>
                          <DappConnectorView />
                        </AddressesDiscoveryOverlay>
                      </ThemeProvider>
                    </AnalyticsProvider>
                  </ExperimentsProvider>
                </PostHogClientProvider>
              </HashRouter>
            </CurrencyStoreProvider>
          </AxiosClientProvider>
        </StoreProvider>
      </DatabaseProvider>
    </AppSettingsProvider>
  </BackgroundServiceAPIProvider>
);

const mountNode = document.querySelector('#lace-popup');
render(<App />, mountNode);
