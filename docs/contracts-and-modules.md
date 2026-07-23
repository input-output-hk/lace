# Contracts and Modules

This document provides an overview of the contract and module architecture in the Lace platform.

## Statistics

- **Total Contracts**: 109
- **Total Modules**: 60

## Contract Clusters

Contracts are automatically grouped based on their dependency relationships:

### Cluster Summary

- **Cardano**: 64 contracts
- **Signer**: 2 contracts
- **Account Standalone**: 3 contracts
- **Misc**: 26 contracts
- **Activities Standalone**: 3 contracts
- **Address Standalone**: 2 contracts
- **Blockchain Standalone**: 2 contracts
- **Bitcoin Standalone**: 2 contracts
- **Feature Standalone**: 2 contracts
- **Onboarding Standalone**: 3 contracts

### Cardano Contracts (Part 1)

```mermaid
graph TD
  send-flow-store["send-flow-store"]
  tx-executor-store["tx-executor-store"]
  send-flow-address-validator-addon["send-flow-address-validator-addon<br/>---<br/><i>loadAddressValidator</i>"]
  addresses-alias-resolver-addon["addresses-alias-resolver-addon<br/>---<br/><i>loadAddressAliasResolver</i>"]
  chain-minimum-amount-token-validator-addon["chain-minimum-amount-token-validator-addon<br/>---<br/><i>loadChainMinimumAmountTokenValidator</i>"]
  send-flow-analytics-enhancer-addon["send-flow-analytics-enhancer-addon<br/>---<br/><i>loadSendFlowAnalyticsEnhancers</i>"]
  token-pricing-store["token-pricing-store"]
  token-id-mapper-addon["token-id-mapper-addon<br/>---<br/><i>loadTokenIdMapper</i>"]
  send-flow-store --> tx-executor-store
  send-flow-store --> send-flow-address-validator-addon
  send-flow-store --> addresses-alias-resolver-addon
  send-flow-store --> chain-minimum-amount-token-validator-addon
  send-flow-store --> send-flow-analytics-enhancer-addon
  send-flow-store --> token-pricing-store
  send-flow-store --> token-id-mapper-addon
  token-pricing-store --> token-id-mapper-addon
```

### Cardano Contracts (Part 2)

```mermaid
graph TD
  onboarding-v2-store["onboarding-v2-store"]
  app-lock-setup-addon["app-lock-setup-addon<br/>---<br/><i>loadSetupAppLock</i>"]
  in-memory-integration-addon["in-memory-integration-addon<br/>---<br/><i>loadInMemoryWalletIntegration</i>"]
  internal-auth-secret-api-addon["internal-auth-secret-api-addon<br/>---<br/><i>loadAuthenticationPromptInternalAuthSecretApiExtension</i>"]
  local-authentication-dependency["local-authentication-dependency"]
  hw-wallet-connector-addon["hw-wallet-connector-addon<br/>---<br/><i>loadHwWalletConnector</i>"]
  onboarding-v2-store --> app-lock-setup-addon
  onboarding-v2-store --> in-memory-integration-addon
  onboarding-v2-store --> internal-auth-secret-api-addon
  onboarding-v2-store --> local-authentication-dependency
  onboarding-v2-store --> hw-wallet-connector-addon
```

### Cardano Contracts (Part 3)

```mermaid
graph TD
  dapp-connector-store["dapp-connector-store"]
  dapp-connector-api-addon["dapp-connector-api-addon<br/>---<br/><i>dappConnectorApi</i>"]
  dapp-connector-platform-dependency["dapp-connector-platform-dependency"]
  dapp-connector-store --> dapp-connector-api-addon
  dapp-connector-store --> dapp-connector-platform-dependency
```

### Cardano Contracts (Part 4)

```mermaid
graph TD
  secure-store["secure-store"]
  secure-store-dependency["secure-store-dependency"]
  secure-store --> secure-store-dependency
```

### Signer Contracts and Dependencies

```mermaid
graph TD
  signer-factory-addon["signer-factory-addon<br/>---<br/><i>loadSignerFactory</i>"]
  signer-store["signer-store"]
  signer-store --> signer-factory-addon
```

### Account Standalone Contracts and Dependencies

