/* eslint-disable @typescript-eslint/no-explicit-any */
import { I18nextProvider } from 'react-i18next';
import { StoreProvider } from '@src/stores';
import {
  AnalyticsProvider,
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  CurrencyStoreProvider,
  DatabaseProvider,
  ViewFlowProvider
} from '@src/providers';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { i18n } from '@lace/translation';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { postHogClientMocks } from '@src/utils/mocks/test-helpers';
import React from 'react';
import { sendViewsFlowState } from '../../config';
import { BehaviorSubject } from 'rxjs';

const tokenPrices$ = new BehaviorSubject({});
const adaPrices$ = new BehaviorSubject({});
const backgroundService = {
  getBackgroundStorage: jest.fn(),
  setBackgroundStorage: jest.fn(),
  coinPrices: { tokenPrices$, adaPrices$ }
} as unknown as BackgroundServiceAPIProviderProps['value'];

export const getWrapper =
  () =>
  ({ children }: { children: React.ReactNode }): React.ReactElement =>
    (
      <BackgroundServiceAPIProvider value={backgroundService}>
        <AppSettingsProvider>
          <CurrencyStoreProvider>
            <DatabaseProvider>
              <StoreProvider appMode={APP_MODE_BROWSER}>
                <PostHogClientProvider postHogCustomClient={postHogClientMocks as any}>
                  <AnalyticsProvider analyticsDisabled>
                    <I18nextProvider i18n={i18n}>
                      <ViewFlowProvider viewStates={sendViewsFlowState}>{children}</ViewFlowProvider>
                    </I18nextProvider>
                  </AnalyticsProvider>
                </PostHogClientProvider>
              </StoreProvider>
            </DatabaseProvider>
          </CurrencyStoreProvider>
        </AppSettingsProvider>
      </BackgroundServiceAPIProvider>
    );
