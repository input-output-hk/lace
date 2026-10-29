import '@expo/metro-runtime';
import './util/navigation-augmentation';
import { Buffer as WebBuffer } from 'buffer';

import { MOBILE_VIEW_ID } from '@lace-contract/views';
import {
  initializeObservability,
  NoOpProvider,
  createSentryProvider,
  getObservability,
} from '@lace-lib/observability';
import {
  ThemeProvider,
  GestureHandlerRootView,
  ContentPortalProvider,
  Splash,
  laceFontAssets,
  configureImageFormat,
} from '@lace-lib/ui-toolkit';
import { LoadModulesProvider } from '@lace-lib/util-render';
import { ActivityDetector } from '@lace-module/app-activity-mobile';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React, { useState, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { install } from 'react-native-quick-crypto';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Provider } from 'react-redux';

import { ConfigurationErrorScreen } from './ConfigurationErrorScreen';
import { defaultFeatureFlags } from './feature-flags';
import { loadMobileScript, type Init } from './load-app';
import { ModuleLoadingErrorScreen } from './ModuleLoadingErrorScreen';
import { Router } from './Router';
import { logger } from './util';
import { appConfig, configValidationError, ENV } from './util';
import {
  WEB_IPFS_GATEWAY_URL,
  IMAGE_PROXY_URL,
  IMAGE_PROXY_KEY,
  IMAGE_PROXY_SALT,
} from './util/constants';
import { sentryNavigationIntegration } from './util/sentry-navigation';

import type { ThemePreference } from './util';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

configureImageFormat({
  // No ipfsGatewayUrl: native falls back to the toolkit's built-in gateway,
  // the one every Lace client resolves a CID against (ADR 42 §4).
  webIpfsGatewayUrl: WEB_IPFS_GATEWAY_URL,
  imageProxyUrl: IMAGE_PROXY_URL,
  imageProxyKey: IMAGE_PROXY_KEY,
  imageProxySalt: IMAGE_PROXY_SALT,
});

// Sentry initialization (non-web platforms only)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN as string;
const isSentryEnabled = Platform.OS !== 'web' && sentryDsn && sentryDsn !== '';

if (Platform.OS === 'web') {
  globalThis.Buffer = WebBuffer;
} else {
  install();

  try {
    if (isSentryEnabled) {
      const isProduction = ENV === 'production';
      // Only the measured (BrowserStack-bound) build inlines this at bundle
      // time: a nightly session yields a handful of launches, and at 0.1 most
      // nights would record no app start at all. Store builds never set it,
      // so real users stay sampled at 0.1.
      const shouldForceFullTracing =
        process.env.EXPO_PUBLIC_SENTRY_FORCE_FULL_TRACING === 'true';
      // CI stamps the measured (BrowserStack-bound) build with the commit sha
      // so every span is attributable to a commit — the same traceability the
      // lace-next builds have. Store builds never set it and keep the SDK's
      // package@version release. Safe for symbolication: sourcemaps are keyed
      // by debug id, not by release.
      const sentryRelease = process.env.EXPO_PUBLIC_SENTRY_RELEASE as
        | string
        | undefined;
      initializeObservability(createSentryProvider(Sentry), {
        dsn: sentryDsn,
        debug: !isProduction,
        ...(sentryRelease ? { release: sentryRelease } : {}),
        environment: String(
          process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ||
            'EXPO_PUBLIC_SENTRY_ENVIRONMENT was empty',
        ),
        sendDefaultPii: false,
        tracesSampleRate: isProduction && !shouldForceFullTracing ? 0.1 : 1.0,
        profilesSampleRate: isProduction && !shouldForceFullTracing ? 0.1 : 1.0,
        integrations: [sentryNavigationIntegration],
        // ENV derives from NODE_ENV, which the EAS build never sets explicitly —
        // whether Metro inlines it is not observable from CI logs or the Hermes
        // bytecode. Tagging it is what distinguishes "no regression" from "sampling
        // dropped 90% of the transactions" when reading perf data.
        initialScope: { tags: { app_env: ENV } },
      });
    } else {
      initializeObservability(new NoOpProvider());
    }
    logger.debug('Observability initialized successfully');
  } catch (error) {
    logger.warn('Failed to initialize observability:', error);
  }
}

const ThemeProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const themePreference = useSelector(
    (state: {
      mobile?: { ui?: { general?: { themePreference?: ThemePreference } } };
    }) => state.mobile?.ui?.general?.themePreference || 'system',
  );
  const userAgentColorScheme = Appearance.getColorScheme();
  const typographyFeatureFlag = defaultFeatureFlags.filter(
    flag => flag.key === 'FONT_SELECTION',
  );

  const defaultTheme =
    themePreference === 'system'
      ? userAgentColorScheme ?? 'light'
      : themePreference;

  return (
    <ThemeProvider
      defaultTheme={defaultTheme}
      featureFlags={typographyFeatureFlag}>
      {children}
    </ThemeProvider>
  );
};

export const App = (props: { init?: Init }) => {
  const [init, setInit] = useState<Init | null>(props.init || null);
  const [initError, setInitError] = useState<string | null>(null);

  // Error paths that never reach SplashWrapper must hide the splash themselves.
  useEffect(() => {
    if (appConfig === null) {
      void SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    if (initError !== null) {
      void SplashScreen.hideAsync();
    }
  }, [initError]);

  useEffect(() => {
    const runInit = async () => {
      const loadedInit = await loadMobileScript(MOBILE_VIEW_ID);
      setInit(loadedInit);
    };
    if (!props.init && appConfig !== null) {
      void runInit().catch(error => {
        const moduleLoadingError =
          error instanceof Error ? error : new Error(String(error));
        logger.error('Module loading failed:', moduleLoadingError);
        try {
          getObservability().captureException(moduleLoadingError, {
            tags: { phase: 'module-loading' },
          });
        } catch {
          // observability may be uninitialized (e.g. Sentry init failed, web platform)
        }
        setInitError(error instanceof Error ? error.message : String(error));
      });
    }
  }, [props.init]);

  if (appConfig === null) {
    return (
      <ConfigurationErrorScreen
        configValidationError={configValidationError || ''}
      />
    );
  }

  if (initError !== null) {
    if (ENV === 'production') {
      return null;
    }
    return <ModuleLoadingErrorScreen error={initError} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, height: '100%' }}>
      {!!init && <AppBase init={init} />}
    </GestureHandlerRootView>
  );
};

const SplashWrapper = ({ children }: { children: React.ReactNode }) => {
  const [didFontsLoad, fontError] = useFonts(laceFontAssets);

  useEffect(() => {
    if (didFontsLoad || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [didFontsLoad, fontError]);

  // Show splash while fonts are loading
  if (!didFontsLoad && !fontError) {
    return <Splash />;
  }

  return <>{children}</>;
};

export const AppBase = ({ init }: { init: Init }) => {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Provider store={init.store}>
        <ThemeProviderWrapper>
          <SplashWrapper>
            <ContentPortalProvider>
              <LoadModulesProvider
                loadModules={init.moduleInitProps.loadModules}>
                <ActivityDetector>
                  <Router moduleInitProps={init.moduleInitProps} />
                </ActivityDetector>
              </LoadModulesProvider>
            </ContentPortalProvider>
          </SplashWrapper>
        </ThemeProviderWrapper>
      </Provider>
    </SafeAreaProvider>
  );
};

// Only wrap with Sentry ErrorBoundary if Sentry is initialized
export default isSentryEnabled ? Sentry.wrap(App) : App;