```mermaid
graph TD
  account-center-wallets-ui-addon["account-center-wallets-ui-addon<br/>---<br/><i>loadAccountCenterWalletsUICustomisations</i>"]
  account-settings-ui-addon["account-settings-ui-addon<br/>---<br/><i>loadAccountSettingsUICustomisations</i>"]
  account-ui-customisation-addon["account-ui-customisation-addon<br/>---<br/><i>loadAccountUICustomisations</i>"]
```

### Activities Standalone Contracts and Dependencies

```mermaid
graph TD
  activities-details-sheet-customizations-addon["activities-details-sheet-customizations-addon<br/>---<br/><i>loadActivityDetailsSheetUICustomisations</i>"]
  activities-item-customizations-addon["activities-item-customizations-addon<br/>---<br/><i>loadActivitiesItemUICustomisations</i>"]
  activities-list-customizations-addon["activities-list-customizations-addon<br/>---<br/><i>loadActivitiesListUICustomisations</i><br/><i>loadActivitiesOfTokenUICustomisations</i>"]
```

### Address Standalone Contracts and Dependencies

```mermaid
graph TD
  address-book-address-validator-addon["address-book-address-validator-addon<br/>---<br/><i>loadAddressBookAddressValidators</i>"]
  address-book-store["address-book-store"]
```

### Blockchain Standalone Contracts and Dependencies

```mermaid
graph TD
  blockchain-specific-app-customizations-addon["blockchain-specific-app-customizations-addon<br/>---<br/><i>loadAccountUICustomisations</i><br/><i>loadReceiveSheetAddressDataCustomisations</i><br/><i>loadTokenDetailsUICustomisations</i><br/><i>loadPortfolioBannerUICustomisations</i><br/><i>loadAboutPageUICustomisations</i>"]
  blockchain-specific-app-settings-page-customizations-addon["blockchain-specific-app-settings-page-customizations-addon<br/>---<br/><i>loadSettingsPageUICustomisations</i>"]
```

### Bitcoin Standalone Contracts and Dependencies

```mermaid
graph TD
  bitcoin-fee-market-provider["bitcoin-fee-market-provider"]
  bitcoin-provider["bitcoin-provider"]
```

### Feature Standalone Contracts and Dependencies

```mermaid
graph TD
  feature-dependency["feature-dependency"]
  feature-flag-refresh-trigger-dependency["feature-flag-refresh-trigger-dependency"]
```

### Onboarding Standalone Contracts and Dependencies

```mermaid
graph TD
  onboarding-config-addon["onboarding-config-addon<br/>---<br/><i>loadOnboardingConfig</i>"]
  onboarding-options-addon["onboarding-options-addon<br/>---<br/><i>loadOnboardingOptions</i>"]
  onboarding-start-wallet-dropdown-addon["onboarding-start-wallet-dropdown-addon<br/>---<br/><i>loadOnboardingStartWalletDropdownUICustomisations</i>"]
```

## Module Implementations

The following diagrams show which modules implement which contracts:

### Sheet Pages Addon Related Module Implementations

