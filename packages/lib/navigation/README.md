# @lace-lib/navigation

Navigation utilities and components for the Lace platform, providing a unified navigation system with stack navigation, tab navigation, and sheet navigation capabilities.

## Overview

This library provides a comprehensive navigation system that combines React Navigation's stack and tab navigators with custom sheet navigation for modal-like experiences. The architecture is designed around a modular system where navigation pages are dynamically loaded from various modules through addon functions.

## Architecture

### Navigation Tree Structure

The navigation system is built as a hierarchical tree:

```
NavigationContainer (Root)
├── Stack.Navigator (Main Stack)
│   ├── Home (Tab Navigator)
│   │   ├── Portfolio (Tab)
│   │   ├── Rewards (Tab)
│   │   ├── DApps (Tab)
│   │   ├── Settings (Tab)
│   │   └── AccountCenter (Tab)
│   ├── AccountDetails (Stack Screen)
│   ├── YourKeys (Stack Screen)
│   ├── WalletSettings (Stack Screen)
│   └── Collateral (Stack Screen)
├── GlobalOverlays (Overlay Components)
└── SheetStack.Navigator (Sheet Navigation)
    ├── Initial (Sheet)
    ├── RemoveAccount (Sheet)
    └── RemoveAccountSuccess (Sheet)
```

### How Navigation Pages are Loaded

The navigation tree is dynamically constructed through a modular addon system:

1. **Router Initialization**: The `Router.tsx` component loads pages from modules using addon functions
2. **Addon Functions**: Each module can export addon functions that return React components for different navigation types
3. **Dynamic Loading**: Pages are loaded asynchronously and rendered into the navigation tree

### Navigation References Architecture

The system uses two separate navigation containers with their own references:

```typescript jsx
// Main navigation container for stack and tab navigation
<NavigationContainer ref={navigationRef}>
  <Stack.Navigator>
    <Stack.Screen name={StackRoutes.Home}>
      {props => <Home {...props}>{pages.tabPages}</Home>}
    </Stack.Screen>
    {pages.stackPages}
  </Stack.Navigator>
  {pages.globalOverlays}
</NavigationContainer>

// Separate navigation container for sheet navigation
<NavigationContainer ref={sheetNavigationRef}>
  <SheetStack.Navigator>
    <SheetStack.Screen name={SheetRoutes.Initial} component={InitialSheet} />
    {pages.sheetPages}
  </SheetStack.Navigator>
</NavigationContainer>
```

This separation allows:

- **Independent navigation contexts**: Stack/tab and sheet navigation operate independently
- **Cross-navigation support**: `NavigationControls` handles navigation between contexts
- **Side effect navigation**: Navigate from async operations, event handlers, etc.

#### Addon Functions

- `loadStackPages`: Returns stack navigation screens
- `loadTabPages`: Returns tab navigation screens
- `loadGlobalOverlays`: Returns overlay components
- `loadSheetPages`: Returns sheet navigation screens

#### Example Router Implementation

```typescript
// apps/lace-mobile/src/app/Router.tsx
useEffect(() => {
  const loadStackPages = moduleInitProps.loadModules('addons.loadStackPages');
  const loadTabPages = moduleInitProps.loadModules('addons.loadTabPages');
  const loadGlobalOverlays = moduleInitProps.loadModules(
    'addons.loadGlobalOverlays',
  );
  const loadSheetPages = moduleInitProps.loadModules('addons.loadSheetPages');

  const load = async () => {
    const [
      stackPagesResult,
      tabPagesResult,
      globalOverlaysResult,
      sheetPagesResult,
    ] = await Promise.all([
      loadStackPages,
      loadTabPages,
      loadGlobalOverlays,
      loadSheetPages,
    ]);

    setPages({
      stackPages: stackPagesResult,
      tabPages: tabPagesResult,
      globalOverlays: globalOverlaysResult,
      sheetPages: sheetPagesResult,
    });
  };

  void load();
}, [moduleInitProps]);
```

## Navigation Types

### Stack Navigation

Primary navigation flow using React Navigation's stack navigator for main app screens.

### Tab Navigation

