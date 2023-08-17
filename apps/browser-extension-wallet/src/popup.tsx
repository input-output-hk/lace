import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { PopupView } from '@routes';
import { StoreProvider } from '@stores';
import { CurrencyStoreProvider } from '@providers/currency';
import {
  AppSettingsProvider,
  AxiosClientProvider,
  DatabaseProvider,
  ThemeProvider,
  AnalyticsProvider,
  CardanoWalletManagerProvider
} from '@providers';
import '@lib/i18n';
import 'antd/dist/antd.css';
import './styles/index.scss';
import 'normalize.css';
import { BackgroundServiceAPIProvider } from '@providers/BackgroundServiceAPI';
import { ExternalLinkOpenerProvider } from '@providers/ExternalLinkOpenerProvider';
import { APP_MODE_POPUP } from './utils/constants';
import { MigrationContainer } from '@components/MigrationContainer';
import { DataCheckContainer } from '@components/DataCheckContainer';
import { FeatureFlagsProvider } from '@providers/FeatureFlags/context';

if (process.env.USE_MULTI_DELEGATION_STAKING === 'true') {
  // Disabling import/no-unresolved as it is not aware of the "exports" entry
  // https://github.com/import-js/eslint-plugin-import/issues/1810
  // eslint-disable-next-line import/no-unresolved
  require('@lace/staking/index.css');
}

const App = (): React.ReactElement => (
  <BackgroundServiceAPIProvider>
    <AppSettingsProvider>
      <CardanoWalletManagerProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_POPUP}>
            <AxiosClientProvider>
              <CurrencyStoreProvider>
                <AnalyticsProvider>
                  <HashRouter>
                    <ThemeProvider>
                      <ExternalLinkOpenerProvider>
                        <MigrationContainer appMode={APP_MODE_POPUP}>
                          <DataCheckContainer appMode={APP_MODE_POPUP}>
                            <FeatureFlagsProvider>
                              <PopupView />
                            </FeatureFlagsProvider>
                          </DataCheckContainer>
                        </MigrationContainer>
                      </ExternalLinkOpenerProvider>
                    </ThemeProvider>
                  </HashRouter>
                </AnalyticsProvider>
              </CurrencyStoreProvider>
            </AxiosClientProvider>
          </StoreProvider>
        </DatabaseProvider>
      </CardanoWalletManagerProvider>
    </AppSettingsProvider>
  </BackgroundServiceAPIProvider>
);

const mountNode = document.querySelector('#lace-popup');
ReactDOM.render(<App />, mountNode);