```mermaid
graph LR
  subgraph Contracts
    stack-pages-addon["stack-pages-addon<br/>---<br/><i>loadStackPages</i>"]
    tab-pages-addon["tab-pages-addon<br/>---<br/><i>loadTabPages</i>"]
    account-management-store["account-management-store"]
    sheet-pages-addon["sheet-pages-addon<br/>---<br/><i>loadSheetPages</i>"]
    dapp-connector-platform-dependency["dapp-connector-platform-dependency"]
    load-deep-links-addon["load-deep-links-addon<br/>---<br/><i>loadMobileDeepLinks</i>"]
    dialogs-addon["dialogs-addon<br/>---<br/><i>loadDialogs</i>"]
    initialize-extension-view-addon["initialize-extension-view-addon<br/>---<br/><i>loadInitializeExtensionView</i>"]
    initialize-mobile-view-addon["initialize-mobile-view-addon<br/>---<br/><i>loadInitializeMobileView</i>"]
    account-settings-ui-addon["account-settings-ui-addon<br/>---<br/><i>loadAccountSettingsUICustomisations</i>"]
    activities-details-sheet-customizations-addon["activities-details-sheet-customizations-addon<br/>---<br/><i>loadActivityDetailsSheetUICustomisations</i>"]
    global-overlays-addon["global-overlays-addon<br/>---<br/><i>loadGlobalOverlays</i>"]
    air-gapped-qr-exchange-store["air-gapped-qr-exchange-store"]
    authentication-prompt-store["authentication-prompt-store"]
    auth-prompt-ui-component-addon["auth-prompt-ui-component-addon<br/>---<br/><i>loadRenderAuthPromptUI</i>"]
    internal-auth-secret-api-addon["internal-auth-secret-api-addon<br/>---<br/><i>loadAuthenticationPromptInternalAuthSecretApiExtension</i>"]
    swap-context-store["swap-context-store"]
    blockchain-specific-app-settings-page-customizations-addon["blockchain-specific-app-settings-page-customizations-addon<br/>---<br/><i>loadSettingsPageUICustomisations</i>"]
    views-store["views-store"]
    app-lock-setup-addon["app-lock-setup-addon<br/>---<br/><i>loadSetupAppLock</i>"]
    app-lock-store["app-lock-store"]
    auth-secret-verifier-addon["auth-secret-verifier-addon<br/>---<br/><i>loadAuthSecretVerifier</i>"]
    wallet-active-state-dependency["wallet-active-state-dependency"]
    dev["dev"]
    feature-store["feature-store"]
    feature-dependency["feature-dependency"]
    wallet-settings-ui-customisation-addon["wallet-settings-ui-customisation-addon<br/>---<br/><i>loadWalletSettingsUICustomisations</i>"]
    recovery-phrase-store["recovery-phrase-store"]
    notification-center-store["notification-center-store"]
    onboarding-v2-store["onboarding-v2-store"]
  end
  subgraph Modules
    module_0["account-management"]
    module_1["address-book"]
    module_2["dapp-connector-cardano"]
    module_3["cardano-uri-linking"]
    module_4["identity-center"]
    module_5["dapp-explorer"]
    module_6["governance-center"]
    module_7["send-flow"]
    module_8["blockchain-cardano-ui"]
    module_9["blockchain-bitcoin-ui"]
    module_10["migrate-multi-delegation"]
    module_11["air-gapped-qr-exchange-host"]
    module_12["migrate-v1-data"]
    module_13["authentication-prompt-ui-v2-extension"]
    module_14["staking-center"]
    module_15["swap-center"]
    module_16["views-extension"]
    module_17["app-lock"]
    module_18["views-mobile"]
    module_19["test-api"]
    module_20["feature-dev"]
    module_21["feature-posthog"]
    module_22["vault-in-memory-ui"]
    module_23["notification-center"]
    module_24["onboarding"]
    module_25["dapp-connector-extension"]
  end
  module_0 -.->|implements| stack-pages-addon
  module_0 -.->|implements| tab-pages-addon
  module_0 -.->|implements| account-management-store
  module_0 -.->|implements| sheet-pages-addon
  module_1 -.->|implements| tab-pages-addon
  module_1 -.->|implements| sheet-pages-addon
  module_2 -.->|implements| dapp-connector-platform-dependency
  module_2 -.->|implements| sheet-pages-addon
  module_2 -.->|implements| stack-pages-addon
  module_3 -.->|implements| stack-pages-addon
  module_3 -.->|implements| load-deep-links-addon
  module_4 -.->|implements| stack-pages-addon
  module_4 -.->|implements| tab-pages-addon
  module_4 -.->|implements| sheet-pages-addon
  module_5 -.->|implements| tab-pages-addon
  module_5 -.->|implements| sheet-pages-addon
  module_5 -.->|implements| dialogs-addon
  module_6 -.->|implements| tab-pages-addon
  module_6 -.->|implements| sheet-pages-addon
  module_6 -.->|implements| initialize-extension-view-addon
  module_6 -.->|implements| initialize-mobile-view-addon
  module_7 -.->|implements| sheet-pages-addon
  module_8 -.->|implements| account-settings-ui-addon
  module_8 -.->|implements| activities-details-sheet-customizations-addon
  module_8 -.->|implements| global-overlays-addon
  module_8 -.->|implements| sheet-pages-addon
  module_9 -.->|implements| account-settings-ui-addon
  module_10 -.->|implements| global-overlays-addon
  module_11 -.->|implements| global-overlays-addon
  module_11 -.->|implements| air-gapped-qr-exchange-store
  module_12 -.->|implements| global-overlays-addon
  module_13 -.->|implements| authentication-prompt-store
  module_13 -.->|implements| auth-prompt-ui-component-addon
  module_13 -.->|implements| global-overlays-addon
  module_13 -.->|implements| internal-auth-secret-api-addon
  module_14 -.->|implements| tab-pages-addon
  module_14 -.->|implements| sheet-pages-addon
  module_14 -.->|implements| initialize-extension-view-addon
  module_14 -.->|implements| initialize-mobile-view-addon
  module_15 -.->|implements| tab-pages-addon
  module_15 -.->|implements| sheet-pages-addon
  module_15 -.->|implements| swap-context-store
  module_15 -.->|implements| dialogs-addon
  module_15 -.->|implements| blockchain-specific-app-settings-page-customizations-addon
  module_16 -.->|implements| views-store
  module_16 -.->|implements| initialize-extension-view-addon
  module_16 -.->|implements| sheet-pages-addon
  module_16 -.->|implements| blockchain-specific-app-settings-page-customizations-addon
  module_17 -.->|implements| app-lock-setup-addon
  module_17 -.->|implements| app-lock-store
  module_17 -.->|implements| auth-secret-verifier-addon
  module_17 -.->|implements| sheet-pages-addon
  module_17 -.->|implements| blockchain-specific-app-settings-page-customizations-addon
  module_17 -.->|implements| wallet-active-state-dependency
  module_18 -.->|implements| views-store
  module_19 -.->|implements| dev
  module_19 -.->|implements| initialize-extension-view-addon
  module_19 -.->|implements| initialize-mobile-view-addon
  module_20 -.->|implements| feature-store
  module_20 -.->|implements| feature-dependency
  module_20 -.->|implements| dev
  module_20 -.->|implements| initialize-extension-view-addon
  module_21 -.->|implements| feature-store
  module_21 -.->|implements| feature-dependency
  module_22 -.->|implements| wallet-settings-ui-customisation-addon
  module_22 -.->|implements| recovery-phrase-store
  module_22 -.->|implements| sheet-pages-addon
  module_23 -.->|implements| notification-center-store
  module_23 -.->|implements| stack-pages-addon
  module_23 -.->|implements| tab-pages-addon
  module_24 -.->|implements| onboarding-v2-store
  module_24 -.->|implements| stack-pages-addon
  module_25 -.->|implements| dapp-connector-platform-dependency
```