Bottom tab navigation for main app sections, rendered within the Home stack screen.

### Sheet Navigation

Modal-like navigation that slides up from the bottom, perfect for forms, confirmations, and secondary actions.

## Usage

### Basic Import

```typescript
import { NavigationControls } from '@lace-lib/navigation';
```

### Stack Navigation

#### Using `useNavigation` Hook (Recommended for Components)

```typescript
import { useNavigation } from '@react-navigation/native';
import type { StackScreenProps } from '@lace-lib/navigation';

// In a component
const navigation = useNavigation<StackScreenProps<keyof StackParameterList>>();

// Navigate to a route
navigation.navigate('AccountDetails', {
  walletId: 'wallet123',
  accountId: 'account456',
});
```

#### Available Stack Routes

```typescript
enum StackRoutes {
  Home = 'Home', // Main tab navigator
  AccountDetails = 'AccountDetails', // Account details screen
  YourKeys = 'YourKeys', // Keys management
  WalletSettings = 'WalletSettings', // Wallet settings
  Collateral = 'Collateral', // Collateral management
}
```

### Tab Navigation

Tab screens are automatically rendered within the Home stack screen:

```typescript
enum TabRoutes {
  Portfolio = 'Portfolio',
  Rewards = 'Rewards',
  DApps = 'DApps',
  Settings = 'Settings',
  AccountCenter = 'AccountCenter',
}
```

### Sheet Navigation

#### Using `NavigationControls.sheets`

```typescript
import { NavigationControls } from '@lace-lib/navigation';

// Open a sheet
NavigationControls.sheets.navigate('RemoveAccount', {
  walletId: 'wallet123',
  accountId: 'account456',
  preventAnimation: false, // Optional: disable entrance animation
});

// Open a simple sheet
NavigationControls.sheets.navigate('Initial');

// Close the current sheet
NavigationControls.sheets.close();
```

#### Available Sheet Routes

```typescript
enum SheetRoutes {
  Initial = 'Initial', // Initial sheet
  RemoveAccount = 'RemoveAccount', // Remove account confirmation
  RemoveAccountSuccess = 'RemoveAccountSuccess', // Success confirmation
}
```

### Navigation Within Same Context

When navigating between pages within the same NavigationContainer, you should use the `navigation` object inherited by each screen component.

#### Using Navigation Object

Each screen component receives a `navigation` object with type-safe methods:

```typescript
import type { StackScreenProps } from '@lace-lib/navigation';

// In a stack screen component
export const YourStackScreen = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.YourStackScreen>) => {
  const handleNavigateToAnotherStack = () => {
    // Navigate to another stack screen
    navigation.navigate('AccountDetails', {
      walletId: 'wallet123',
      accountId: 'account456',
    });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleReplace = () => {
    navigation.replace('YourKeys');
  };

  return (
    // Your component JSX
  );
};
```

#### Using Route Object

Each screen also receives a `route` object that contains:

- **`route.name`**: The name of the current route
- **`route.params`**: The parameters passed to the screen
- **`route.key`**: Unique key for the route

```typescript
export const YourScreen = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.YourScreen>) => {
  // Access route parameters
  const { walletId, accountId } = route.params;

  // Access route name
  const currentRouteName = route.name;

  // Use parameters in your component logic
  const handleAction = () => {
    console.log(`Action for wallet ${walletId}, account ${accountId}`);
  };

  return (
    // Your component JSX
  );
};
```

#### Type-Safe Navigation Props

The navigation system provides type-safe props for each navigation context:

- **`StackScreenProps<T>`**: For stack navigation screens
- **`TabScreenProps<T>`**: For tab navigation screens
- **`SheetScreenProps<T>`**: For sheet navigation screens

```typescript
// Stack screen with typed navigation and route
export const StackScreen = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.AccountDetails>) => {
  // navigation and route are fully typed
  const { walletId, accountId } = route.params; // TypeScript knows these exist
  navigation.navigate('YourKeys'); // TypeScript validates route names
};

// Tab screen with typed navigation and route
export const TabScreen = ({
  navigation,
  route,
}: TabScreenProps<TabRoutes.Portfolio>) => {
  // navigation and route are fully typed for tab context
};

// Sheet screen with typed navigation and route
export const SheetScreen = ({
  navigation,
  route,
}: SheetScreenProps<SheetRoutes.RemoveAccount>) => {
  // navigation and route are fully typed for sheet context
  const { walletId, accountId } = route.params; // TypeScript knows these exist
};
```

