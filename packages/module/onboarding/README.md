# Onboarding Module

## Overview

The Onboarding module provides a complete user onboarding experience for the Lace wallet application, guiding new users through wallet creation, restoration, and hardware wallet setup. The module follows the same architectural pattern as other modules in the codebase (like `account-management`) and integrates seamlessly with the main application's navigation system.

## Architecture

The module follows the **account-management pattern** and implements:

- **Single navigation approach** - Uses only `loadStackPages` for integration with main app navigation
- **Router integration** - Automatically navigates to `OnboardingStart` when no wallets exist
- **Feature flag ready** - Prepared for enabling/disabling via feature flags
- **Comprehensive testing** - 44/44 tests passing with real logic testing

## Implemented Contracts

The module implements the following contracts:

- `@lace-contract/onboarding` - Core onboarding functionality contract
- `@lace-contract/views` - View management and navigation (stackPagesAddonContract)
- `@lace-contract/module` - Base module infrastructure contract

## Dependencies

The module depends on the following contracts:

- `@lace-contract/vault` - Wallet vault functionality
- `@lace-contract/views` - View management and navigation
- `@lace-contract/analytics` - User analytics tracking
- `@lace-contract/wallet-repo` - Wallet repository management

## Exported Addons

The module exports the following addon for integration with the main application:

### loadStackPages

Provides stack-based navigation pages for onboarding workflows. This addon registers the following screens with the main application's `Stack.Navigator`:

- **OnboardingStart** - Main onboarding entry point with wallet creation options
- **OnboardingCreateWallet** - Account selection and wallet creation interface
- **OnboardingRestoreWallet** - Wallet restoration using recovery phrases
- **OnboardingHardware** - Hardware wallet setup and device selection

## Navigation Integration

The module integrates with the main application's navigation system through the Router:

```typescript
// Automatic navigation based on wallet count
const initialRouteName =
  walletNumber === 0 ? StackRoutes.OnboardingStart : StackRoutes.Home;

<Stack.Navigator initialRouteName={initialRouteName}>
  {pages.stackPages} // Our onboarding screens are registered here
</Stack.Navigator>;
```

**Flow:**

- **No wallets** (`walletNumber === 0`) → Automatically navigates to `OnboardingStart`
- **Has wallets** (`walletNumber > 0`) → Navigates to `Home`
- **Onboarding screens** are registered via `loadStackPages` and available for navigation

## Core Pages

### OnboardingStart

The main onboarding entry page that provides:

- **Create Wallet** - Option to create a new Lace wallet
- **Restore Wallet** - Option to restore an existing wallet
- **Hardware Wallet** - Option to connect a hardware wallet
- **Legal Agreement** - Terms and conditions acceptance

This page serves as the central hub for all onboarding flows.

### OnboardingCreateWallet

The wallet creation page that provides:

- **Account Selection** - Choose which blockchain accounts to activate (Cardano, Bitcoin, Midnight)
- **Account Toggle Interface** - Enable/disable specific blockchain accounts
- **Loading States** - Visual feedback during account discovery
- **Finish Setup** - Complete wallet creation process

### OnboardingRestoreWallet

The wallet restoration page that provides:

- **Recovery Phrase Input** - Enter mnemonic seed phrase
- **Paste Functionality** - Clipboard integration for recovery phrases
- **Validation** - Recovery phrase format validation
- **Next Step Navigation** - Proceed to wallet restoration

### OnboardingHardware

The hardware wallet setup page that provides:

- **Supported Devices** - List of compatible hardware wallets (Ledger, Trezor)
- **Device Selection** - Choose specific hardware wallet device
- **Device Discovery** - Search for connected hardware devices
- **Setup Instructions** - Device-specific setup guidance

## UI Components

### Hardware Wallet Device Display

The module includes custom SVG logos for hardware wallet devices:

- **Ledger** - Official Ledger branding and styling
- **Trezor** - Official Trezor branding and styling

These logos are displayed in the hardware wallet selection interface with proper sizing and formatting.

### Account Selection Interface

The create wallet interface provides:

- **Toggle Controls** - Enable/disable blockchain accounts
- **Loading States** - Visual feedback during account discovery
- **Dynamic Placeholder** - Shows account count (e.g., "3 Account(s)")
- **Account Management** - State management for account selection