### Ada Module Implementations

```mermaid
graph LR
  subgraph Contracts
    addresses-alias-resolver-addon["addresses-alias-resolver-addon<br/>---<br/><i>loadAddressAliasResolver</i>"]
  end
  subgraph Modules
    module_0["ada-handle"]
  end
  module_0 -.->|implements| addresses-alias-resolver-addon
```

### Analytics Module Implementations

```mermaid
graph LR
  subgraph Contracts
    analytics-store["analytics-store"]
    analytics-provider-dependency["analytics-provider-dependency"]
  end
  subgraph Modules
    module_0["analytics-dev"]
    module_1["analytics-posthog"]
  end
  module_0 -.->|implements| analytics-store
  module_0 -.->|implements| analytics-provider-dependency
  module_1 -.->|implements| analytics-store
  module_1 -.->|implements| analytics-provider-dependency
```

### App Activity Module Implementations

```mermaid
graph LR
  subgraph Contracts
    authentication-prompt-defer-biometric-addon["authentication-prompt-defer-biometric-addon<br/>---<br/><i>loadDeferBiometricPromptUntilActive</i>"]
    app-lock-activity-channel-addon["app-lock-activity-channel-addon<br/>---<br/><i>loadActivityChannel</i>"]
    feature-flag-refresh-trigger-dependency["feature-flag-refresh-trigger-dependency"]
    perform-app-reload-dependency["perform-app-reload-dependency"]
  end
  subgraph Modules
    module_0["app-activity-mobile"]
    module_1["app-activity-web"]
  end
  module_0 -.->|implements| authentication-prompt-defer-biometric-addon
  module_0 -.->|implements| app-lock-activity-channel-addon
  module_0 -.->|implements| feature-flag-refresh-trigger-dependency
  module_0 -.->|implements| perform-app-reload-dependency
  module_1 -.->|implements| app-lock-activity-channel-addon
  module_1 -.->|implements| feature-flag-refresh-trigger-dependency
  module_1 -.->|implements| perform-app-reload-dependency
```

