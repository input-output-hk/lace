import './reset.css';
// The "@lace-contract/app" import needs to occur before the toolkit import,
// otherwise ENV variables have an "any" type, causing lint errors
import { ConfigProvider } from '@lace-contract/app';
import './util/navigation-augmentation';
// eslint-disable-next-line import/order -- app must load before toolkit for ENV types
import {
  ThemeColorScheme,
  ThemeProvider as LaceUiThemeProvider,
} from '@input-output-hk/lace-ui-toolkit';
import { viewsSelectors } from '@lace-contract/views';
import {
  ThemeProvider,
  ContentPortalProvider,
  laceFontAssets,
} from '@lace-lib/ui-toolkit';
import { LaceRenderRoot, LoadModulesProvider } from '@lace-lib/util-render';
import { ActivityDetector } from '@lace-module/app-activity-web';
import { useFonts } from 'expo-font';
import React, { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { useSelector } from 'react-redux';

import { Router } from './Router';
import { logger } from './util';

import type { FeatureFlag } from '@lace-contract/feature';
import type { ModuleInitProps, State, ViewId } from '@lace-contract/module';
import type { ViewsStoreState } from '@lace-contract/views';

type ThemePreference = 'dark' | 'light' | 'system';

type AppProps = {
  moduleInitProps: ModuleInitProps & { featureFlags: FeatureFlag[] };
  viewId: ViewId;
};

enableScreens();

export const App = ({ moduleInitProps, viewId }: AppProps) => {
  // Load fonts using Expo's useFonts hook
  useFonts(laceFontAssets);

  const preferedColorScheme = useSelector<State, ThemePreference>(
    (state: {
      mobile?: { ui?: { general?: { themePreference?: ThemePreference } } };
    }) => state.mobile?.ui?.general?.themePreference || 'system',
  );

  const view = useSelector<State, ViewsStoreState['views']['open']>(
    viewsSelectors.views.selectOpenViewsMap,
  )[viewId];

  const userAgentColorScheme = window.matchMedia?.(
    '(prefers-color-scheme: dark)',
  )?.matches
    ? 'dark'
    : 'light';

  const colorScheme =
    preferedColorScheme === 'system'
      ? userAgentColorScheme
      : preferedColorScheme;
  const featureFlags = moduleInitProps.featureFlags;
  const typographyFeatureFlag = useMemo(
    () => featureFlags.filter(flag => flag.key === 'FONT_SELECTION'),
    [featureFlags],
  );

  if (view?.type === 'popupWindow') {
    return (
      <ConfigProvider
        viewId={moduleInitProps.viewId!}
        appConfig={moduleInitProps.runtime.config}>
        <LaceUiThemeProvider
          colorScheme={
            colorScheme === 'dark'
              ? ThemeColorScheme.Dark
              : ThemeColorScheme.Light
          }>
          <LoadModulesProvider loadModules={moduleInitProps.loadModules}>
            <ActivityDetector>
              <LaceRenderRoot
                moduleInitProps={moduleInitProps}
                dependencies={{ logger }}
                view={view}
              />
            </ActivityDetector>
          </LoadModulesProvider>
        </LaceUiThemeProvider>
      </ConfigProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider
        defaultTheme={colorScheme}
        featureFlags={typographyFeatureFlag}>
        <ContentPortalProvider>
          <LoadModulesProvider loadModules={moduleInitProps.loadModules}>
            <ActivityDetector>
              <Router moduleInitProps={moduleInitProps} viewId={viewId} />
            </ActivityDetector>
          </LoadModulesProvider>
        </ContentPortalProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};
