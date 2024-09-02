import React from 'react';
import { useSignMessageState } from './useSignMessageState';
import { SignMessage } from './SignMessage';

export const SignMessageDrawer: React.FC = () => {
  const {
    usedAddresses,
    isSigningInProgress,
    signature,
    error,
    hardwareWalletError,
    isHardwareWallet,
    performSigning,
    closeDrawer
  } = useSignMessageState();

  return (
    <>
      <SignMessage
        addresses={usedAddresses}
        onClose={closeDrawer}
        onSign={performSigning}
        isSigningInProgress={isSigningInProgress}
        signedMessage={signature}
        error={error}
        hardwareWalletError={hardwareWalletError}
        isHardwareWallet={isHardwareWallet}
      />
    </>
  );
};
