import React, { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { PopupView } from '@routes';
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
import { APP_MODE_POPUP } from './utils/constants';
import { MigrationContainer } from '@components/MigrationContainer';
import { DataCheckContainer } from '@components/DataCheckContainer';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { ExperimentsProvider } from '@providers/ExperimentsProvider/context';
import { BackgroundPageProvider } from '@providers/BackgroundPageProvider';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';
import { NamiPopup } from './views/nami-mode';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { storage } from 'webextension-polyfill';

const App = (): React.ReactElement => {
  const [mode, setMode] = useState<'lace' | 'nami'>();
  storage.onChanged.addListener((changes) => {
    const oldModeValue = changes.BACKGROUND_STORAGE.oldValue?.namiMigration;
    const newModeValue = changes.BACKGROUND_STORAGE.newValue?.namiMigration;
    if (oldModeValue?.mode !== newModeValue?.mode) {
      setMode(newModeValue);
      // Force back to original routing
      window.location.hash = '#';
    }
  });

  useEffect(() => {
    const getWalletMode = async () => {
      const { namiMigration } = await getBackgroundStorage();
      setMode(namiMigration?.mode || 'lace');
    };

    getWalletMode();
  }, [mode]);

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
                          <MigrationContainer appMode={APP_MODE_POPUP}>
                            <DataCheckContainer appMode={APP_MODE_POPUP}>
                              <AddressesDiscoveryOverlay>
                                <BackgroundPageProvider>
                                  {mode === 'nami' ? <NamiPopup /> : <PopupView />}
                                </BackgroundPageProvider>
                              </AddressesDiscoveryOverlay>
                            </DataCheckContainer>
                          </MigrationContainer>
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
ReactDOM.render(<App />, mountNode);
