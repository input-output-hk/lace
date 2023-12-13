/* eslint-disable unicorn/no-null */
/* eslint-disable react/no-multi-comp */
import React, { useEffect, useMemo } from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { Modal } from 'antd';

import styles from './MultiWallet.module.scss';

import { Home } from './components/Home';

import { WalletSetupFlow, WalletSetupFlowProvider } from '@lace/core';
import { CreateWallet } from './create-wallet';
import { HardwareWallet } from './hardware-wallet';
import { RestoreWallet } from './restore-wallet';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks';
import { Subject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { NavigationButton } from '@lace/common';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { useCancelDialog } from './useCancelDialog';
import { CancelDialog } from './components/CancelDialog';

const { newWallet } = walletRoutePaths;

const createWallet = (): Promise<void> => Promise.resolve(void 0);

export const SetupHardwareWallet = (): JSX.Element => {
  const { connectHardwareWallet } = useWalletManager();
  const disconnectHardwareWallet$ = useMemo(() => new Subject<HIDConnectionEvent>(), []);

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

  return (
    <HardwareWallet
      providers={{
        connectHardwareWallet,
        createWallet,
        disconnectHardwareWallet$
      }}
    />
  );
};

export const SetupCreateWallet = (): JSX.Element => (
  <CreateWallet
    providers={{
      createWallet,
      generateMnemonicWords: Wallet.KeyManagement.util.generateMnemonicWords
    }}
  />
);

export const SetupRestoreWallet = (): JSX.Element => (
  <RestoreWallet
    providers={{
      createWallet
    }}
  />
);

export const MultiWallet = (): JSX.Element => {
  const { path } = useRouteMatch();
  const history = useHistory();
  const { page, setBackgroundPage } = useBackgroundPage();
  const closeWalletCreation = () => {
    setBackgroundPage();
    history.push(page);
  };
  const { closeWithDialog, isDialogOpen, setIsDialogOpen, setRef, reset$ } = useCancelDialog(closeWalletCreation);

  useEffect(() => {
    const unsubscribe = history.listen((event) => {
      if (event.pathname === newWallet.root) {
        reset$.next(true);
      }
    });

    return () => {
      unsubscribe();
    };
  });

  return (
    <WalletSetupFlowProvider flow={WalletSetupFlow.ADD_WALLET}>
      <CancelDialog open={isDialogOpen} setOpen={setIsDialogOpen} onClose={closeWalletCreation} />
      <Modal centered closable={false} footer={null} open={!isDialogOpen} width="100%" className={styles.modal}>
        <div className={styles.closeButton}>
          <NavigationButton icon="cross" onClick={closeWithDialog} />
        </div>
        <div ref={setRef}>
          <Switch>
            <Route path={newWallet.create.root} component={SetupCreateWallet} />
            <Route path={newWallet.hardware.root} component={SetupHardwareWallet} />
            <Route path={newWallet.restore.root} component={SetupRestoreWallet} />
            <Route exact path={`${path}/`} component={Home} />
          </Switch>
        </div>
      </Modal>
    </WalletSetupFlowProvider>
  );
};