### App Module Implementations

```mermaid
graph LR
  subgraph Contracts
    address-book-store["address-book-store"]
    network-store["network-store"]
    activities-store["activities-store"]
    app-store["app-store"]
    failures-store["failures-store"]
    stack-pages-addon["stack-pages-addon<br/>---<br/><i>loadStackPages</i>"]
    tab-pages-addon["tab-pages-addon<br/>---<br/><i>loadTabPages</i>"]
    send-flow-store["send-flow-store"]
    sheet-pages-addon["sheet-pages-addon<br/>---<br/><i>loadSheetPages</i>"]
    tab-menu-items-addon["tab-menu-items-addon<br/>---<br/><i>loadTabMenuItems</i>"]
    tokens-store["tokens-store"]
    tx-executor-store["tx-executor-store"]
    wallet-repo-store["wallet-repo-store"]
    custom-dapps-store["custom-dapps-store"]
    dapp-connector-store["dapp-connector-store"]
    signer-store["signer-store"]
    online-status-store["online-status-store"]
  end
  subgraph Modules
    module_0["app-mobile"]
  end
  module_0 -.->|implements| address-book-store
  module_0 -.->|implements| network-store
  module_0 -.->|implements| activities-store
  module_0 -.->|implements| app-store
  module_0 -.->|implements| failures-store
  module_0 -.->|implements| stack-pages-addon
  module_0 -.->|implements| tab-pages-addon
  module_0 -.->|implements| send-flow-store
  module_0 -.->|implements| sheet-pages-addon
  module_0 -.->|implements| tab-menu-items-addon
  module_0 -.->|implements| tokens-store
  module_0 -.->|implements| tx-executor-store
  module_0 -.->|implements| wallet-repo-store
  module_0 -.->|implements| custom-dapps-store
  module_0 -.->|implements| dapp-connector-store
  module_0 -.->|implements| signer-store
  module_0 -.->|implements| online-status-store
```

### Bitcoin Module Implementations

```mermaid
graph LR
  subgraph Contracts
    bitcoin-fee-market-provider["bitcoin-fee-market-provider"]
  end
  subgraph Modules
    module_0["bitcoin-mempool-fee-market"]
  end
  module_0 -.->|implements| bitcoin-fee-market-provider
```

### Bitcoin (1) Module Implementations

```mermaid
graph LR
  subgraph Contracts
    bitcoin-provider["bitcoin-provider"]
  end
  subgraph Modules
    module_0["bitcoin-provider-maestro"]
  end
  module_0 -.->|implements| bitcoin-provider
```

### Blockchain Module Implementations

