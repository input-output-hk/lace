import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { HexBlob } from '@cardano-sdk/util';
import { useWalletStore } from '@stores';
import { useObservable } from '@lace/common';
import { SignMessage, Password, OnPasswordChange } from '@lace/core';
import { withSignDataConfirmation } from '@lib/wallet-api-ui';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import { useDrawer } from '@views/browser/stores';
import { Spin } from 'antd';

export const SignMessageDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { inMemoryWallet } = useWalletStore();
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [signature, setSignature] = useState<Cip30DataSignature | null>();
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true);
  const [isPasswordPromptVisible, setIsPasswordPromptVisible] = useState(false);
  const [selectedAddressToSign, setSelectedAddressToSign] = useState<string>('');
  const [messageToSign, setMessageToSign] = useState<string>('');
  const [, closeDrawer] = useDrawer();

  const addresses = useObservable(inMemoryWallet?.addresses$);

  const handlePasswordChange: OnPasswordChange = useCallback((target) => {
    setPassword(target.value);
    setIsPasswordValid(true);
  }, []);

  const onSign = async (selectedAddress: string, message: string) => {
    if (!inMemoryWallet) {
      setError(t('core.signMessage.walletNotInitialized'));
      return;
    }
    setSelectedAddressToSign(selectedAddress);
    setMessageToSign(message);
    setIsPasswordPromptVisible(true);
  };

  const handleConfirmSign = async () => {
    if (!inMemoryWallet) {
      setError(t('core.signMessage.walletNotInitialized'));
      return;
    }
    setIsSigningInProgress(true);
    setError('');
    try {
      const payload = HexBlob.fromBytes(new TextEncoder().encode(messageToSign));

      const signatureGenerated = await withSignDataConfirmation(
        async () =>
          await inMemoryWallet.signData({
            signWith: selectedAddressToSign as Wallet.Cardano.PaymentAddress,
            payload
          }),
        async () => password
      );

      setSignature(signatureGenerated);
      setIsPasswordPromptVisible(false);
      // eslint-disable-next-line no-console
      console.log('Message signed successfully:', signatureGenerated);
    } catch (signingError) {
      console.error('Error signing message:', signingError);
      if (signingError instanceof Wallet.KeyManagement.errors.AuthenticationError) {
        setIsPasswordValid(false);
      } else {
        setError(t('core.signMessage.signingFailed'));
        setIsPasswordPromptVisible(false);
      }
    } finally {
      setIsSigningInProgress(false);
    }
  };

  const usedAddresses =
    addresses?.map((address, index) => ({
      address: address.address.toString(),
      id: index
    })) || [];

  if (isPasswordPromptVisible) {
    return (
      <div>
        <h5>{t('core.signMessage.instructions')}</h5>
        <Spin spinning={isSigningInProgress}>
          <Password
            onChange={handlePasswordChange}
            error={!isPasswordValid}
            errorMessage={t('core.signMessage.signingFailed')}
          />
        </Spin>
        <button onClick={handleConfirmSign} disabled={!password || isSigningInProgress}>
          {t('core.signMessage.nextButton')}
        </button>
        <button onClick={() => setIsPasswordPromptVisible(false)}>{t('core.signMessage.cancelButton')}</button>
      </div>
    );
  }

  return (
    <SignMessage
      addresses={usedAddresses}
      onClose={closeDrawer}
      onSign={onSign}
      isSigningInProgress={isSigningInProgress}
      signature={signature}
      error={error}
      visible
    />
  );
};