### Combined Navigation

#### Close Sheet and Navigate to Stack

```typescript
import { NavigationControls } from '@lace-lib/navigation';

// Close current sheet and navigate to a stack route
NavigationControls.actions.closeAndNavigate('AccountDetails', {
  walletId: 'wallet123',
  accountId: 'account456',
});

// Close sheet and navigate without parameters
NavigationControls.actions.closeAndNavigate('Home');
```

### Navigation References and Cross-Navigation

The navigation system uses two separate navigation references:

1. **Main Navigation Reference** (`navigationRef`): Handles stack and tab navigation
2. **Sheet Navigation Reference** (`sheetNavigationRef`): Handles sheet navigation

#### Navigation from Side Effects

You can navigate from side effects (useEffect, event handlers, async operations) using the `NavigationControls`:

```typescript
import { NavigationControls } from '@lace-lib/navigation';

// Navigate within the same navigation context
NavigationControls.sheets.navigate('RemoveAccount', { walletId, accountId });

// Cross-navigation: Close sheet and navigate to stack
NavigationControls.actions.closeAndNavigate('AccountDetails', {
  walletId,
  accountId,
});
```

#### Why NavigationControls?

Since we have two separate navigation references, direct navigation between stack/tab screens and sheets requires special handling. `NavigationControls` provides:

- **Cross-navigation**: Navigate between different navigation contexts
- **Side effect navigation**: Navigate from async operations, event handlers, etc.
- **Unified API**: Single interface for all navigation operations

### Sheet Parameters

All sheets accept base parameters:

```typescript
type BaseSheetParams =
  | {
      preventAnimation?: boolean; // Disable entrance/exit animations
    }
  | undefined;
```

Some sheets have additional parameters:

```typescript
// RemoveAccount sheet
NavigationControls.sheets.navigate('RemoveAccount', {
  walletId: 'wallet123',
  accountId: 'account456',
  preventAnimation: false,
});
```

## Extending Sheet Parameters

Some sheets require UI-specific parameters (e.g., callbacks, component props). Use TypeScript declaration merging to add these without polluting the navigation library:

```typescript
// 1. In your module's navigation.d.ts
declare module '@lace-lib/navigation' {
  interface ExtendableSheetParams {
    DappConnector: DappConnectorSheetProps;
  }
}

// 2. In SheetParameterList (already set up)
[SheetRoutes.DappConnector]: BaseSheetParams & ExtendedParams<'DappConnector'>;

// 3. Navigate with type-safe params
NavigationControls.sheets.navigate('DappConnector', {
  dappName: 'My DApp',
  onConnect: () => {},
});
```

## Creating a New Screen

To add a new screen to the navigation system, follow these steps:

### 1. Define the Route in the Enum

First, add your new route to the appropriate enum in `packages/lib/navigation/src/types/routes.ts`:

```typescript
// For stack navigation
export enum StackRoutes {
  Home = 'Home',
  AccountDetails = 'AccountDetails',
  YourKeys = 'YourKeys',
  WalletSettings = 'WalletSettings',
  Collateral = 'Collateral',
  YourNewScreen = 'YourNewScreen', // Add your new route
}

// For tab navigation
export enum TabRoutes {
  Portfolio = 'Portfolio',
  Rewards = 'Rewards',
  DApps = 'DApps',
  Settings = 'Settings',
  AccountCenter = 'AccountCenter',
  YourNewTab = 'YourNewTab', // Add your new tab route
}

// For sheet navigation
export enum SheetRoutes {
  Initial = 'Initial',
  RemoveAccount = 'RemoveAccount',
  RemoveAccountSuccess = 'RemoveAccountSuccess',
  YourNewSheet = 'YourNewSheet', // Add your new sheet route
}
```

