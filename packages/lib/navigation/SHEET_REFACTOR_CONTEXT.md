# Sheet System Migration — Context Document

> Companion reference for `LW-14628/sheet-library-migration`. This document
> captures _what_ was changed, _why_, and the patterns the codebase now follows
> so future work can be aligned without re-reading the entire diff.

## 1. Goal Of The Refactor

Replace the in-house, `@gorhom/bottom-sheet`-based sheet system (custom
`sheetNavigationRef`, custom `SheetControls`, custom `sheetNavigator.tsx`,
custom backdrop/scroll handling) with the official **True Sheet** React
Navigation integration:

- library: [`@lodev09/react-native-true-sheet`](https://sheet.lodev09.com/)
- React Navigation integration:
  `@lodev09/react-native-true-sheet/navigation` — exposes
  `createTrueSheetNavigator`, `TrueSheetScreenProps`,
  `TrueSheetNavigationOptions`, etc.

Outcome:

- one `NavigationContainer` for the whole app (was two)
- one `navigationRef` (was `navigationRef` + `sheetNavigationRef`)
- one nested navigation state tree containing stack + tabs + sheets
- native sheet presentation on iOS/Android via True Sheet
- web continues to use the Gorhom backdrop/scroll components only as the
  scroll surface inside the sheet body — there is no parallel web sheet
  navigator anymore

Diff stats: ~400 files changed, ~13.7K insertions / ~11.8K deletions.

## 2. Before vs After (Architectural Diff)

### Before

```text
NavigationContainer (stack)         NavigationContainer (sheet)
└── Stack.Navigator                 └── SheetStack.Navigator
    ├── Home (tabs)                     ├── SheetRoutes.Initial (empty)
    └── …addon stack pages              └── …addon sheet pages
```

- Two `NavigationContainer`s rendered side-by-side in the Router.
- Two refs: `navigationRef` for the stack, `sheetNavigationRef` for sheets.
- `NavigationControls.sheets.{navigate,close}` driven the sheet ref;
  `NavigationControls.actions.closeAndNavigate` orchestrated cross-tree
  navigation.
- `SheetRoutes.Initial` was a placeholder screen rendering `<></>` so the
  sheet navigator could be mounted with no visible sheet.
- Sheets were `@gorhom/bottom-sheet`-based React components composed via
  custom `sheet.tsx` / `sheet.web.tsx`, custom `useScrollEventsHandlers`,
  custom `SheetHeader` / `SheetFooter` / `useFooterHeight` molecules,
  imperative `sheetRef.isOpen`, `closeSheet`, `onCloseRequest`, etc.

### After

```text
NavigationContainer
└── SheetStack.Navigator                  (createTrueSheetNavigator)
    ├── SheetStack.Screen RootStack
    │   └── Stack.Navigator
    │       ├── Stack.Screen Home
    │       │   └── Tab.Navigator (Portfolio, DApps, …)
    │       └── …addon stack pages
    └── SheetStack.Group
        └── …addon sheet pages
```

- One container, one ref, one nested state tree.
- `SheetRoutes.RootStack` (renamed from `Initial`) is now a **real** screen
  that hosts the Stack.Navigator (which hosts the Tab.Navigator).
- Sheets are native True Sheet routes; presentation is configured via
  `screenOptions` on the `SheetStack.Group` (shared) and per-screen
  `options` (overrides) on each `SheetStack.Screen`.
- Sheets no longer own their own header/footer chrome — header/footer are
  registered via `navigation.setOptions({ header, footer })` from each
  sheet page component.

## 3. Package Changes

- `@lodev09/react-native-true-sheet@3.9.9` added at:
  - workspace `package.json`
  - `apps/lace-mobile/package.json`
  - `packages/lib/ui-toolkit/package.json`
- `react-native-screens@~4.16.0` added to `packages/lib/ui-toolkit` to back
  the new `SheetSafeOverlay`'s iOS implementation (`FullWindowOverlay`).
- `apps/lace-extension/webpack/base/common.webpack.config.js` stubs the
  modules that don't make sense on the extension's `react-native-web` build:
  - `@lodev09/react-native-true-sheet`
  - `react-native-screens`
    Both are aliased to `empty.js` because the extension reaches them
    transitively (via `SheetSafeOverlay`) but never renders them. The Expo
    mobile UI build still uses the real packages.

## 4. Navigation Library Changes (`packages/lib/navigation`)

### 4.1 Files removed

- `src/core/sheet-controls.ts`
- `src/core/sheetNavigator.tsx`
- `test/sheet-controls.test.ts`

### 4.2 Files updated

- `src/core/index.ts`

```43:65:packages/lib/navigation/src/core/index.ts
export type {
  StackNavigationProp,
  StackScreenProps,
  SheetScreenProps,
  NavigationContainerEventMap,
};

export {
  Tab,
  Stack,
  SheetStack,
  navigationRef,
  NavigationContainer,
  navigationTheme,
  useNavigation,
  useFocusEffect,
};

export { useNavigationObservability } from './navigation-observability';
export {
  NavigationControls,
  findLastRouteIndexByName,
  onSheetClose,
} from './navigation-controls';
export type { NavigateParams } from './navigation-controls';
```

`SheetStack` is now created with `createTrueSheetNavigator<SheetParameterList>()`.
The custom `SheetNavigator` from `sheetNavigator.tsx` is gone.

- `src/core/navigationReferences.ts`

`sheetNavigationRef` is gone. Only `navigationRef` remains; it is typed
against `SheetParameterList` (the root param list).

- `src/core/navigation-controls.ts`

The imperative API is simplified and unified. The new public surface is:

```ts
export const NavigationControls = {
  navigate: <T extends AppRoutes>(
    route: T,
    params?: RouteParams<T>,
    options?: NavigationOptions | SheetNavigationOptions,
  ): void,
  closeSheet: () => void,
};

export const onSheetClose = (listener: () => void): (() => void);
export const findLastRouteIndexByName = (...) : number;
```

Key behaviors implemented inside `navigate`:

1. **Sheet "popToExisting" semantics**: when navigating to a sheet route
   that is already lower in the sheet stack (e.g. `Send` is open under
   `AddAssets` and we navigate back to `Send` with new params), the
   navigator dispatches `StackActions.pop(N)` to pop down to the existing
   instance, then merges params via `CommonActions.setParams`. This avoids
   stacking duplicate sheet instances.
2. **setParamsOnly when target is focused**: navigating to the route you
   are already on becomes a `setParams` only, not a new push.
3. **Cross-presentation sheet-then-stack handling**: when navigating to a
   `StackRoutes.*` from inside a sheet, the controller first dismisses the
   sheet stack via `StackActions.popToTop()` and waits for the native
   dismiss to be reflected in state (with a `SHEET_DISMISS_FALLBACK_MS =
2000` safety timeout) before issuing the stack `navigate`. Without
   this, the stack push would be occluded by the still-presented modal
   on iOS/Android.
4. **`closeSheet()`**: unified across all platforms. Counts the
   dismissible sheet routes in the root state
   (`countDismissibleSheetRoutes`) and dispatches
   `StackActions.pop(count)` so the sheet navigator (web, iOS, Android)
   collapses back to `SheetRoutes.RootStack`. The previous
   `TrueSheet.dismissAll()` / `navigationRef.goBack()` split was
   removed; using one dispatch path keeps native and web behavior in
   sync and avoids leaving a sheet route in the navigation state while
   the native presentation is gone.
5. **`notifySheetCloseListeners()`** is fired on each navigate-from-sheet
   and on `closeSheet`. `onSheetClose(listener)` is exposed for code
   that needs to react to sheet dismissal (cleanups, redux, etc.).
6. **Deferred `setParams` after `popToExisting`**: param merging onto
   the resurfaced sheet route uses `setParamsWhenRouteFocused`, which
   waits for the navigation state to settle on the target before
   dispatching `CommonActions.setParams`. The previous `queueMicrotask`
   approach was racy when the dismiss/pop transition took longer than
   one tick.

Removed/no-longer-exposed:

- `NavigationControls.sheets.*` (delegated and removed; callers use
  `NavigationControls.navigate` / `closeSheet` directly).
- `NavigationControls.actions.closeAndNavigate` (the single
  `navigate(route, params)` now handles the close-sheet-then-navigate
  cascade automatically).

- `src/core/navigation-observability.ts`

Now exposes a single hook:

```ts
useNavigationObservability(navigationRef): {
  onNavigationReady: () => void;
  onNavigationStateChange: (state) => void;
}
```

The old API returned `stackContainerProps`, `sheetContainerProps`,
`stackScreenListeners`, `sheetScreenListeners` (because there were two
containers). With a single container, observability is wired through one
pair of callbacks; the tracker walks the nested state tree to identify
the active route and tags breadcrumbs with `navigator: 'sheet' | 'stack'`
based on whether the route is below or above the `RootStack` boundary.

`trackNavigationAction` is exported and used internally by
`navigation-controls.ts` to emit `navigation.action` breadcrumbs for
`navigate`/`popToExisting`/`setParamsOnly` strategies.

### 4.3 Routes and types

- `SheetRoutes.Initial` → `SheetRoutes.RootStack` (the nested stack host).
- `SheetParameterList` adds `[SheetRoutes.RootStack]:
NavigatorScreenParams<StackParameterList>`. Imperative navigation to a
  stack route is implemented internally by navigating to
  `SheetRoutes.RootStack` with `{ screen, params }`.
- `RootParamList` is globally augmented to `extends SheetParameterList`
  (see `src/types/navigation.d.ts`).

Screen prop helpers:

```ts
export type StackScreenProps<T> = CompositeScreenProps<
  ReactNavigationStackScreenProps<StackParameterList, T>,
  TrueSheetScreenProps<SheetParameterList, SheetRoutes.RootStack>
>;
export type TabScreenProps<T> = CompositeScreenProps<
  BottomTabScreenProps<TabParameterList, T>,
  StackScreenProps<StackRoutes.Home>
>;
export type SheetScreenProps<T> = TrueSheetScreenProps<SheetParameterList, T>;
export type { TrueSheetNavigationOptions as SheetNavigationOptions };
```

- `ExtendableSheetParams` is the augmentation seam for module-defined
  sheet params (current built-in consumer: `SheetRoutes.SelectAccount`).

The package's `README.md` was rewritten to match this architecture and is
the canonical reference.

## 5. UI Toolkit Changes (`packages/lib/ui-toolkit`)

### 5.1 Sheet organism (`organisms/sheet/sheet.tsx`)

The `Sheet` organism was rewritten and de-scoped. It is no longer a
modal/bottom sheet container — that is the navigator's job now. It is
purely the **content chrome** used inside True Sheet screens.

New shape:

```ts
export const Sheet = Object.assign(SheetContainer, {
  Header, // <Sheet.Header title leftIcon leftIconOnPress subtitle …/>
  Footer, // <Sheet.Footer primaryButton secondaryButton vertical …/>
  Scroll, // <Sheet.Scroll>…</Sheet.Scroll>  (web: BottomSheetScrollView, native: ScrollView)
});

export const footerHeight = {
  horizontal: isWeb ? 80 : 100,
  vertical: isWeb ? 115 : 200,
  titleRow: 70,
};
```

Removed:

- `sheet.web.tsx` (web-specific BottomSheet wrapper)
- `useScrollEventsHandlers.ts`
- `SheetProps` / `Sheet` interface that exposed `BottomSheet`-style
  imperative APIs (`isOpen`, `closeSheet`, `onCloseRequest`,
  `enableBackdrop`, `enablePanDownToClose`, `initialIndex`, …)

The molecule-level wrappers `SheetHeader`, `SheetFooter`, and the
`useFooterHeight` hook are no longer used by templates. Templates import
`Sheet.Header` / `Sheet.Footer` and the constant `footerHeight` from the
organism directly.

The `getAssetImageUrl` helper is now used inside the `Header` to render
the optional `headerAvatar`.

On web, `Sheet.Header` also renders an absolute-positioned `Cancel`
icon button (`testID="side-sheet-close-button"`) to give the user an
explicit close affordance — web has no grabber/drag-to-dismiss. The
button calls `useTrueSheet().dismissAll()` by default, or an optional
`handleClose` callback when the page needs custom cleanup. On native
the existing grabber/backdrop dismissal is used and the close button
is not rendered.

### 5.2 New molecule: `SheetSafeOverlay`

```1:46:packages/lib/ui-toolkit/src/design-system/molecules/sheetSafeOverlay/sheetSafeOverlay.tsx
import type { ReactNode } from 'react';
import type { ModalProps } from 'react-native';

import React from 'react';
import { Modal, Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type SheetSafeOverlayProps = Pick<ModalProps, 'animationType'> & {
  visible?: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
};

export const SheetSafeOverlay = ({
  visible = true,
  onRequestClose,
  animationType = 'fade',
  children,
}: SheetSafeOverlayProps) => {
  if (!visible) return null;

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }

  return (
    <Modal
      animationType={animationType}
      transparent
      visible
      onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
};
```

Why it exists: a presented True Sheet on iOS lives in its own
`UIPresentationController` / `UIWindow`, which is _above_ any React Native
`Modal` rendered from the regular React tree. To put a modal (e.g. the
generic `Modal` molecule, dialogs, confirmations) above an open sheet on
iOS, we must use `react-native-screens`'s `FullWindowOverlay`, which
renders into a separate UIWindow at the OS level. On Android and web the
existing `Modal` (with `transparent`) already sits above the sheet's
native container.

The `Modal` molecule was rewritten to render its overlay through
`SheetSafeOverlay`, so existing `Modal` consumers automatically appear
above any open sheet on every platform. Reference:
[True Sheet overlays guide](https://sheet.lodev09.com/guides/overlays).

### 5.3 Templates

The vast majority of sheet templates under
`packages/lib/ui-toolkit/src/design-system/templates/sheets/*` were rewritten
to the new pattern. Two notable structural changes per template:

1. They no longer render their own `SheetHeader` / `SheetFooter`. The
   template returns the body of the sheet only. Header/footer are now the
   sheet **page**'s responsibility (it sets them via
   `navigation.setOptions`, see §6 below). The reasoning: True Sheet
   exposes `header` and `footer` slots on the navigator screen options;
   doing this at the page level keeps the template purely presentational
   and lets pages compose buttons/labels around live state.
2. Templates use the new `footerHeight.{horizontal,vertical,titleRow}`
   constants for `paddingBottom` of their scroll surface so the content
   does not slide under the footer.

Other simplifications:

- `useFooterHeight` is gone; constants from `organisms/sheet/sheet.tsx`
  replace it (`footerHeight.horizontal`, etc.).
- Templates no longer accept `title`, `onClose`, `onConfirm`,
  `cancelLabel`, `confirmLabel` props — those are pushed up to the page.
- `recoveryPhraseDisplaySheet` template was deleted (duplicated by
  `recoveryPhraseSheet`).

## 6. The New Sheet Page Pattern (in `packages/module/*`)

Every sheet across the app was migrated. A sheet "page" is a
`SheetStack.Screen` component declared by a module's
`addons/sheetPages.tsx`. The canonical pattern is:

```tsx
import { Sheet, NetworkSelectionSheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

import { useNetworkSheet } from './useNetworkSheet';

export const NetworkSheet = ({
  navigation,
}: SheetScreenProps<SheetRoutes.NetworkSelection>) => {
  const props = useNetworkSheet();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={props.title} testID="…-header" />,
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: props.cancelLabel,
            onPress: props.onClose,
            testID: '…-cancel-button',
          }}
          primaryButton={{
            label: props.confirmLabel,
            onPress: props.onConfirm,
            testID: '…-confirm-button',
          }}
        />
      ),
    });
  }, [navigation, props.title, props.cancelLabel, …]);

  return <NetworkSelectionSheet {...props} />;
};
```

Conventions that the migration enforced:

- **Sheet page = thin component**: pull data and callbacks from a
  `use<SheetName>()` hook, then render the ui-toolkit template.
- **Header/footer via `setOptions`**: configured in a `useEffect` /
  `useLayoutEffect`. The dependency array must include any value that
  appears inside the header/footer (labels, callbacks, flags).
- **Close uses `NavigationControls.closeSheet()`**: hooks dispatch
  cleanup and call `NavigationControls.closeSheet()`; on native this is
  `TrueSheet.dismissAll()`, on web `navigationRef.goBack()`.
- **Cross-sheet navigation uses `NavigationControls.navigate(SheetRoutes.X,
params)`**: the controller handles popping-to-existing when applicable
  and merges params transparently.
- **Stack navigation from a sheet uses
  `NavigationControls.navigate(StackRoutes.X, params)`**: the controller
  internally dismisses any open sheet first.
- **`preventClose` is exposed via setOptions**: e.g. `SendResult` sets
  `navigation.setOptions({ preventClose: shouldPreventClose })` while a
  transaction is processing, to prevent the user from dismissing the
  sheet via gesture/backdrop.

### Module-level imperative navigation helper

Some flows still need a one-shot side-effect-aware imperative wrapper.
`send-flow` is a representative example:

```ts
// packages/module/send-flow/src/hooks/useSendFlowNavigation.ts
let isNavigatingWithinSendFlow = false;

export const useSendFlowNavigation = () => {
  const dispatchClosed = useDispatchLaceAction('sendFlow.closed', true);
  const { resetSendFlow } = useSendFlow();

  const navigate = useCallback(
    <T extends SheetRoutes>(...args: NavigateParams<T>) => {
      isNavigatingWithinSendFlow = true;
      NavigationControls.navigate(...args);
    },
    [],
  );

  useEffect(() => {
    isNavigatingWithinSendFlow = false;
  }, []);
  useEffect(
    () => () => {
      if (!isNavigatingWithinSendFlow) {
        dispatchClosed();
        resetSendFlow();
      }
    },
    [dispatchClosed, resetSendFlow],
  );

  return { navigate };
};
```

The pattern distinguishes "this screen unmounted because we navigated to
another send-flow screen" from "this screen unmounted because the sheet
was dismissed". This is needed because the True Sheet navigator unmounts
the previous sheet on push and on dismiss, so an unmount alone is not a
reliable "sheet closed" signal.

### Addon registration (`addons/sheetPages.tsx`)

Each module exports its sheet pages through a `sheetPages` addon:

```tsx
const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="staking-center-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.BrowsePool}
      component={BrowsePoolSheet}
      options={{ detents: [1], scrollable: true }}
    />
    <SheetStack.Screen
      name={SheetRoutes.StakingIssue}
      component={StakingIssueSheet}
    />
    {/* … */}
  </React.Fragment>
);
```

Notable `options` keys used across the migrated modules (all are True
Sheet `TrueSheetNavigationOptions`):

- `detents: [1]` — full-height sheet (full content takes the available
  height detent slot).
- `detents: ['auto']` — auto-sized to content height.
- `scrollable: true` — the sheet body is scrollable; the navigator
  manages keyboard interaction and gesture handoff with the scroll view.

Shared sheet options (anchor, backgroundColor, cornerRadius, grabber,
dimmed, etc.) come from the router-level `SheetStack.Group`
`screenOptions`. Per-screen `options` override them when needed.

## 7. Router Wiring

Both `apps/lace-mobile/src/app/Router.tsx` and
`apps/lace-extension/src/Router.tsx` were rewritten to use the new
single-container, single-ref architecture.

Key elements:

- One `NavigationContainer`, one `navigationRef`.
- Wrapped in `TrueSheetProvider` (from `@lodev09/react-native-true-sheet`)
  so True Sheet can register its native presentation root.
- The first/only navigator inside the container is the `SheetStack.Navigator`,
  with two parts:
  - `SheetStack.Screen name={SheetRoutes.RootStack} component={RootStack}`
    where `RootStack` renders the `Stack.Navigator` (Home/onboarding/etc.)
    and the Tab.Navigator under `Home`.
  - `SheetStack.Group screenOptions={sheetGroupScreenOptions}` containing
    `pages.sheetPages` from all module addons.
- `sheetGroupScreenOptions` adapts to layout size via
  `useTheme()`'s `isSideMenu`:
  - extension/side-menu form factor: anchored right, detached, custom max
    width/height.
  - phone form factor: bottom, full width, grabber visible, `['auto']`
    detents.
  - extension popup/full-window form factor: `maxContentHeight =
windowHeight * 0.92` so the sheet never grows past the popup
    chrome bounds.
- Duplicate sheet routes are prevented by `popToExisting` inside
  `NavigationControls.navigate` (see §4.2). The earlier
  `screenOptions={{ stackBehavior: 'replace' }}` on the root
  `SheetStack.Navigator` was removed because it interfered with
  legitimate push-then-pop flows; the imperative controller is now the
  single source of truth for de-duplication.
- The initial route is captured **once** in a `useRef`:

```tsx
const initialRouteRef = useRef<StackRoutes | null>(null);
if (initialRouteRef.current === null) {
  initialRouteRef.current =
    walletNumber === 0 ? StackRoutes.OnboardingStart : StackRoutes.Home;
}
```

Reason: `initialRouteName` is only honored on first mount of the
`Stack.Navigator`. Recomputing it would change `RootStack`'s identity and
force React Navigation to remount the whole stack mid-transition (e.g.
when removing the last wallet), which can crash inside
`getRehydratedState` reading `.stale` on an undefined state. After mount,
navigation is driven by `setActivePage` side effects.

- Observability is unified through one `useNavigationObservability` call.
  An additional local `setCurrentRouteNameForDialogs` state derived from
  the same callbacks decouples dialog filtering from the legacy
  per-container `currentRouteName` state.

- Android back handling (mobile-only):

```ts
const handleBackPress = (): boolean => {
  const currentRoute = navigationRef.getCurrentRoute?.();
  const navigationState = navigationRef.getState?.();
  const isRootStackRoute = currentRoute?.name === SheetRoutes.RootStack;
  const isOnSheetPage = currentRoute?.name !== undefined && !isRootStackRoute;

  if (isOnSheetPage) {
    const canGoBack =
      (navigationState as NavigationState | undefined)?.routes?.length > 1;
    if (canGoBack) {
      navigationRef.goBack();
      return true;
    }
    NavigationControls.closeSheet();
    return true;
  }
  // fallback: let RN handle stack back behavior
  return false;
};
```

- Side-effect-driven navigation from `viewsSelectors`:

```ts
useEffect(() => {
  if (activeSheetPage === null) NavigationControls.closeSheet();
  if (activeSheetPage && activeSheetPage.route in SheetRoutes) {
    const { route, params } = activeSheetPage;
    NavigationControls.navigate(route as SheetRoutes, params);
  }
}, [activeSheetPage]);

useEffect(() => {
  if (activePage && activePage.route in StackRoutes) {
    const { route, params } = activePage;
    NavigationControls.navigate(
      route as StackRoutes,
      { ...(params ?? {}) } as StackParameterList[StackRoutes],
    );
  }
}, [activePage]);
```

The previous `closeAndNavigate` + the parallel `typedNavigate` fallback are
gone; the new `NavigationControls.navigate` handles both close-then-stack
and pure sheet navigation.

## 8. ADR / Documentation Updates

- `docs/adr/07-use-react-navigation-for-sheets.md` — refreshed example
  to use `NavigationControls.navigate` / `closeSheet` (no more
  `NavigationControls.sheets.*`).
- `docs/adr/24-guard-tab-sheet-navigation-with-isfocused.md` — refreshed
  for the unified `NavigationControls` API. The rule remains: any
  callback inside a tab screen that calls
  `NavigationControls.navigate(SheetRoutes.X)` must guard with
  `navigation.isFocused()` to avoid iOS RNGH touch-through on inactive
  tab screens.
- `packages/lib/navigation/README.md` — rewritten as the canonical
  reference for the new tree, helpers, and creation flow.

## 9. Tests

- `packages/lib/navigation/test/sheet-controls.test.ts` deleted.
- `packages/lib/navigation/test/navigation-controls.test.ts` rewritten to
  cover the new behavior, including:
  - `findLastRouteIndexByName` (helper for the popToExisting strategy)
  - `navigate` with stack and sheet targets
  - `popToExisting` + param merging
  - `setParamsOnly` when target route is already focused
  - `closeSheet` on web (uses `goBack`) and noop when current route is
    not a sheet route
- Multiple module-level test files were updated to exercise the new
  imperative API (`NavigationControls.navigate(SheetRoutes.X)` rather
  than `NavigationControls.sheets.navigate(...)`).

## 10. Gotchas / Patterns To Preserve

1. **Always use `NavigationControls.navigate` / `closeSheet`**. The old
   `NavigationControls.sheets.*` and `NavigationControls.actions.closeAndNavigate`
   surfaces no longer exist.
2. **Sheets are routes, not components**. Do not render a `<Sheet …>`
   anywhere outside the navigator. The native presentation is provided
   by the True Sheet navigator when the route is active.
3. **Tab-page sheet navigation needs `navigation.isFocused()`** — see ADR 24.
4. **Header/footer live on the page**, configured via
   `navigation.setOptions({ header, footer })`. Templates render the body
   only.
5. **`SheetSafeOverlay` for any modal/dialog that must appear above a
   sheet on iOS**. The generic `Modal` molecule already does this — reach
   for `SheetSafeOverlay` directly when building bespoke overlays.
6. **Sheet stack identity matters**. Do not recompute `initialRouteName`
   for the inner `Stack.Navigator` after mount. Capture it in a ref. See
   §7.
7. **The extension webpack stubs `react-native-screens` and
   `@lodev09/react-native-true-sheet`** — keep imports
   tree-shake-friendly and do not call sheet APIs from code paths that
   run in service workers or content scripts.
8. **`onSheetClose(listener)`** is available for code that needs to react
   to sheet dismissal but cannot subscribe via component lifecycle (e.g.
   side effects, sagas, observables).
9. **Side-effect navigation continues to work via Redux-driven
   `activeSheetPage` / `activePage`**, but now goes through the single
   `NavigationControls.navigate` path.
10. **`SheetRoutes.Initial` is removed**. References must be migrated to
    `SheetRoutes.RootStack` (and remember that `RootStack` is _not_ a
    dismissible sheet — `closeSheet` deliberately ignores it).

## 11. Source-Of-Truth Files

If this document drifts, the authoritative references are:

- `packages/lib/navigation/src/core/index.ts`
- `packages/lib/navigation/src/core/navigation-controls.ts`
- `packages/lib/navigation/src/core/navigation-observability.ts`
- `packages/lib/navigation/src/core/navigationReferences.ts`
- `packages/lib/navigation/src/types/routes.ts`
- `packages/lib/navigation/src/types/index.ts`
- `packages/lib/navigation/src/types/navigation.d.ts`
- `packages/lib/navigation/README.md`
- `packages/lib/ui-toolkit/src/design-system/organisms/sheet/sheet.tsx`
- `packages/lib/ui-toolkit/src/design-system/molecules/sheetSafeOverlay/sheetSafeOverlay.tsx`
- `apps/lace-mobile/src/app/Router.tsx`
- `apps/lace-extension/src/Router.tsx`
- `apps/lace-extension/webpack/base/common.webpack.config.js`
- `docs/adr/07-use-react-navigation-for-sheets.md`
- `docs/adr/24-guard-tab-sheet-navigation-with-isfocused.md`
