# @lace-lib/navigation

Navigation primitives and helpers for the Lace platform. The package combines
React Navigation stacks and tabs with a True Sheet root navigator so the app has
one navigation container, one navigation ref, and one nested state tree.

## Overview

The current navigation architecture is:

- one `NavigationContainer`
- one `navigationRef`
- one root `SheetStack.Navigator`
- one nested `Stack.Navigator` hosted under `SheetRoutes.RootStack`
- one tab navigator rendered by the `Home` stack screen

This means stack screens, tab screens, and sheets all live in the same
navigation state tree. Imperative navigation is routed through the same root ref
regardless of whether the target is a stack route or a sheet route.

## Architecture

### Navigation Tree

```text
NavigationContainer
└── SheetStack.Navigator
    ├── SheetStack.Screen(name: SheetRoutes.RootStack)
    │   └── Stack.Navigator
    │       ├── Stack.Screen(name: StackRoutes.Home)
    │       │   └── Tab.Navigator
    │       │       ├── Portfolio
    │       │       ├── DApps
    │       │       ├── Settings
    │       │       ├── Accounts
    │       │       ├── Support
    │       │       ├── About
    │       │       ├── Contacts
    │       │       ├── StakingCenter
    │       │       ├── IdentityCenter
    │       │       └── NotificationCenter
    │       └── Additional stack pages from addons
    └── SheetStack.Group
        └── Sheet pages from addons
```

In the app routers this is mounted once and the sheet navigator is the real
root:

```tsx
<NavigationContainer ref={navigationRef} theme={navigationTheme}>
  <SendProvider>
    <SheetStack.Navigator>
      <SheetStack.Screen name={SheetRoutes.RootStack} component={RootStack} />
      <SheetStack.Group screenOptions={sheetGroupScreenOptions}>
        {pages.sheetPages}
      </SheetStack.Group>
    </SheetStack.Navigator>
  </SendProvider>
</NavigationContainer>
```

### Navigation References

There is a single imperative ref:

```ts
export const navigationRef = createNavigationContainerRef<SheetParameterList>();
```

`SheetParameterList` is the root param list. Stack navigation is nested under:

```ts
[SheetRoutes.RootStack]: NavigatorScreenParams<StackParameterList>;
```

That is why imperative navigation to a stack screen is implemented by
navigating to `SheetRoutes.RootStack` with nested `screen` and `params`.

### How Pages Are Loaded

Navigation pages are loaded from module addons:

- `loadStackPages`
- `loadTabPages`
- `loadGlobalOverlays`
- `loadSheetPages`

The routers load those addon outputs and inject them into the appropriate place
in the tree.

## Public Exports

Main exports from this package:

- `NavigationContainer`
- `navigationRef`
- `navigationTheme`
- `NavigationControls`
- `useNavigation`
- `useFocusEffect`
- `useNavigationObservability`
- `Tab`
- `Stack`
- `SheetStack`
- route enums and screen prop types from `src/types`

## Route Types

The source of truth for route names is:

- `packages/lib/navigation/src/types/routes.ts`
- `packages/lib/navigation/src/types/index.ts`

### Tab Routes

```ts
export enum TabRoutes {
  Portfolio = 'Portfolio',
  DApps = 'DApps',
  Settings = 'Settings',
  AccountCenter = 'Accounts',
  Support = 'Support',
  About = 'About',
  Contacts = 'Contacts',
  StakingCenter = 'StakingCenter',
  IdentityCenter = 'IdentityCenter',
  NotificationCenter = 'NotificationCenter',
}
```

### Stack Routes

Representative stack routes:

```ts
export enum StackRoutes {
  Home = 'Home',
  AccountDetails = 'AccountDetails',
  WalletSettings = 'WalletSettings',
  AddWallet = 'AddWallet',
  OnboardingStart = 'OnboardingStart',
  OnboardingRestoreWallet = 'OnboardingRestoreWallet',
  OnboardingCreateWallet = 'OnboardingCreateWallet',
  OnboardingDesktopLogin = 'OnboardingDesktopLogin',
  OnboardingHardware = 'OnboardingHardware',
  DappExternalWebView = 'DappExternalWebView',
  ClaimPayload = 'ClaimPayload',
  ClaimSuccess = 'ClaimSuccess',
  ClaimError = 'ClaimError',
  IntroStart = 'IntroStart',
  IntroLace = 'IntroLace',
  IntroProof = 'IntroProof',
  IntroPrivacy = 'IntroPrivacy',
  IntroComplete = 'IntroComplete',
  NotificationDetails = 'NotificationDetails',
}
```

### Sheet Routes

The sheet navigator owns the real root route plus all sheet screens:

```ts
export enum SheetRoutes {
  RootStack = 'RootStack',
  AddAccount = 'AddAccount',
  CreateNewWallet = 'CreateNewWallet',
  RemoveAccount = 'RemoveAccount',
  AuthorizedDApps = 'AuthorizedDApps',
  Receive = 'Receive',
  Send = 'Send',
  ReviewTransaction = 'ReviewTransaction',
  AccountKey = 'AccountKey',
  RecoveryPhrase = 'RecoveryPhrase',
  Buy = 'Buy',
  ThemeSelection = 'ThemeSelection',
  Language = 'Language',
  NetworkSelection = 'NetworkSelection',
  ActivityDetail = 'ActivityDetail',
  EditWallet = 'EditWallet',
  ContactDetails = 'ContactDetails',
  SignData = 'SignData',
  SignTx = 'SignTx',
  // ... many more, see routes.ts
}
```

Do not assume `SheetRoutes.Initial` exists. The nested stack host is now
`SheetRoutes.RootStack`.

## Screen Prop Types

The library exports screen prop helpers that match the current nesting model:

```ts
export type StackScreenProps<T extends keyof StackParameterList> =
  CompositeScreenProps<
    ReactNavigationStackScreenProps<StackParameterList, T>,
    TrueSheetScreenProps<SheetParameterList, SheetRoutes.RootStack>
  >;

export type TabScreenProps<T extends keyof TabParameterList> =
  CompositeScreenProps<
    BottomTabScreenProps<TabParameterList, T>,
    StackScreenProps<StackRoutes.Home>
  >;

export type SheetScreenProps<T extends keyof SheetParameterList> =
  TrueSheetScreenProps<SheetParameterList, T>;
```

This matches the actual tree:

- a tab screen can navigate within tabs and to parent stack routes
- a stack screen can navigate within the stack and still has access to the
  parent sheet navigator
- a sheet screen uses True Sheet screen props directly

