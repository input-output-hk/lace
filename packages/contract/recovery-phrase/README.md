# @lace-contract/recovery-phrase

A contract that manages secure access to wallet recovery phrases with authentication protection.

## Overview

This contract provides a secure interface for requesting, decrypting, and displaying wallet recovery phrases. It integrates with the authentication system to ensure only authorized users can access sensitive mnemonic data.

## Features

- **Secure Recovery Phrase Access**: Handles requests for wallet recovery phrases with proper authentication
- **Authentication Integration**: Requires user password verification before revealing recovery phrases
- **State Management**: Tracks loading states, errors, and securely manages mnemonic data in memory
- **Navigation Support**: Integrates with navigation to display recovery phrases in appropriate screens
- **Secure Cleanup**: Safely clears recovery phrase data from memory when no longer needed

## Dependencies

- `@lace-contract/authentication-prompt` - For user authentication
- `@lace-contract/wallet-repo` - For wallet data access
- `@cardano-sdk/key-management` - For EMIP-3 decryption

## Main Actions

- `requestRecoveryPhrase` - Request recovery phrase with authentication prompt
- `requestRecoveryPhraseForDisplay` - Request recovery phrase specifically for display screens
- `recoveryPhraseReceived` - Handle successful recovery phrase retrieval
- `recoveryPhraseFailed` - Handle recovery phrase request failures
- `recoveryPhraseCleared` - Securely clear recovery phrase from memory

## State

The contract manages the following state:

- `walletId` - ID of the wallet whose recovery phrase is being accessed
- `mnemonic` - The decrypted recovery phrase (securely stored as Serializable<ByteArray[]>)
- `isLoading` - Loading state during recovery phrase operations
- `error` - Any error messages from failed operations

## Usage

### In React Components

```typescript
import { useLaceSelector, useDispatchLaceAction } from './hooks'; // Module-specific hooks

const RecoveryPhraseComponent = ({ walletId }: { walletId: string }) => {
  // Access recovery phrase state
  const recoveryPhrase = useLaceSelector('recoveryPhrase.getRecoveryPhrase');

  // Access recovery phrase for specific wallet
  const walletRecoveryPhrase = useLaceSelector(
    'recoveryPhrase.getRecoveryPhraseForWallet',
    walletId,
  );

  // Dispatch actions
  const requestRecoveryPhrase = useDispatchLaceAction(
    'recoveryPhrase.requestRecoveryPhrase',
  );
  const requestRecoveryPhraseForDisplay = useDispatchLaceAction(
    'recoveryPhrase.requestRecoveryPhraseForDisplay',
  );
  const clearRecoveryPhrase = useDispatchLaceAction(
    'recoveryPhrase.recoveryPhraseCleared',
  );

  const handleShowRecoveryPhrase = () => {
    requestRecoveryPhrase({
      walletId,
      authenticationPromptConfig: {
        cancellable: true,
        confirmButtonLabel: 'common.confirm',
        message: 'recoveryPhrase.authPrompt.message',
      },
    });
  };

  const handleClearRecoveryPhrase = () => {
    clearRecoveryPhrase(walletId);
  };
```

## Security Notes

- Recovery phrases are stored as `Serializable<ByteArray[]>` for secure memory management and Redux serialization
- Data is automatically cleared when no longer needed
- All access requires user authentication through password verification
- Failed authentication attempts are logged and tracked
- The `Serializable` wrapper ensures proper handling of non-serializable `Uint8Array` data in Redux state
