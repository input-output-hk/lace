import React from 'react';
import { useSignMessageState } from './useSignMessageState';
import { useDrawerConfiguration } from './useDrawerConfiguration';
import { SignMessageForm } from './SignMessageForm';
import { SignMessageResult } from './SignMessageResult';
import styles from './SignMessageDrawer.module.scss';

export const SignMessageDrawer: React.FC = () => {
  const {
    usedAddresses,
    isSigningInProgress,
    signatureObject,
    error,
    hardwareWalletError,
    isHardwareWallet,
    performSigning
  } = useSignMessageState();

  useDrawerConfiguration();

  return (
    <div data-testid="sign-message" className={styles.container}>
      {signatureObject?.signature ? (
        <SignMessageResult signature={signatureObject.signature} />
      ) : (
        <SignMessageForm
          usedAddresses={usedAddresses}
          isSigningInProgress={isSigningInProgress}
          error={error}
          hardwareWalletError={hardwareWalletError}
          isHardwareWallet={isHardwareWallet}
          performSigning={performSigning}
        />
      )}
    </div>
  );
};
