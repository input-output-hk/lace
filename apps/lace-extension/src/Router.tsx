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
import { BaseTemplate, GlobalToast, Splash } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { Home } from './Home';
import { useDispatchLaceAction, useLaceSelector } from './util/hooks';

import type { State, ModuleInitProps, ViewId } from '@lace-contract/module';
import type {
  NavigationState,
  StackParameterList,
  StackScreenProps,
} from '@lace-lib/navigation';

const InitialSheet = () => <></>;

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
  const [currentRouteName, setCurrentRouteName] = useState<string>('');

  const toast = useLaceSelector('ui.getToast');
  const hideToast = useDispatchLaceAction('ui.hideToast');

  const [isLoading, setIsLoading] = useState(true);

  const walletNumber = useSelector<State, number>(
    walletsSelectors.wallets.selectTotal,
  );
  // TODO: This is only a temporary workaround to enable navigation from side effects. Will be removed when we have a more robust implementation of the navigation system.
  const activeSheetPage = useSelector(viewsSelectors.views.getActiveSheetPage);
  const activePage = useSelector(viewsSelectors.views.getActivePage);
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
    // If a targetViewId is set, only the matching side panel should act.
    if (
      activeSheetPage?.targetViewId &&
      activeSheetPage.targetViewId !== viewId
    ) {
      return;
    }
    if (activeSheetPage === null) {
      NavigationControls.sheets.close();
    }
    if (activeSheetPage && activeSheetPage.route in SheetRoutes) {
      const { route, params } = activeSheetPage;
      NavigationControls.sheets.navigate(route as SheetRoutes, params);
    }
  }, [activeSheetPage, viewId]);

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
      <BaseTemplate>
        {dialogsToRender}
        <NavigationContainer
          theme={navigationTheme}
          ref={navigationRef}
          onReady={handleStackReady}
          onStateChange={handleStackStateChange}
          documentTitle={{ enabled: false }}>
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

        <NavigationContainer
          ref={sheetNavigationRef}
          onReady={sheetContainerProps.onReady}
          onStateChange={sheetContainerProps.onStateChange}
          documentTitle={{ enabled: false }}>
          <SendProvider>
            <SheetStack.Navigator screenListeners={sheetScreenListeners}>
              <>
                <SheetStack.Screen
                  name={SheetRoutes.Initial}
                  component={InitialSheet}
                />
                {pages.sheetPages}
              </>
            </SheetStack.Navigator>
          </SendProvider>
        </NavigationContainer>
        {pages.globalOverlays}
        <GlobalToast toast={toast} onHide={hideToast} />
      </BaseTemplate>
    </ConfigProvider>
  );
};
