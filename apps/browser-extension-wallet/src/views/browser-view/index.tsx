import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { BrowserViewRoutes } from '@views/browser/routes';
import {
  CurrencyStoreProvider,
  DatabaseProvider,
  AxiosClientProvider,
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
import { ExperimentsProvider } from '@providers/ExperimentsProvider/context';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';
import { WalletServiceAPIProvider } from '@lace/midnight';

const App = (): React.ReactElement => (
  <BackgroundServiceAPIProvider>
    <WalletServiceAPIProvider>
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <AxiosClientProvider>
              <CurrencyStoreProvider>
                <HashRouter>
                  <BackgroundPageProvider>
                    <PostHogClientProvider>
                      <ExperimentsProvider>
                        <AnalyticsProvider>
                          <ThemeProvider>
                            <UIThemeProvider>
                              <ExternalLinkOpenerProvider>
                                <MigrationContainer appMode={APP_MODE_BROWSER}>
                                  <DataCheckContainer appMode={APP_MODE_BROWSER}>
                                    <AddressesDiscoveryOverlay>
                                      <BrowserViewRoutes />
                                    </AddressesDiscoveryOverlay>
                                  </DataCheckContainer>
                                </MigrationContainer>
                              </ExternalLinkOpenerProvider>
                            </UIThemeProvider>
                          </ThemeProvider>
                        </AnalyticsProvider>
                      </ExperimentsProvider>
                    </PostHogClientProvider>
                  </BackgroundPageProvider>
                </HashRouter>
              </CurrencyStoreProvider>
            </AxiosClientProvider>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    </WalletServiceAPIProvider>
  </BackgroundServiceAPIProvider>
);

const mountNode = document.querySelector('#lace-app');
ReactDOM.render(<App />, mountNode);
