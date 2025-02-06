import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { BrowserViewRoutes } from '@views/browser/routes';
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

const App = (): React.ReactElement => (
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
                                    <BrowserViewRoutes />
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
);

const mountNode = document.querySelector('#lace-app');
ReactDOM.render(<App />, mountNode);