React Navigation recommends keeping navigation types close to the actual owning
navigator and using composed screen props for nested navigators. See the
[React Navigation TypeScript guide](https://reactnavigation.org/docs/typescript/).

### Global Root Param List

The package also augments React Navigation's root type:

```ts
declare global {
  namespace ReactNavigation {
    interface RootParamList extends SheetParameterList {}
  }
}
```

That keeps root-aware APIs aligned with the real root navigator.

## NavigationControls

`NavigationControls` is the supported imperative API for side effects and other
places where you do not have direct access to a screen's `navigation` prop.

### Navigate To A Stack Screen

```ts
NavigationControls.navigate(StackRoutes.AccountDetails, {
  walletId: 'wallet123',
  accountId: 'account456',
});
```

Internally this becomes:

```ts
navigation.navigate(SheetRoutes.RootStack, {
  screen: StackRoutes.AccountDetails,
  params: { walletId: 'wallet123', accountId: 'account456' },
});
```

### Navigate To A Sheet

```ts
NavigationControls.navigate(SheetRoutes.RemoveAccount, {
  walletId: 'wallet123',
  accountId: 'account456',
});
```

### Close The Current Sheet

```ts
NavigationControls.closeSheet();
```

`closeSheet()` calls `goBack()` when the current route is a sheet route. It does
not treat `SheetRoutes.RootStack` as a dismissible sheet.

### Close Then Navigate

```ts
NavigationControls.closeAndNavigate(StackRoutes.WalletSettings, {
  walletId: 'wallet123',
});
```

### Compatibility Helpers

The nested `sheets` API still exists for compatibility:

```ts
NavigationControls.navigate(SheetRoutes.Send);
NavigationControls.closeSheet();
```

Notes:

- `sheets.navigate()` delegates to `NavigationControls.navigate()`
- `sheets.close()` delegates to `closeSheet()`
- `sheets.isOpen()` checks whether the current route is a sheet route other than
  `RootStack`
- `sheets.expand()` is currently a no-op compatibility hook

## Navigation Options

Imperative navigation options currently support:

```ts
type NavigationOptions = {
  merge?: boolean;
  pop?: boolean;
  reset?: boolean;
  preventCloseOnTransition?: boolean;
};
```

For sheet presentation options on actual sheet screens, use
`SheetNavigationOptions`, which aliases True Sheet navigator options:

```ts
export type { TrueSheetNavigationOptions as SheetNavigationOptions };
```

Routers commonly apply shared sheet options through `SheetStack.Group`.

## Using Screen Navigation In Components

Prefer screen props whenever you are inside a screen component.

### Stack Screen Example

```tsx
import { StackRoutes, type StackScreenProps } from '@lace-lib/navigation';

export const WalletSettings = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.WalletSettings>) => {
  const { walletId } = route.params;

  return <Button title="Go Back" onPress={() => navigation.goBack()} />;
};
```

### Tab Screen Example

```tsx
import {
  StackRoutes,
  TabRoutes,
  type TabScreenProps,
} from '@lace-lib/navigation';

export const AccountCenter = ({
  navigation,
}: TabScreenProps<TabRoutes.AccountCenter>) => {
  return (
    <Button
      title="Wallet Settings"
      onPress={() =>
        navigation.navigate(StackRoutes.WalletSettings, {
          walletId: 'wallet123',
        })
      }
    />
  );
};
```

### Sheet Screen Example

```tsx
import {
  NavigationControls,
  SheetRoutes,
  type SheetScreenProps,
} from '@lace-lib/navigation';

export const RemoveAccount = ({
  route,
}: SheetScreenProps<SheetRoutes.RemoveAccount>) => {
  const { walletId, accountId } = route.params;

  return (
    <Button title="Close" onPress={() => NavigationControls.closeSheet()} />
  );
};
```

## Extending Sheet Params

`ExtendableSheetParams` exists for module augmentation of selected sheet params.
The current built-in consumer is `SheetRoutes.SelectAccount`:

```ts
export interface ExtendableSheetParams {}

type ExtendedParams<K extends string> = K extends keyof ExtendableSheetParams
  ? ExtendableSheetParams[K]
  : Record<string, never>;

export type SheetParameterList = {
  [SheetRoutes.SelectAccount]: ExtendedParams<'SelectAccount'>;
};
```

Modules can augment it like this:

```ts
declare module '@lace-lib/navigation' {
  interface ExtendableSheetParams {
    SelectAccount: {
      accountId: string;
      source: 'send' | 'staking';
    };
  }
}
```

## Creating A New Screen

### 1. Add The Route

Choose the owning navigator and add the route to
`packages/lib/navigation/src/types/routes.ts`.

```ts
export enum SheetRoutes {
  RootStack = 'RootStack',
  YourNewSheet = 'YourNewSheet',
}
```

### 2. Add The Params

Update `packages/lib/navigation/src/types/index.ts`.

```ts
export type SheetParameterList = {
  [SheetRoutes.RootStack]: NavigatorScreenParams<StackParameterList>;
  [SheetRoutes.YourNewSheet]: {
    title: string;
  };
};
```

### 3. Create The Screen

```tsx
import type { SheetScreenProps } from '@lace-lib/navigation';

export const YourNewSheet = ({
  route,
}: SheetScreenProps<SheetRoutes.YourNewSheet>) => {
  return <Text>{route.params.title}</Text>;
};
```

### 4. Export It Through Addons

```tsx
// packages/module/your-module/src/addons/loadSheetPages.tsx
import { SheetRoutes, SheetStack } from '@lace-lib/navigation';

export const loadSheetPages = () => (
  <SheetStack.Screen name={SheetRoutes.YourNewSheet} component={YourNewSheet} />
);
```

Equivalent addon hooks exist for stack pages, tab pages, and global overlays.

## Router Notes

The routers in `apps/lace-mobile` and `apps/lace-extension` share the same
navigation tree, with a few platform-specific differences:

- mobile passes `linking` into `NavigationContainer`
- extension disables `documentTitle`
- extension wraps the app in `TrueSheetProvider`
- mobile adds Android back handling for sheet dismissal

Both routers use the same `navigationRef`, `NavigationControls`, and
`useNavigationObservability()` hook.

## Observability

`useNavigationObservability(navigationRef)` exposes:

- `onNavigationReady`
- `onNavigationStateChange`

These are wired directly into the root `NavigationContainer` and inspect the
single nested state tree to emit breadcrumbs for:

- initial navigation readiness
- navigation state changes
- one-time route load events

## Module System Integration

Navigation integrates with the module system through dynamic addon loading:

- `loadStackPages`: add stack screens under `RootStack`
- `loadTabPages`: add tab screens under the `Home` screen
- `loadGlobalOverlays`: add non-navigation overlay UI outside the container
- `loadSheetPages`: add sheet screens to `SheetStack.Group`

## Source Of Truth

When in doubt, use code rather than this README:

- `packages/lib/navigation/src/core/index.ts`
- `packages/lib/navigation/src/core/navigation-controls.ts`
- `packages/lib/navigation/src/core/navigationReferences.ts`
- `packages/lib/navigation/src/types/routes.ts`
- `packages/lib/navigation/src/types/index.ts`
- `apps/lace-mobile/src/app/Router.tsx`
- `apps/lace-extension/src/Router.tsx`
