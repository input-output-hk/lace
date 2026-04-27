import './util/navigation-augmentation';

import { ConfigProvider, useUICustomisation } from '@lace-contract/app';
import { SendProvider } from '@lace-contract/send-flow';
import { viewsSelectors } from '@lace-contract/views';
import { walletsSelectors } from '@lace-contract/wallet-repo';
import {
  NavigationContainer,
  NavigationControls,
  laceStackNavigatorProps,
  navigationRef,
  navigationTheme,
  sheetNavigationRef,
  SheetRoutes,
  SheetStack,
  Stack,
  StackRoutes,
  useNavigationObservability,
} from '@lace-lib/navigation';
import {
  BaseTemplate,
  GlobalToast,
  isAndroid,
  Splash,
} from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { Home } from './Home';
import { useDispatchLaceAction, useLaceSelector } from './util/hooks';

import type { Init } from './load-app';
import type { State } from '@lace-contract/module';
import type {
  LinkingOptions,
  NavigationState,
  ParamListBase,
  StackParameterList,
  StackScreenProps,
} from '@lace-lib/navigation';
import type { EdgeInsets } from 'react-native-safe-area-context';

const InitialSheet = () => <></>;

export const Router = ({
  moduleInitProps,
}: {
  moduleInitProps: Init['moduleInitProps'];
}) => {
  const [pages, setPages] = useState<{
    stackPages: React.ReactNode | undefined;
    tabPages: React.ReactNode | undefined;
    globalOverlays: React.ReactNode | undefined;
    sheetPages: React.ReactNode | undefined;
  }>({
    stackPages: undefined,
    tabPages: undefined,
    globalOverlays: undefined,
    sheetPages: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentRouteName, setCurrentRouteName] = useState<string>('');

  const toast = useLaceSelector('ui.getToast');
  const hideToast = useDispatchLaceAction('ui.hideToast');

  const [deepLinks, setDeepLinks] = useState<
    LinkingOptions<ParamListBase> | undefined
  >();
  const walletNumber = useSelector<State, number>(
    walletsSelectors.wallets.selectTotal,
  );

  // TODO: This is only a temporary workaround to enable navigation from side effects. Will be removed when we have a more robust implementation of the navigation system.
  const activeSheetPage = useSelector(viewsSelectors.views.getActiveSheetPage);
  const activePage = useSelector(viewsSelectors.views.getActivePage);
  const activeSheetPageRef = useRef(activeSheetPage);
  const dialogs = useUICustomisation('addons.loadDialogs');
  const {
    stackContainerProps,
    sheetContainerProps,
    stackScreenListeners,
    sheetScreenListeners,
  } = useNavigationObservability(navigationRef, sheetNavigationRef);

  const renderHomeScreen = useCallback(
    (props: StackScreenProps<StackRoutes.Home>) => (
      <Home {...props}>{pages.tabPages}</Home>
    ),
    [pages.tabPages],
  );

  useEffect(() => {
    activeSheetPageRef.current = activeSheetPage;
  }, [activeSheetPage]);

  useEffect(() => {
    if (activeSheetPage === null) {
      NavigationControls.sheets.close();
    }
    if (activeSheetPage && activeSheetPage.route in SheetRoutes) {
      const { route, params } = activeSheetPage;
      NavigationControls.sheets.navigate(route as SheetRoutes, params);
    }
  }, [activeSheetPage]);

  const handleStackReady = () => {
    stackContainerProps.onReady?.();
    setCurrentRouteName(navigationRef.getCurrentRoute()?.name ?? '');
  };
  const handleStackStateChange = (
    state: Readonly<NavigationState> | undefined,
  ) => {
    stackContainerProps.onStateChange?.(state);
    setCurrentRouteName(navigationRef.getCurrentRoute()?.name ?? '');
  };

  useEffect(() => {
    if (activePage && activePage.route in StackRoutes) {
      const { route, params } = activePage;
      // Shallow-clone params before passing to navigationRef.navigate directly,
      // since NavigationControls.closeAndNavigate handles its own cloning but
      // the typedNavigate path below bypasses it.
      const clonedParams = params ? { ...params } : params;
      // TODO: Centralize immutable-safe params cloning in NavigationControls and
      // consider deep cloning nested params if routes start passing structured objects.

      // If a sheet is being opened in the same tick, navigate without closing sheets to avoid
      // resetting the sheet navigator back to Initial (e.g., RemoveAccountSuccess flow).
      if (activeSheetPageRef.current !== null && navigationRef.isReady()) {
        const typedNavigate = navigationRef.navigate as unknown as (
          screen: StackRoutes,
          params?: StackParameterList[StackRoutes],
        ) => void;

        typedNavigate(
          route as StackRoutes,
          clonedParams as StackParameterList[StackRoutes],
        );
        return;
      }

      NavigationControls.actions.closeAndNavigate(
        route as StackRoutes,
        clonedParams as StackParameterList[StackRoutes],
      );
    }
  }, [activePage]);

  useEffect(() => {
    setIsLoading(true);

    const loadStackPages = moduleInitProps.loadModules('addons.loadStackPages');
    const loadTabPages = moduleInitProps.loadModules('addons.loadTabPages');
    const loadGlobalOverlays = moduleInitProps.loadModules(
      'addons.loadGlobalOverlays',
    );
    const loadSheetPages = moduleInitProps.loadModules('addons.loadSheetPages');
    const loadMobileDeepLinks = moduleInitProps.loadModules(
      'addons.loadMobileDeepLinks',
    );

    const load = async () => {
      const stackPagesResult = await loadStackPages;
      const tabPagesResult = await loadTabPages;
      const globalOverlaysResult = await loadGlobalOverlays;
      const sheetPagesResult = await loadSheetPages;
      const [mobileDeepLinksResult] = await loadMobileDeepLinks;

      setPages({
        stackPages: stackPagesResult,
        tabPages: tabPagesResult,
        globalOverlays: globalOverlaysResult,
        sheetPages: sheetPagesResult,
      });
      setDeepLinks(mobileDeepLinksResult);
      setIsLoading(false);
    };

    void load();
  }, [moduleInitProps]);

  // Handle Android back button to close sheet instead of navigating back in the stack
  useEffect(() => {
    if (Platform.OS !== 'android' || isLoading) return;

    let backHandler: ReturnType<typeof BackHandler.addEventListener> | null =
      null;

    const handleBackPress = (): boolean => {
      try {
        const currentRoute = sheetNavigationRef.getCurrentRoute?.();
        const navigationState = sheetNavigationRef.getState?.();
        const isOnSheetPage =
          currentRoute?.name !== SheetRoutes.Initial &&
          currentRoute?.name !== undefined;

        // If we're on a sheet page (not Initial), handle the back press
        if (isOnSheetPage) {
          // Check if there's a navigation history (multiple sheets in stack)
          const canGoBack =
            navigationState && navigationState.routes.length > 1;

          if (canGoBack) {
            // Navigate back to previous sheet
            sheetNavigationRef.goBack();
            return true;
          }

          // Only one sheet in stack, close entire sheet navigation
          NavigationControls.sheets.close();
          return true;
        }

        return false; // Allow default back behavior
      } catch {
        return false;
      }
    };

    // Register immediately - BackHandler uses LIFO
    backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => {
      backHandler?.remove();
    };
  }, [isLoading]);

  const insets = useSafeAreaInsets();
  const styles = getStyles({ insets });

  const dialogsToRender = useMemo(() => {
    return dialogs
      .filter(({ location }) => !location || location.test(currentRouteName))
      .map(({ key, Dialog }) => <Dialog key={key} />);
  }, [dialogs, currentRouteName]);

  if (isLoading) return <Splash />;

  const initialRoute =
    walletNumber === 0 ? StackRoutes.OnboardingStart : StackRoutes.Home;

  return (
    <ConfigProvider
      viewId={moduleInitProps.viewId!}
      appConfig={moduleInitProps.runtime.config}>
      <>
        {dialogsToRender}
        <BaseTemplate>
          <View style={styles.insetsWrapper}>
            <NavigationContainer
              theme={navigationTheme}
              ref={navigationRef}
              onReady={handleStackReady}
              onStateChange={handleStackStateChange}
              linking={deepLinks}>
              <Stack.Navigator
                initialRouteName={initialRoute}
                screenListeners={stackScreenListeners}
                {...laceStackNavigatorProps}>
                {!!pages.tabPages && (
                  <Stack.Screen name={StackRoutes.Home}>
                    {renderHomeScreen}
                  </Stack.Screen>
                )}
                {pages.stackPages}
              </Stack.Navigator>
            </NavigationContainer>
          </View>
        </BaseTemplate>
        <NavigationContainer
          ref={sheetNavigationRef}
          onReady={sheetContainerProps.onReady}
          onStateChange={sheetContainerProps.onStateChange}>
          <SendProvider>
            <SheetStack.Navigator screenListeners={sheetScreenListeners}>
              <>
                <SheetStack.Screen
                  name={SheetRoutes.Initial}
                  component={InitialSheet}
                  key="initial-sheet-page"
                />
                {pages.sheetPages}
              </>
            </SheetStack.Navigator>
          </SendProvider>
        </NavigationContainer>
        {pages.globalOverlays}
        <GlobalToast toast={toast} onHide={hideToast} />
      </>
    </ConfigProvider>
  );
};

const getStyles = ({ insets }: { insets: EdgeInsets }) =>
  StyleSheet.create({
    insetsWrapper: {
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: isAndroid ? insets.bottom : 0,
    },
  });
