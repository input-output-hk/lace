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
import { ExperimentsProvider } from '@providers/ExperimentsProvider/context';
import { BackgroundPageProvider } from '@providers/BackgroundPageProvider';
import { AddressesDiscoveryOverlay } from 'components/AddressesDiscoveryOverlay';
import { NamiPopup } from './views/nami-mode';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { runtime, storage } from 'webextension-polyfill';
import { NamiMigrationGuard } from './features/nami-migration/NamiMigrationGuard';
import { createNonBackgroundMessenger } from '@cardano-sdk/web-extension';
import { logger } from '@lib/wallet-api-ui';

const App = (): React.ReactElement => {
  const [mode, setMode] = useState<'lace' | 'nami'>();
  storage.onChanged.addListener((changes) => {
    const oldModeValue = changes.BACKGROUND_STORAGE?.oldValue?.namiMigration;
    const newModeValue = changes.BACKGROUND_STORAGE?.newValue?.namiMigration;
    if (oldModeValue?.mode !== newModeValue?.mode) {
      setMode(newModeValue);
      // Force back to original routing unless it is staking route (see LW-11876)
      if (window.location.hash.split('#')[1] !== walletRoutePaths.earn) window.location.hash = '#';
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
                                <NamiMigrationGuard>
                                  <BackgroundPageProvider>
                                    {mode === 'nami' ? <NamiPopup /> : <PopupView />}
                                  </BackgroundPageProvider>
                                </NamiMigrationGuard>
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

// not exposing any API; used to keep track of connection with SW to determine whether popup is open
createNonBackgroundMessenger({ baseChannel: TRACK_POPUP_CHANNEL }, { logger, runtime });