```mermaid
graph LR
  subgraph Contracts
    in-memory-integration-addon["in-memory-integration-addon<br/>---<br/><i>loadInMemoryWalletIntegration</i>"]
    account-ui-customisation-addon["account-ui-customisation-addon<br/>---<br/><i>loadAccountUICustomisations</i>"]
    send-flow-sheet-ui-customisation-addon["send-flow-sheet-ui-customisation-addon<br/>---<br/><i>loadSendFlowSheetUICustomisations</i>"]
    tokens-store["tokens-store"]
    addresses-store["addresses-store"]
    sync-store["sync-store"]
    activities-item-customizations-addon["activities-item-customizations-addon<br/>---<br/><i>loadActivitiesItemUICustomisations</i>"]
    tx-executor-implementation-addon["tx-executor-implementation-addon<br/>---<br/><i>loadTxExecutorImplementation</i>"]
    send-flow-address-validator-addon["send-flow-address-validator-addon<br/>---<br/><i>loadAddressValidator</i>"]
    base-token-addon["base-token-addon<br/>---<br/><i>loadBaseToken</i>"]
    chain-minimum-amount-token-validator-addon["chain-minimum-amount-token-validator-addon<br/>---<br/><i>loadChainMinimumAmountTokenValidator</i>"]
    address-book-address-validator-addon["address-book-address-validator-addon<br/>---<br/><i>loadAddressBookAddressValidators</i>"]
    token-id-mapper-addon["token-id-mapper-addon<br/>---<br/><i>loadTokenIdMapper</i>"]
    signer-factory-addon["signer-factory-addon<br/>---<br/><i>loadSignerFactory</i>"]
    delegation-tx-builder-addon["delegation-tx-builder-addon<br/>---<br/><i>loadDelegationTxBuilder</i>"]
    cardano-in-memory-signing-dependency["cardano-in-memory-signing-dependency"]
    deregistration-tx-builder-addon["deregistration-tx-builder-addon<br/>---<br/><i>loadDeregistrationTxBuilder</i>"]
    staking-center-store["staking-center-store"]
    governance-center-store["governance-center-store"]
    vote-delegation-tx-builder-addon["vote-delegation-tx-builder-addon<br/>---<br/><i>loadVoteDelegationTxBuilder</i>"]
    wallet-identity-addon["wallet-identity-addon<br/>---<br/><i>loadWalletIdentity</i>"]
    account-settings-ui-addon["account-settings-ui-addon<br/>---<br/><i>loadAccountSettingsUICustomisations</i>"]
    midnight-context-store["midnight-context-store"]
    midnight-dependency["midnight-dependency"]
    blockchain-specific-app-customizations-addon["blockchain-specific-app-customizations-addon<br/>---<br/><i>loadAccountUICustomisations</i><br/><i>loadReceiveSheetAddressDataCustomisations</i><br/><i>loadTokenDetailsUICustomisations</i><br/><i>loadPortfolioBannerUICustomisations</i><br/><i>loadAboutPageUICustomisations</i>"]
    blockchain-specific-app-settings-page-customizations-addon["blockchain-specific-app-settings-page-customizations-addon<br/>---<br/><i>loadSettingsPageUICustomisations</i>"]
    activities-details-sheet-customizations-addon["activities-details-sheet-customizations-addon<br/>---<br/><i>loadActivityDetailsSheetUICustomisations</i>"]
    send-flow-analytics-enhancer-addon["send-flow-analytics-enhancer-addon<br/>---<br/><i>loadSendFlowAnalyticsEnhancers</i>"]
    sheet-pages-addon["sheet-pages-addon<br/>---<br/><i>loadSheetPages</i>"]
    dialogs-addon["dialogs-addon<br/>---<br/><i>loadDialogs</i>"]
  end
  subgraph Modules
    module_0["blockchain-bitcoin"]
    module_1["blockchain-cardano"]
    module_2["blockchain-midnight"]
  end
  module_0 -.->|implements| in-memory-integration-addon
  module_0 -.->|implements| account-ui-customisation-addon
  module_0 -.->|implements| send-flow-sheet-ui-customisation-addon
  module_0 -.->|implements| tokens-store
  module_0 -.->|implements| addresses-store
  module_0 -.->|implements| sync-store
  module_0 -.->|implements| activities-item-customizations-addon
  module_0 -.->|implements| tx-executor-implementation-addon
  module_0 -.->|implements| send-flow-address-validator-addon
  module_0 -.->|implements| base-token-addon
  module_0 -.->|implements| chain-minimum-amount-token-validator-addon
  module_0 -.->|implements| address-book-address-validator-addon
  module_0 -.->|implements| token-id-mapper-addon
  module_0 -.->|implements| signer-factory-addon
  module_1 -.->|implements| in-memory-integration-addon
  module_1 -.->|implements| account-ui-customisation-addon
  module_1 -.->|implements| send-flow-sheet-ui-customisation-addon
  module_1 -.->|implements| tokens-store
  module_1 -.->|implements| addresses-store
  module_1 -.->|implements| signer-factory-addon
  module_1 -.->|implements| send-flow-address-validator-addon
  module_1 -.->|implements| tx-executor-implementation-addon
  module_1 -.->|implements| activities-item-customizations-addon
  module_1 -.->|implements| sync-store
  module_1 -.->|implements| base-token-addon
  module_1 -.->|implements| chain-minimum-amount-token-validator-addon
  module_1 -.->|implements| address-book-address-validator-addon
  module_1 -.->|implements| delegation-tx-builder-addon
  module_1 -.->|implements| cardano-in-memory-signing-dependency
  module_1 -.->|implements| token-id-mapper-addon
  module_1 -.->|implements| deregistration-tx-builder-addon
  module_1 -.->|implements| staking-center-store
  module_1 -.->|implements| governance-center-store
  module_1 -.->|implements| vote-delegation-tx-builder-addon
  module_1 -.->|implements| wallet-identity-addon
  module_2 -.->|implements| account-settings-ui-addon
  module_2 -.->|implements| in-memory-integration-addon
  module_2 -.->|implements| tokens-store
  module_2 -.->|implements| sync-store
  module_2 -.->|implements| addresses-store
  module_2 -.->|implements| midnight-context-store
  module_2 -.->|implements| midnight-dependency
  module_2 -.->|implements| blockchain-specific-app-customizations-addon
  module_2 -.->|implements| blockchain-specific-app-settings-page-customizations-addon
  module_2 -.->|implements| send-flow-sheet-ui-customisation-addon
  module_2 -.->|implements| activities-details-sheet-customizations-addon
  module_2 -.->|implements| send-flow-address-validator-addon
  module_2 -.->|implements| send-flow-analytics-enhancer-addon
  module_2 -.->|implements| tx-executor-implementation-addon
  module_2 -.->|implements| address-book-address-validator-addon
  module_2 -.->|implements| signer-factory-addon
  module_2 -.->|implements| sheet-pages-addon
  module_2 -.->|implements| dialogs-addon
```

