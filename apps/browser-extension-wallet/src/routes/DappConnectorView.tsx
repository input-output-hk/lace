import React, { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@stores';
import { UnlockWalletContainer } from '@src/features/unlock-wallet';
import { useRedirection, useWalletManager, useAppInit } from '@src/hooks';
import { dAppRoutePaths, walletRoutePaths } from '@routes';
import '@lib/i18n';
import 'antd/dist/antd.css';
import { Route, Switch } from 'react-router-dom';
import { MainLayout } from '@components/Layout';
import {
  Connect as DappConnect,
  SignTxFlowContainer,
  SignDataFlowContainer,
  DappTransactionSuccess,
  DappTransactionFail,
  DappCollateralContainer
} from '../features/dapp';
import { Loader } from '@lace/common';
import styles from './DappConnectorView.module.scss';
import { getValueFromLocalStorage } from '@src/utils/local-storage';
import { lockWalletSelector } from '@src/features/unlock-wallet/selectors';
import { useAppSettingsContext } from '@providers';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { DappError } from '@src/features/dapp/components/DappError';
import { tabs } from 'webextension-polyfill';
import { useTranslation } from 'react-i18next';

dayjs.extend(duration);

const isLastValidationExpired = (lastVerification: string, frequency: string): boolean => {
  const lastValidationDate = dayjs(Number(lastVerification));
  const expirationDate = lastValidationDate.add(dayjs.duration({ days: Number(frequency) }));
  return expirationDate.isBefore(dayjs());
};

// TODO: unify providers and logic to load wallet and such for popup, dapp and browser view in one place [LW-5341]
export const DappConnectorView = (): React.ReactElement => {
  const { t } = useTranslation();
  const [{ lastMnemonicVerification, mnemonicVerificationFrequency }] = useAppSettingsContext();
  const { inMemoryWallet, keyAgentData, currentChain, walletInfo, setKeyAgentData, initialHdDiscoveryCompleted } =
    useWalletStore();
  const { isWalletLocked, walletLock } = useWalletStore(lockWalletSelector);
  const [hasNoAvailableWallet, setHasNoAvailableWallet] = useState(false);
  const { loadWallet } = useWalletManager();
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);

  useAppInit();

  useEffect(() => {
    const load = async () => {
      // try to get key agent data from local storage if exist and initialize state
      // If no key agent and the wallet is not locked, display a message
      const keyAgentFromStorage = getValueFromLocalStorage('keyAgentData');
      if (!keyAgentFromStorage && !isWalletLocked()) {
        setHasNoAvailableWallet(true);
      } else {
        setKeyAgentData(keyAgentFromStorage);
      }
    };
    load();
  }, [setKeyAgentData, isWalletLocked, currentChain]);

  useEffect(() => {
    // TODO: LW-7807 revise the sdk cip30 implementation
    const callback = (result: boolean) => {
      if (result) {
        redirectToSignSuccess();
      } else {
        redirectToSignFailure();
      }
    };
    loadWallet(callback);
    setIsLoadingWallet(true);
  }, [walletInfo, inMemoryWallet, isLoadingWallet, loadWallet, redirectToSignFailure, redirectToSignSuccess]);

  const onCloseClick = useCallback(() => {
    tabs.create({ url: `app.html#${walletRoutePaths.setup.home}` });
    window.close();
  }, []);

  if (hasNoAvailableWallet) {
    return (
      <MainLayout useSimpleHeader hideFooter showAnnouncement={false} showBetaPill>
        <DappError
          title={t('dapp.noWallet.heading')}
          description={t('dapp.noWallet.description')}
          closeButtonLabel={t('dapp.noWallet.closeButton')}
          onCloseClick={onCloseClick}
          containerTestId="no-wallet-container"
          imageTestId="no-wallet-image"
          titleTestId="no-wallet-heading"
          descriptionTestId="no-wallet-description"
          closeButtonTestId="create-or-restore-wallet-btn"
        />
      </MainLayout>
    );
  }

  const checkMnemonicVerificationFrequency = () =>
    mnemonicVerificationFrequency && isLastValidationExpired(lastMnemonicVerification, mnemonicVerificationFrequency);

  if (checkMnemonicVerificationFrequency() && walletLock) {
    return <UnlockWalletContainer validateMnemonic />;
  }

  // Locked
  if (isWalletLocked()) {
    return <UnlockWalletContainer />;
  }

  if (keyAgentData && walletInfo && inMemoryWallet && initialHdDiscoveryCompleted) {
    return (
      <MainLayout useSimpleHeader hideFooter showAnnouncement={false} showBetaPill>
        <Switch>
          <Route exact path={dAppRoutePaths.dappConnect} component={DappConnect} />
          <Route exact path={dAppRoutePaths.dappSignTx} component={SignTxFlowContainer} />
          <Route exact path={dAppRoutePaths.dappSignData} component={SignDataFlowContainer} />
          <Route exact path={dAppRoutePaths.dappTxSignSuccess} component={DappTransactionSuccess} />
          <Route exact path={dAppRoutePaths.dappTxSignFailure} component={DappTransactionFail} />
          <Route exact path={dAppRoutePaths.dappSetCollateral} component={DappCollateralContainer} />
        </Switch>
      </MainLayout>
    );
  }
  return <Loader className={styles.loader} />;
};
