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
  AnalyticsProvider
} from '@providers';
import { CardanoWalletManagerProvider } from '@providers/CardanoWalletManager';
import { StoreProvider } from '@stores';
import '@lib/i18n';
import 'antd/dist/antd.css';
import '../../styles/index.scss';
import 'normalize.css';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';
import { BackgroundServiceAPIProvider } from '@providers/BackgroundServiceAPI';
import { ExternalLinkOpenerProvider } from '@providers/ExternalLinkOpenerProvider';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { MigrationContainer } from '@components/MigrationContainer';
import { DataCheckContainer } from '@components/DataCheckContainer';
import '../../lib/scripts/keep-alive-ui';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { ExperimentsProvider } from '@providers/ExperimentsProvider/context';

const App = (): React.ReactElement => (
  <BackgroundServiceAPIProvider>
    <AppSettingsProvider>
      <CardanoWalletManagerProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <AxiosClientProvider>
              <CurrencyStoreProvider>
                <HashRouter>
                  <PostHogClientProvider>
                    <ExperimentsProvider>
                      <AnalyticsProvider>
                        <ThemeProvider>
                          <ExternalLinkOpenerProvider>
                            <MigrationContainer appMode={APP_MODE_BROWSER}>
                              <DataCheckContainer appMode={APP_MODE_BROWSER}>
                                <BrowserViewRoutes />
                              </DataCheckContainer>
                            </MigrationContainer>
                          </ExternalLinkOpenerProvider>
                        </ThemeProvider>
                      </AnalyticsProvider>
                    </ExperimentsProvider>
                  </PostHogClientProvider>
                </HashRouter>
              </CurrencyStoreProvider>
            </AxiosClientProvider>
          </StoreProvider>
        </DatabaseProvider>
      </CardanoWalletManagerProvider>
    </AppSettingsProvider>
  </BackgroundServiceAPIProvider>
);

const mountNode = document.querySelector('#lace-app');
ReactDOM.render(<App />, mountNode);