### Cardano (1) Module Implementations

```mermaid
graph LR
  subgraph Contracts
    cardano-provider-store["cardano-provider-store"]
    cardano-provider-dependency["cardano-provider-dependency"]
  end
  subgraph Modules
    module_0["cardano-provider-blockfrost"]
  end
  module_0 -.->|implements| cardano-provider-store
  module_0 -.->|implements| cardano-provider-dependency
```

### Crypto Module Implementations

```mermaid
graph LR
  subgraph Contracts
    crypto-addon["crypto-addon<br/>---<br/><i>bip32Ed25519</i><br/><i>blake2b</i>"]
  end
  subgraph Modules
    module_0["crypto-apollo"]
    module_1["crypto-cardano-sdk"]
  end
  module_0 -.->|implements| crypto-addon
  module_1 -.->|implements| crypto-addon
```

### Dapp Module Implementations

```mermaid
graph LR
  subgraph Contracts
    dapp-connector-api-addon["dapp-connector-api-addon<br/>---<br/><i>dappConnectorApi</i>"]
    render-root-addon["render-root-addon<br/>---<br/><i>renderRoot</i>"]
  end
  subgraph Modules
    module_0["dapp-connector-midnight"]
  end
  module_0 -.->|implements| dapp-connector-api-addon
  module_0 -.->|implements| render-root-addon
```

### Hw Module Implementations

```mermaid
graph LR
  subgraph Contracts
    request-hw-connection-addon["request-hw-connection-addon<br/>---<br/><i>loadRequestHWConnections</i>"]
  end
  subgraph Modules
    module_0["hw-connector"]
  end
  module_0 -.->|implements| request-hw-connection-addon
```

### I18n Module Implementations

```mermaid
graph LR
  subgraph Contracts
    i18n-dependency["i18n-dependency"]
    app-context-initialization-addon["app-context-initialization-addon<br/>---<br/><i>loadInitializeAppContext</i>"]
    initialize-extension-view-addon["initialize-extension-view-addon<br/>---<br/><i>loadInitializeExtensionView</i>"]
  end
  subgraph Modules
    module_0["i18n"]
  end
  module_0 -.->|implements| i18n-dependency
  module_0 -.->|implements| app-context-initialization-addon
  module_0 -.->|implements| initialize-extension-view-addon
```

### Posthog Client Module Implementations

```mermaid
graph LR
  subgraph Contracts
    posthog-dependency["posthog-dependency"]
  end
  subgraph Modules
    module_0["posthog-client-extension"]
    module_1["posthog-client-react-native"]
  end
  module_0 -.->|implements| posthog-dependency
  module_1 -.->|implements| posthog-dependency
```

### Recovery Module Implementations

```mermaid
graph LR
  subgraph Contracts
    recovery-phrase-channel-extension["recovery-phrase-channel-extension<br/>---<br/><i>loadRecoveryPhraseChannelExtension</i>"]
  end
  subgraph Modules
    module_0["recovery-phrase-channel-extension"]
  end
  module_0 -.->|implements| recovery-phrase-channel-extension
```

### Secure Store Module Implementations

