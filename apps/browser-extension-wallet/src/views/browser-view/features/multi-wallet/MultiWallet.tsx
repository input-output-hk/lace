/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-multi-comp */
import React, { useEffect, useMemo } from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { Modal } from 'antd';

import styles from './MultiWallet.module.scss';

import { Home } from './components/Home';

import {
  WalletSetupConfirmationDialogProvider,
  WalletSetupFlow,
  WalletSetupFlowProvider,
  useWalletSetupConfirmationDialog
} from '@lace/core';
import { CreateWallet } from './create-wallet';
import { HardwareWallet } from './hardware-wallet';
import { RestoreWallet } from './restore-wallet';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks';
import { Subject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { NavigationButton, PostHogAction, toast } from '@lace/common';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { Providers } from './hardware-wallet/types';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import { useTranslation } from 'react-i18next';
import { WalletConflictError } from '@cardano-sdk/web-extension';
import { useAnalyticsContext } from '@providers';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';

const { newWallet } = walletRoutePaths;

const createWallet = (): Promise<void> => Promise.resolve(void 0);

interface ConfirmationDialog {
  shouldShowDialog$: Subject<boolean>;
}

export const SetupHardwareWallet = ({ shouldShowDialog$ }: ConfirmationDialog): JSX.Element => {
  const { t } = useTranslation();
  const { connectHardwareWallet, createHardwareWallet, walletRepository } = useWalletManager();
  const analytics = useAnalyticsContext();
  const disconnectHardwareWallet$ = useMemo(() => new Subject<HIDConnectionEvent>(), []);

  const hardwareWalletProviders = useMemo(
    (): Providers => ({
      connectHardwareWallet,
      disconnectHardwareWallet$,
      shouldShowDialog$,
      createWallet: async ({ account, connection, model, name }) => {
        try {
          const { source } = await createHardwareWallet({
            connectedDevice: model,
            deviceConnection: connection,
            name,
            accountIndex: account
          });
          await analytics.sendEventToPostHog(PostHogAction.MultiWalletHWAdded, {
            $set: { walletAccountsQty: await getWalletAccountsQtyString(walletRepository) }
          });
          await analytics.sendMergeEvent(source.account.extendedAccountPublicKey);
        } catch (error) {
          if (error instanceof WalletConflictError) {
            toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('multiWallet.walletAlreadyExists') });
          } else {
            throw error;
          }
        }
      }
    }),
    [connectHardwareWallet, createHardwareWallet, disconnectHardwareWallet$, shouldShowDialog$, t, analytics]
  );

  useEffect(() => {
    const onHardwareWalletDisconnect = (event: HIDConnectionEvent) => {
      disconnectHardwareWallet$.next(event);
    };

    navigator.hid.addEventListener('disconnect', onHardwareWalletDisconnect);

    return () => {
      navigator.hid.removeEventListener('disconnect', onHardwareWalletDisconnect);
      disconnectHardwareWallet$.complete();
    };
  }, [disconnectHardwareWallet$]);

  return <HardwareWallet providers={hardwareWalletProviders} />;
};

export const SetupCreateWallet = (confirmationDialog: ConfirmationDialog): JSX.Element => (
  <CreateWallet
    providers={{
      createWallet,
      generateMnemonicWords: Wallet.KeyManagement.util.generateMnemonicWords,
      confirmationDialog
    }}
  />
);

export const SetupRestoreWallet = (confirmationDialog: ConfirmationDialog): JSX.Element => (
  <RestoreWallet
    providers={{
      createWallet,
      confirmationDialog
    }}
  />
);

const Component = (): JSX.Element => {
  const { path } = useRouteMatch();
  const history = useHistory();
  const { page, setBackgroundPage } = useBackgroundPage();
  const { isDialogOpen, withConfirmationDialog, shouldShowDialog$ } = useWalletSetupConfirmationDialog();
  const closeWalletCreation = withConfirmationDialog(() => {
    setBackgroundPage();
    history.push(page);
  });

  return (
    <WalletSetupFlowProvider flow={WalletSetupFlow.ADD_WALLET}>
      <Modal centered closable={false} footer={null} open={!isDialogOpen} width="100%" className={styles.modal}>
        <div className={styles.closeButton}>
          <NavigationButton icon="cross" onClick={closeWalletCreation} />
        </div>
        <Switch>
          <Route
            path={newWallet.create.root}
            render={() => <SetupCreateWallet shouldShowDialog$={shouldShowDialog$} />}
          />
          <Route
            path={newWallet.hardware.root}
            render={() => <SetupHardwareWallet shouldShowDialog$={shouldShowDialog$} />}
          />
          <Route
            path={newWallet.restore.root}
            render={() => <SetupRestoreWallet shouldShowDialog$={shouldShowDialog$} />}
          />
          <Route exact path={`${path}/`} component={Home} />
        </Switch>
      </Modal>
    </WalletSetupFlowProvider>
  );
};

export const MultiWallet = (): JSX.Element => (
  <WalletSetupConfirmationDialogProvider>
    <Component />
  </WalletSetupConfirmationDialogProvider>
);
