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
import { useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';

import { Home } from './Home';
import { useDispatchLaceAction, useLaceSelector } from './util/hooks';

import type { State, ModuleInitProps, ViewId } from '@lace-contract/module';
import type {
  NavigationState,
  SheetNavigationOptions,
  StackParameterList,
  StackScreenProps,
} from '@lace-lib/navigation';

export const Router = ({
  moduleInitProps,
  viewId,
}: {
  moduleInitProps: ModuleInitProps;
  viewId: ViewId;
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

  const toast = useLaceSelector('ui.getToast');
  const hideToast = useDispatchLaceAction('ui.hideToast');

  const [isLoading, setIsLoading] = useState(true);
  const { isSideMenu, theme } = useTheme();

  const walletNumber = useSelector<State, number>(
    walletsSelectors.wallets.selectTotal,
  );
  // TODO: This is only a temporary workaround to enable navigation from side effects. Will be removed when we have a more robust implementation of the navigation system.
  const activeSheetPage = useSelector(viewsSelectors.views.getActiveSheetPage);
  const activePage = useSelector(viewsSelectors.views.getActivePage);
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

      NavigationControls.navigate(
        route as StackRoutes,
        clonedParams as StackParameterList[StackRoutes],
      );
    }
  }, [activePage]);

  useEffect(() => {
    // If a targetViewId is set, only the matching side panel should act.
    if (
      activeSheetPage?.targetViewId &&
      activeSheetPage.targetViewId !== viewId
    ) {
      return;
    }
    if (activeSheetPage === null) {
      NavigationControls.closeSheet();
    }
    if (activeSheetPage && activeSheetPage.route in SheetRoutes) {
      const { route, params } = activeSheetPage;
      NavigationControls.navigate(route as SheetRoutes, params);
    }
  }, [activeSheetPage, viewId]);

  useEffect(() => {
    setIsLoading(true);

    const loadStackPages = moduleInitProps.loadModules('addons.loadStackPages');
    const loadTabPages = moduleInitProps.loadModules('addons.loadTabPages');
    const loadGlobalOverlays = moduleInitProps.loadModules(
      'addons.loadGlobalOverlays',
    );
    const loadSheetPages = moduleInitProps.loadModules('addons.loadSheetPages');

    const load = async () => {
      const stackPagesResult = await loadStackPages;
      const tabPagesResult = await loadTabPages;
      const globalOverlaysResult = await loadGlobalOverlays;
      const sheetPagesResult = await loadSheetPages;

      setPages({
        stackPages: stackPagesResult,
        tabPages: tabPagesResult,
        globalOverlays: globalOverlaysResult,
        sheetPages: sheetPagesResult,
      });
      setIsLoading(false);
    };

    void load();
  }, [moduleInitProps]);

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

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

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
      maxContentHeight: isSideMenu
        ? windowHeight - spacing.S * 2
        : windowHeight * 0.92,
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
          <TrueSheetProvider>
            <BaseTemplate>
              {dialogsToRender}
              <NavigationContainer
                theme={navigationTheme}
                ref={navigationRef}
                documentTitle={{ enabled: false }}
                onReady={onNavigationReady}
                onStateChange={onNavigationStateChange}>
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
              {pages.globalOverlays}
            </BaseTemplate>
          </TrueSheetProvider>
          <GlobalToast toast={toast} onHide={hideToast} />
        </>
      </ConfigProvider>
    </SendProvider>
  );
};
