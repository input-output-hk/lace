import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@stores';
import { PostHogAction, useObservable } from '@lace/common';
import { withSignDataConfirmation } from '@lib/wallet-api-ui';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import { HexBlob } from '@cardano-sdk/util';
import { Password } from '@input-output-hk/lace-ui-toolkit';
import { useAnalyticsContext } from '@providers';
import { useSecrets } from '@lace/core';

interface SignMessageState {
  usedAddresses: { address: string; id: number }[];
  isSigningInProgress: boolean;
  signatureObject: Cip30DataSignature | undefined;
  error: string;
  hardwareWalletError: string;
  isHardwareWallet: boolean;
  performSigning: (address: string, message: string, password: Partial<Password>) => void;
  resetSigningState: () => void;
}

export const useSignMessageState = (): SignMessageState => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const { clearSecrets } = useSecrets();

  const { inMemoryWallet, isHardwareWallet } = useWalletStore();
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [signature, setSignature] = useState<Cip30DataSignature>();
  const [error, setError] = useState<string>('');
  const [hardwareWalletError, setHardwareWalletError] = useState<string>('');

  const addresses = useObservable(inMemoryWallet?.addresses$);

  const resetSigningState = useCallback(() => {
    setIsSigningInProgress(false);
    setError('');
    setHardwareWalletError('');
  }, []);

  const performSigning = useCallback(
    async (address: string, message: string, password: Partial<Password>) => {
      setIsSigningInProgress(true);
      setError('');
      setHardwareWalletError('');
      try {
        const payload = HexBlob.fromBytes(new TextEncoder().encode(message));
        isHardwareWallet
          ? analytics.sendEventToPostHog(PostHogAction.SignMessageAskingHardwareWalletInteraction)
          : analytics.sendEventToPostHog(PostHogAction.SignMessageAskingForPassword);
        const signatureGenerated = await withSignDataConfirmation(
          async () =>
            await inMemoryWallet.signData({
              signWith: address as Wallet.Cardano.PaymentAddress,
              payload
            }),
          !isHardwareWallet ? password : {},
          clearSecrets
        );

        setSignature(signatureGenerated);
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
    [inMemoryWallet, isHardwareWallet, t, analytics, clearSecrets]
  );

  const usedAddresses =
    addresses?.map((address, index) => ({
      address: address.address.toString(),
      id: index
    })) || [];

  return {
    usedAddresses,
    isSigningInProgress,
    signatureObject: signature,
    error,
    hardwareWalletError,
    isHardwareWallet,
    performSigning,
    resetSigningState
  };
};