### 2. Define Navigation Parameters

Add the parameters for your new route in `packages/lib/navigation/src/types/index.ts`:

```typescript
export type StackParameterList = {
  [StackRoutes.Home]: NavigatorScreenParams<TabParameterList>;
  [StackRoutes.AccountDetails]: {
    walletId: string;
    accountId: string;
  };
  [StackRoutes.YourKeys]: undefined;
  [StackRoutes.WalletSettings]: { walletId: string };
  [StackRoutes.Collateral]: undefined;
  [StackRoutes.YourNewScreen]: {
    // Add your parameters
    someParam: string;
    optionalParam?: number;
  };
};

export type TabParameterList = {
  [TabRoutes.Portfolio]: undefined;
  [TabRoutes.Rewards]: undefined;
  [TabRoutes.DApps]: undefined;
  [TabRoutes.Settings]: undefined;
  [TabRoutes.AccountCenter]: undefined;
  [TabRoutes.YourNewTab]: undefined; // Add your tab parameters
};

export type SheetParameterList = {
  [SheetRoutes.Initial]: BaseSheetParams;
  [SheetRoutes.RemoveAccount]: BaseSheetParams & {
    walletId: string;
    accountId: string;
  };
  [SheetRoutes.RemoveAccountSuccess]: BaseSheetParams;
  [SheetRoutes.YourNewSheet]: BaseSheetParams & {
    // Add your sheet parameters
    data: string;
  };
};
```

### 3. Create UI Templates

All screens must implement a reusable template. Templates should receive only data and know how to render it. Here's how to define them:

```typescript jsx
// packages/lib/ui-toolkit/src/design-system/templates/yourNewTemplate.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '../atoms';

interface YourNewTemplateProps {
  title: string;
  description: string;
  items: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  onAction: () => void;
  onItemPress: () => void;
}

export const YourNewTemplate = ({
  title,
  description,
  items,
  onAction,
  onItemPress,
}: YourNewTemplateProps) => {
  return (
    <View style={styles.container}>
      <Text.L>{title}</Text.L>
      <Text.M>{description}</Text.M>
      {items.map(item => (
        <Button.Secondary
          key={item.id}
          label={`${item.label}: ${item.value}`}
          onPress={() => onItemPress()}
        />
      ))}
      <Button.Primary label="Action" onPress={onAction} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

For sheet templates, create them in `packages/lib/ui-toolkit/src/design-system/templates/sheets/`:

```typescript jsx
// packages/lib/ui-toolkit/src/design-system/templates/sheets/yourNewSheet/yourNewSheet.tsx
import React from 'react';
import { Sheet, Text, Button } from '../../../organisms';

interface YourNewSheetProps {
  title: string;
  message: string;
  confirmButtonLabel: string;
  cancelButtonLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const YourNewSheet = ({
  title,
  message,
  confirmButtonLabel,
  cancelButtonLabel,
  onConfirm,
  onCancel,
}: YourNewSheetProps) => {
  return (
    <Sheet.Scroll>
      <Text.L>{title}</Text.L>
      <Text.M>{message}</Text.M>
      <Button.Primary label={confirmButtonLabel} onPress={onConfirm} />
      <Button.Secondary label={cancelButtonLabel} onPress={onCancel} />
    </Sheet.Scroll>
  );
};
```

### 4. Create the Screen Component

Create your screen component that implements the template and handles the business logic:

```typescript jsx
// packages/module/your-module/src/pages/yourNewScreen.tsx
import { useTheme } from '@lace-lib/ui-toolkit';
import { YourNewTemplate } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from '@lace-contract/i18n';

import type { StackScreenProps } from '@lace-lib/navigation';
import type { StackRoutes } from '@lace-lib/navigation';

export const YourNewScreen = ({
  navigation,
  route: {
    params: { someParam, optionalParam },
  },
}: StackScreenProps<StackRoutes.YourNewScreen>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Prepare data for the template
  const templateData = useMemo(
    () => ({
      title: t('your.new.screen.title'),
      description: t('your.new.screen.description'),
      items: [
        { id: '1', label: 'Param 1', value: someParam },
        {
          id: '2',
          label: 'Param 2',
          value: optionalParam?.toString() || 'N/A',
        },
      ],
    }),
    [t, someParam, optionalParam],
  );

  const handleAction = useCallback(() => {
    // Your business logic here
    console.log('Action triggered with param:', someParam);
  }, [someParam]);

  const handleItemPress = useCallback((itemId: string) => {
    // Handle item selection
    console.log('Item pressed:', itemId);
  }, []);

  return (
    <YourNewTemplate
      {...templateData}
      onAction={handleAction}
      onItemPress={handleItemPress}
    />
  );
};
```

For sheet screens:

```typescript jsx
// packages/module/your-module/src/components/YourNewSheet.tsx
import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  type SheetScreenProps,
} from '@lace-lib/navigation';
import { YourNewSheet as YourNewSheetTemplate } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';