```mermaid
graph LR
  subgraph Contracts
    secure-store["secure-store"]
    secure-store-addon["secure-store-addon<br/>---<br/><i>loadSecureStore</i>"]
    secure-store-dependency["secure-store-dependency"]
    local-authentication-dependency["local-authentication-dependency"]
  end
  subgraph Modules
    module_0["secure-store-extension"]
    module_1["secure-store-mobile"]
  end
  module_0 -.->|implements| secure-store
  module_0 -.->|implements| secure-store-addon
  module_0 -.->|implements| secure-store-dependency
  module_0 -.->|implements| local-authentication-dependency
  module_1 -.->|implements| secure-store
  module_1 -.->|implements| secure-store-addon
  module_1 -.->|implements| secure-store-dependency
  module_1 -.->|implements| local-authentication-dependency
```

### Storage Module Implementations

```mermaid
graph LR
  subgraph Contracts
    storage-dependency["storage-dependency"]
  end
  subgraph Modules
    module_0["storage-extension"]
    module_1["storage-in-memory"]
    module_2["storage-react-native-async"]
  end
  module_0 -.->|implements| storage-dependency
  module_1 -.->|implements| storage-dependency
  module_2 -.->|implements| storage-dependency
```

### Swap Module Implementations

```mermaid
graph LR
  subgraph Contracts
    swap-provider-dependency["swap-provider-dependency"]
  end
  subgraph Modules
    module_0["swap-provider-steelswap"]
  end
  module_0 -.->|implements| swap-provider-dependency
```

### Token Module Implementations

```mermaid
graph LR
  subgraph Contracts
    token-pricing-store["token-pricing-store"]
    token-pricing-provider-dependency["token-pricing-provider-dependency"]
  end
  subgraph Modules
    module_0["token-pricing-coingecko"]
  end
  module_0 -.->|implements| token-pricing-store
  module_0 -.->|implements| token-pricing-provider-dependency
```

### Vault Module Implementations

```mermaid
graph LR
  subgraph Contracts
    vault["vault"]
  end
  subgraph Modules
    module_0["vault-in-memory"]
  end
  module_0 -.->|implements| vault
```

### Vault (1) Module Implementations

```mermaid
graph LR
  subgraph Contracts
    onboarding-options-addon["onboarding-options-addon<br/>---<br/><i>loadOnboardingOptions</i>"]
    signer-factory-addon["signer-factory-addon<br/>---<br/><i>loadSignerFactory</i>"]
    hw-wallet-connector-addon["hw-wallet-connector-addon<br/>---<br/><i>loadHwWalletConnector</i>"]
    hw-blockchain-support-addon["hw-blockchain-support-addon<br/>---<br/><i>loadHwBlockchainSupport</i>"]
    ledger-hw-account-connector-addon["ledger-hw-account-connector-addon<br/>---<br/><i>loadLedgerHwAccountConnector</i>"]
    vault["vault"]
    trezor-hw-account-connector-addon["trezor-hw-account-connector-addon<br/>---<br/><i>loadTrezorHwAccountConnector</i>"]
  end
  subgraph Modules
    module_0["vault-keystone"]
    module_1["vault-ledger"]
    module_2["vault-seed-signer"]
    module_3["vault-trezor"]
  end
  module_0 -.->|implements| onboarding-options-addon
  module_0 -.->|implements| signer-factory-addon
  module_0 -.->|implements| hw-wallet-connector-addon
  module_0 -.->|implements| hw-blockchain-support-addon
  module_1 -.->|implements| onboarding-options-addon
  module_1 -.->|implements| signer-factory-addon
  module_1 -.->|implements| hw-wallet-connector-addon
  module_1 -.->|implements| hw-blockchain-support-addon
  module_1 -.->|implements| ledger-hw-account-connector-addon
  module_2 -.->|implements| onboarding-options-addon
  module_2 -.->|implements| signer-factory-addon
  module_2 -.->|implements| hw-wallet-connector-addon
  module_2 -.->|implements| hw-blockchain-support-addon
  module_3 -.->|implements| vault
  module_3 -.->|implements| onboarding-options-addon
  module_3 -.->|implements| signer-factory-addon
  module_3 -.->|implements| hw-wallet-connector-addon
  module_3 -.->|implements| hw-blockchain-support-addon
  module_3 -.->|implements| trezor-hw-account-connector-addon
```