## Testing

The module includes comprehensive test coverage with **44/44 tests passing**:

### Test Strategy

We use **real logic testing** instead of heavy mocking:

- **✅ Real Hook Tests** - Test actual hooks with mocked dependencies
- **✅ Logic Tests** - Test business logic (navigation, translations, device configs)
- **✅ Contract Tests** - Test module contract implementation
- **✅ Integration Tests** - Test router integration and feature flag support

### Test Structure

```
test/
├── hooks/                           # Logic and hook tests
│   ├── useOnboardingStart.test.ts   # Real hook test (working)
│   ├── useOnboardingHardware.test.ts # Real hook test (working)
│   ├── navigation.test.ts           # Navigation logic tests
│   ├── translations.test.ts         # Translation logic tests
│   └── hardwareDevices.test.ts     # Hardware device logic tests
├── module/                          # Module contract tests
│   ├── contract.test.ts             # Module contract tests
│   └── router-integration.test.ts   # Router integration tests
└── store/                          # Store tests
    ├── dependencies.test.ts         # Store dependencies
    └── side-effects.test.ts         # Store side effects
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run with UI interface
npm run test:ui
```

## Usage

### Automatic Integration

The module is automatically loaded when `walletNumber === 0` and integrates seamlessly with the main application's navigation system.

### Feature Flag Support

The module is prepared for feature flag control:

```typescript
// Ready for feature flag implementation
const shouldLoadOnboarding = featureFlags['onboarding-module'];

if (shouldLoadOnboarding) {
  // Module is loaded and onboarding screens are available
}
```

## Structure

```
src/
├── addons/
│   ├── loadOnboardingOptions.tsx  # Onboarding options loader
│   └── loadStackPages.tsx         # Stack navigation pages (main integration)
├── pages/
│   ├── OnboardingStart/
│   │   ├── index.ts               # Page exports
│   │   ├── OnboardingStart.tsx    # Start page component
│   │   └── useOnboardingStart.ts  # Start page hook
│   ├── OnboardingCreateWallet/
│   │   ├── index.ts               # Page exports
│   │   ├── OnboardingCreateWallet.tsx # Create wallet component
│   │   └── useOnboardingCreateWallet.ts # Create wallet hook
│   ├── OnboardingRestoreWallet/
│   │   ├── index.ts               # Page exports
│   │   ├── OnboardingRestoreWallet.tsx # Restore wallet component
│   │   └── useOnboardingRestoreWallet.ts # Restore wallet hook
│   └── OnboardingHardware/
│       ├── index.ts               # Page exports
│       ├── OnboardingHardware.tsx # Hardware wallet component
│       └── useOnboardingHardware.ts # Hardware wallet hook
├── utils/                         # Test utilities
└── index.ts                       # Module entry point
```

## Development

### Key Principles

1. **Follow account-management pattern** - Use same architectural approach
2. **Real testing** - Test actual logic, not heavy mocks
3. **Router integration** - Work with main app navigation system
4. **Feature flag ready** - Prepare for enabling/disabling

### Adding New Functionality

1. **Add new pages** in `src/pages/` following the established pattern
2. **Register screens** in `src/addons/loadStackPages.tsx`
3. **Create real tests** for business logic
4. **Update contracts** if new functionality is needed

## Platform Support

The module supports multiple platforms through the main application's navigation system:

- **Mobile** - React Native implementation with mobile-specific UI
- **Extension** - Browser extension implementation with popup/tab interfaces

## Module Benefits

- **✅ Consistent Architecture** - Follows established patterns
- **✅ Automatic Integration** - Works with main app navigation
- **✅ Comprehensive Testing** - 44/44 tests with real logic testing
- **✅ Feature Flag Ready** - Prepared for production control
- **✅ No Empty Screens** - Automatic navigation to correct screens
- **✅ Maintainable** - Clean, simple architecture

## Future Enhancements

Potential areas for future development:

- Advanced wallet creation options
- Multi-language onboarding support
- Enhanced hardware wallet support
- Biometric authentication integration
- Social recovery options
- Advanced account management features