import type { SheetRoutes } from '@lace-lib/navigation';

export const YourNewSheet = ({
  route: {
    params: { data },
  },
}: SheetScreenProps<SheetRoutes.YourNewSheet>) => {
  const { t } = useTranslation();

  // Prepare data for the template
  const templateData = useMemo(
    () => ({
      title: t('your.new.sheet.title'),
      message: t('your.new.sheet.message', { data }),
      confirmButtonLabel: t('your.new.sheet.confirm'),
      cancelButtonLabel: t('your.new.sheet.cancel'),
    }),
    [t, data],
  );

  const handleConfirm = useCallback(() => {
    // Your business logic here
    console.log('Confirmed with data:', data);
    NavigationControls.sheets.close();
  }, [data]);

  const handleCancel = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  return (
    <YourNewSheetTemplate
      {...templateData}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
};
```

### 5. Export the Screen in Module Addons

Add your screen to the appropriate addon function in your module:

```typescript jsx
// packages/module/your-module/src/addons/stackPages.tsx
import { Stack, StackRoutes } from '@lace-lib/navigation';
import React from 'react';

import { YourNewScreen } from '../pages/yourNewScreen';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

export const stackPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <React.Fragment key="your-module-stack-pages-addons">
    <Stack.Screen name={StackRoutes.YourNewScreen} component={YourNewScreen} />
  </React.Fragment>
);

export default stackPages;
```

For tab pages:

```typescript jsx
// packages/module/your-module/src/addons/tabPages.tsx
import { Tab, TabRoutes } from '@lace-lib/navigation';
import { Icon } from '@lace-lib/ui-toolkit';
import React from 'react';

import { YourNewTab } from '../pages/yourNewTab';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const tabPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="your-module-tab-pages-addons">
    <Tab.Screen
      name={TabRoutes.YourNewTab}
      component={YourNewTab}
      options={{ tabBarIcon: () => <Icon name="YourIcon" size={18} /> }}
    />
  </React.Fragment>
);

export default tabPages;
```

For sheet pages:

```typescript jsx
// packages/module/your-module/src/addons/sheetPages.tsx
import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { YourNewSheet } from '../components/YourNewSheet';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const loadSheetPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => {
  return (
    <>
      <SheetStack.Screen
        name={SheetRoutes.YourNewSheet}
        component={YourNewSheet}
      />
    </>
  );
};

export default loadSheetPages;
```

### 6. Register Addons in Module Index

Make sure your module exports the addon functions in its main index file:

```typescript
// packages/module/your-module/src/index.ts
const yourModule = inferModuleContext({
  moduleName: ModuleName('your-module'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadStackPages: async () => import('./addons/stackPages'),
    loadTabPages: async () => import('./addons/tabPages'),
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
});
```

## Module System Integration

The navigation system is deeply integrated with the Lace module system. Each module can contribute navigation pages through addon functions, allowing for:

- **Modular Architecture**: Features can be developed independently and contribute to navigation
- **Dynamic Loading**: Pages are loaded asynchronously based on available modules
- **Type Safety**: Full TypeScript support with parameter validation
- **Feature Flags**: Modules can be conditionally loaded based on feature flags

This architecture enables the Lace platform to have a flexible, extensible navigation system that can adapt to different configurations and feature sets.
