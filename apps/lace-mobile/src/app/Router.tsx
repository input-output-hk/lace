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
  sheetStackScreenListeners,
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
  spacing,
  Splash,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
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
  SheetNavigationOptions,
  StackParameterList,
  StackScreenProps,
} from '@lace-lib/navigation';
import type { EdgeInsets } from 'react-native-safe-area-context';

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
  const { isSideMenu, theme } = useTheme();

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
    onNavigationReady: trackNavigationReady,
    onNavigationStateChange: trackNavigationStateChange,
  } = useNavigationObservability(navigationRef);

  const [currentRouteNameForDialogs, setCurrentRouteNameForDialogs] = useState<
    string | undefined
  >();

  const syncDialogRouteFromNavigationRef = useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }
    const route = navigationRef.getCurrentRoute();
    const next = route?.name as string | undefined;
    setCurrentRouteNameForDialogs(previous =>
      previous === next ? previous : next,
    );
  }, []);

  const onNavigationReady = useCallback(() => {
    trackNavigationReady();
    syncDialogRouteFromNavigationRef();
  }, [trackNavigationReady, syncDialogRouteFromNavigationRef]);

  const onNavigationStateChange = useCallback(
    (state: Readonly<NavigationState> | undefined) => {
      trackNavigationStateChange(state);
      syncDialogRouteFromNavigationRef();
    },
    [trackNavigationStateChange, syncDialogRouteFromNavigationRef],
  );

  useEffect(() => {
    activeSheetPageRef.current = activeSheetPage;
  }, [activeSheetPage]);

  // ORDER-SENSITIVE: the activePage (stack) effect MUST run before the
  // activeSheetPage (sheet) effect below. NavigationControls.navigate(stackRoute)
  // branches on what's currently on top: a sheet on top forces the
  // "dismiss-then-navigate" path. If the sheet opens first, the stack navigate
  // then tries to dismiss a sheet that's still animating open — the native
  // dismiss is dropped, the sheet wedges open, and closeSheet() (e.g. the
  // remove-account success footer button) can't recover it. Navigating the
  // stack first means no sheet is up yet (clean immediate navigate); the sheet
  // then opens on top in a dismissible state. See LW-15012.
  useEffect(() => {
    if (activePage && activePage.route in StackRoutes) {
      const { route, params } = activePage;

      const clonedParams = params ? { ...params } : params;
      // TODO: Centralize immutable-safe params cloning in NavigationControls and
      // consider deep cloning nested params if routes start passing structured objects.

      NavigationControls.navigate(
        route as StackRoutes,
        clonedParams as StackParameterList[StackRoutes],
      );
    }
  }, [activePage]);

  useEffect(() => {
    if (activeSheetPage === null) {
      NavigationControls.closeSheet();
    }
    if (activeSheetPage && activeSheetPage.route in SheetRoutes) {
      const { route, params } = activeSheetPage;
      NavigationControls.navigate(route as SheetRoutes, params);
    }
  }, [activeSheetPage]);

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
        const currentRoute = navigationRef.getCurrentRoute?.();
        const navigationState = navigationRef.getState?.();
        const currentRouteName = currentRoute?.name as string | undefined;
        const isRootStackRoute = currentRouteName === SheetRoutes.RootStack;
        const isOnSheetPage =
          currentRouteName !== undefined && !isRootStackRoute;

        // If we're on a sheet page (not RootStack), handle the back press
        if (isOnSheetPage) {
          // Check if there's a navigation history (multiple sheets in stack)
          const canGoBack =
            navigationState && navigationState.routes.length > 1;

          if (canGoBack) {
            // Navigate back to previous sheet
            navigationRef.goBack();
            return true;
          }

          // Only one sheet in stack, close entire sheet navigation
          NavigationControls.closeSheet();
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const styles = getStyles({ insets });

  const dialogsToRender = useMemo(() => {
    if (!currentRouteNameForDialogs) return null;
    return dialogs
      .filter(
        ({ location }) =>
          !location || location.test(currentRouteNameForDialogs),
      )
      .map(({ key, Dialog }) => <Dialog key={key} />);
  }, [dialogs, currentRouteNameForDialogs]);

  // Capture the initial route exactly once. `initialRouteName` is only honored
  // on first mount of the Stack.Navigator, and recomputing it would change the
  // `RootStack` identity and force React Navigation to remount the entire stack
  // mid-transition (e.g. when removing the last wallet), which can cause a
  // crash in `getRehydratedState` reading `.stale` on an undefined state.
  // After mount, navigation is driven by `setActivePage` side effects.
  const initialRouteRef = useRef<StackRoutes | null>(null);
  if (initialRouteRef.current === null) {
    initialRouteRef.current =
      walletNumber === 0 ? StackRoutes.OnboardingStart : StackRoutes.Home;
  }

  const RootStack = useCallback(
    () => (
      <Stack.Navigator
        initialRouteName={initialRouteRef.current ?? StackRoutes.Home}
        {...laceStackNavigatorProps}>
        {!!pages.tabPages && (
          <Stack.Screen name={StackRoutes.Home}>
            {(props: StackScreenProps<StackRoutes.Home>) => (
              <Home {...props}>{pages.tabPages}</Home>
            )}
          </Stack.Screen>
        )}
        {pages.stackPages}
      </Stack.Navigator>
    ),
    [pages.tabPages, pages.stackPages],
  );

  const sheetGroupScreenOptions: SheetNavigationOptions = useMemo(
    () => ({
      anchor: isSideMenu ? 'right' : 'center',
      backgroundColor: theme.background.page,
      cornerRadius: spacing.L,
      detents: isSideMenu ? [1] : ['auto'],
      dimmed: true,
      grabber: !isSideMenu,
      anchorOffset: spacing.S,
      detachedOffset: spacing.S,
      dismissible: true,
      detached: isSideMenu,
      maxContentHeight: isSideMenu ? windowHeight - spacing.S * 2 : undefined,
      maxContentWidth: isSideMenu ? windowWidth * 0.5 : undefined,
    }),
    [isSideMenu, theme.background.page, windowHeight, windowWidth],
  );

  if (isLoading) return <Splash />;

  return (
    <SendProvider>
      <ConfigProvider
        viewId={moduleInitProps.viewId!}
        appConfig={moduleInitProps.runtime.config}>
        <>
          {dialogsToRender}
          <TrueSheetProvider>
            <BaseTemplate>
              <View style={styles.insetsWrapper}>
                <NavigationContainer
                  theme={navigationTheme}
                  ref={navigationRef}
                  documentTitle={{ enabled: false }}
                  onReady={onNavigationReady}
                  onStateChange={onNavigationStateChange}
                  linking={deepLinks}>
                  <SheetStack.Navigator
                    screenListeners={sheetStackScreenListeners}>
                    <>
                      <SheetStack.Screen
                        name={SheetRoutes.RootStack}
                        component={RootStack}
                      />
                      <SheetStack.Group screenOptions={sheetGroupScreenOptions}>
                        {pages.sheetPages}
                      </SheetStack.Group>
                    </>
                  </SheetStack.Navigator>
                </NavigationContainer>
              </View>
            </BaseTemplate>
          </TrueSheetProvider>
          {pages.globalOverlays}
          <GlobalToast toast={toast} onHide={hideToast} />
        </>
      </ConfigProvider>
    </SendProvider>
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
