import { WalletSetupConnectHardwareWalletStep } from '@lace/core';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { isTrezorHWSupported } from '../../../wallet-setup/helpers';
import { Wallet } from '@lace/cardano';
import { useHardwareWallet } from '../context';
import { walletRoutePaths } from '@routes';
import { ErrorHandling } from './ErrorHandling';
import { WalletType } from '@cardano-sdk/web-extension';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

interface State {
  error?: 'notDetectedLedger' | 'notDetectedTrezor';
}

export const Connect = (): JSX.Element => {
  const { t } = useTranslation();
  const history = useHistory();
  const { connect, data } = useHardwareWallet();
  const [state, setState] = useState<State>({});
  const analytics = useAnalyticsContext();

  const walletSetupConnectHardwareWalletStepTranslations = {
    title: t('core.walletSetupConnectHardwareWalletStep.title'),
    subTitle: t(`core.walletSetupConnectHardwareWalletStep.${isTrezorHWSupported() ? 'subTitleFull' : 'subTitle'}`),
    supportedDevices: t(
      `core.walletSetupConnectHardwareWalletStep.${isTrezorHWSupported() ? 'supportedDevicesFull' : 'supportedDevices'}`
    ),
    connectDevice: t(
      `core.walletSetupConnectHardwareWalletStep.${isTrezorHWSupported() ? 'connectDeviceFull' : 'connectDevice'}`
    )
  };

  const clearError = () => setState({ error: undefined });

  const handleConnect = async (model: Wallet.HardwareWallets) => {
    connect(model)
      .then(() => {
        clearError();
      })
      .catch(() => {
        setState({
          error: model === WalletType.Trezor ? 'notDetectedTrezor' : 'notDetectedLedger'
        });
      });
  };

  return (
    <>
      <ErrorHandling error={state.error} onRetry={clearError} />
      <WalletSetupConnectHardwareWalletStep
        wallets={Wallet.AVAILABLE_WALLETS}
        onBack={() => history.push(walletRoutePaths.newWallet.root)}
        onConnect={handleConnect}
        onNext={() => {
          analytics.sendEventToPostHog(PostHogAction.MultiWalletHWConnectNextClick);
          history.push(walletRoutePaths.newWallet.hardware.select);
        }}
        isNextEnable={Boolean(data.connection)}
        translations={walletSetupConnectHardwareWalletStepTranslations}
        isHardwareWallet
      />
    </>
  );
};
