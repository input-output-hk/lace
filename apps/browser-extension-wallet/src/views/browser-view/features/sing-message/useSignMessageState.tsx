import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@stores';
import { useObservable } from '@lace/common';
import { withSignDataConfirmation } from '@lib/wallet-api-ui';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import { HexBlob } from '@cardano-sdk/util';
import { useDrawer } from '@views/browser/stores';
import { OnPasswordChange } from '@input-output-hk/lace-ui-toolkit';

interface SignMessageState {
  usedAddresses: { address: string; id: number }[];
  handleSignData: (address: string, message: string) => Promise<void>;
  isSigningInProgress: boolean;
  signature: Cip30DataSignature | undefined;
  error: string;
  hardwareWalletError: string;
  isHardwareWallet: boolean;
  showPasswordPrompt: boolean;
  handlePasswordChange: OnPasswordChange;
  handlePasswordSubmit: () => void;
  closeDrawer: () => void;
  messageToSign: string;
  selectedAddress: string;
}

export const useSignMessageState = (): SignMessageState => {
  const { t } = useTranslation();
  const { inMemoryWallet, isHardwareWallet } = useWalletStore();
  const [, setDrawerConfig] = useDrawer();
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [signature, setSignature] = useState<Cip30DataSignature>();
  const [error, setError] = useState<string>('');
  const [hardwareWalletError, setHardwareWalletError] = useState<string>('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [messageToSign, setMessageToSign] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  // Use a ref to store the current password
  const passwordRef = useRef<string>('');

  const addresses = useObservable(inMemoryWallet?.addresses$);

  const handlePasswordChange: OnPasswordChange = useCallback((event) => {
    passwordRef.current = event?.value || '';
  }, []);

  const performSigning = useCallback(
    async (address: string, message: string) => {
      setIsSigningInProgress(true);
      setError('');
      setHardwareWalletError('');
      try {
        const payload = HexBlob.fromBytes(new TextEncoder().encode(message));

        const signatureGenerated = await withSignDataConfirmation(
          async () =>
            await inMemoryWallet.signData({
              signWith: address as Wallet.Cardano.PaymentAddress,
              payload
            }),
          isHardwareWallet ? '' : passwordRef.current
        );

        setSignature(signatureGenerated);
        setShowPasswordPrompt(false);
      } catch (signingError: unknown) {
        console.error('Error signing message:', signingError);
        if (
          isHardwareWallet &&
          typeof signingError === 'object' &&
          signingError !== null &&
          'message' in signingError &&
          typeof signingError.message === 'string' &&
          signingError.message.includes("Failed to execute 'requestDevice' on 'USB'")
        ) {
          setHardwareWalletError(t('core.signMessage.hardwareWalletNotConnected'));
        } else if (signingError instanceof Wallet.KeyManagement.errors.AuthenticationError) {
          setError(t('core.signMessage.incorrectPassword'));
        } else {
          setError(t('core.signMessage.signingFailed'));
        }
      } finally {
        setIsSigningInProgress(false);
      }
    },
    [inMemoryWallet, isHardwareWallet, t]
  );

  const handleSignData = useCallback(
    async (address: string, message: string) => {
      if (!inMemoryWallet) {
        setError(t('core.signMessage.walletNotInitialized'));
        return;
      }

      setSelectedAddress(address);
      setMessageToSign(message);

      if (!isHardwareWallet) {
        setShowPasswordPrompt(true);
      } else {
        await performSigning(address, message);
      }
    },
    [inMemoryWallet, isHardwareWallet, performSigning, t]
  );

  const handlePasswordSubmit = useCallback(() => {
    if (selectedAddress && messageToSign) {
      performSigning(selectedAddress, messageToSign);
    }
  }, [selectedAddress, messageToSign, performSigning]);

  const closeDrawer = useCallback(() => {
    setDrawerConfig();
  }, [setDrawerConfig]);

  const usedAddresses =
    addresses?.map((address, index) => ({
      address: address.address.toString(),
      id: index
    })) || [];

  return {
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
    closeDrawer,
    messageToSign,
    selectedAddress
  };
};
