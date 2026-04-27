# @lace-module/dapp-connector-extension

Extension platform implementation for dApp connector.

## Purpose

This module provides the platform-specific implementation of dApp connector dependencies for browser extensions. It implements the `dappConnectorPlatformDependencyContract` by providing the `connectAuthenticator` function using Chrome extension APIs.

## Key Responsibilities

- Expose authenticator API to content scripts via extension messaging
- Handle dApp authorization requests
- Check if dApps are already authorized
- Manage authenticator lifecycle

## Feature Flag

This module loads when any feature flag contains the key `DAPP_CONNECTOR`.

Example: `BLOCKCHAIN_MIDNIGHT_DAPP_CONNECTOR`, `BLOCKCHAIN_CARDANO_DAPP_CONNECTOR`
