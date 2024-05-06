/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-multi-comp */
import React from 'react';
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
import { Subject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { NavigationButton } from '@lace/common';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';

const { newWallet } = walletRoutePaths;

interface Props {
  shouldShowConfirmationDialog$: Subject<boolean>;
}

export const SetupHardwareWallet = ({ shouldShowConfirmationDialog$ }: Props): JSX.Element => (
  <HardwareWallet
    providers={{
      shouldShowConfirmationDialog$
    }}
  />
);

export const SetupCreateWallet = ({ shouldShowConfirmationDialog$ }: Props): JSX.Element => (
  <CreateWallet
    providers={{
      generateMnemonicWords: Wallet.KeyManagement.util.generateMnemonicWords,
      shouldShowConfirmationDialog$
    }}
  />
);

export const SetupRestoreWallet = ({ shouldShowConfirmationDialog$ }: Props): JSX.Element => (
  <RestoreWallet
    providers={{
      shouldShowConfirmationDialog$
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
            render={() => <SetupCreateWallet shouldShowConfirmationDialog$={shouldShowDialog$} />}
          />
          <Route
            path={newWallet.hardware.root}
            render={() => <SetupHardwareWallet shouldShowConfirmationDialog$={shouldShowDialog$} />}
          />
          <Route
            path={newWallet.restore.root}
            render={() => <SetupRestoreWallet shouldShowConfirmationDialog$={shouldShowDialog$} />}
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
