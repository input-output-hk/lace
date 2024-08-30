import React from 'react';
import { SignMessagePassword } from './SignMessagePassword';
import { useSignMessageState } from './useSignMessageState';
import { SignMessage } from './SignMessage';

export const SignMessageDrawer: React.FC = () => {
  const {
    usedAddresses,
    handleSignData,
    isSigningInProgress,
    signature,
    error,
    hardwareWalletError,
    isHardwareWallet,
    showPasswordPrompt,
    handlePasswordChange,
    handlePasswordSubmit,
    closeDrawer
  } = useSignMessageState();

  const renderPasswordPrompt = () => (
    <SignMessagePassword
      isSigningInProgress={isSigningInProgress}
      error={error}
      handlePasswordChange={handlePasswordChange}
      handlePasswordSubmit={handlePasswordSubmit}
      closeDrawer={closeDrawer}
    />
  );

  const renderSignMessage = () => (
    <SignMessage
      addresses={usedAddresses}
      onClose={closeDrawer}
      onSign={handleSignData}
      isSigningInProgress={isSigningInProgress}
      signature={signature}
      error={error}
      hardwareWalletError={hardwareWalletError}
      isHardwareWallet={isHardwareWallet}
    />
  );

  return <>{!isHardwareWallet && showPasswordPrompt ? renderPasswordPrompt() : renderSignMessage()}</>;
};
