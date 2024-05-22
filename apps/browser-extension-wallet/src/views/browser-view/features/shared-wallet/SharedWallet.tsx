import React from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { Modal } from 'antd';
import { SetupSharedWallet, WalletSetupFlow, WalletSetupFlowProvider } from '@lace/core';
import { NavigationButton } from '@lace/common';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import styles from '@views/browser/features/multi-wallet/MultiWallet.module.scss';
import { SharedWalletGetStarted } from '@views/browser/features/shared-wallet/ui-flow/get-started/SharedWalletGetStarted';
import { useWalletStore } from '@src/stores';

export const SharedWallet = (): JSX.Element => {
  const { path } = useRouteMatch();
  const history = useHistory();
  const { page, setBackgroundPage } = useBackgroundPage();
  const {
    walletInfo: { name, addresses }
  } = useWalletStore();

  return (
    <WalletSetupFlowProvider flow={WalletSetupFlow.ADD_SHARED_WALLET}>
      <Modal
        centered
        closable={false}
        // eslint-disable-next-line unicorn/no-null
        footer={null}
        open
        width="100%"
        className={styles.modal}
      >
        <div className={styles.closeButton}>
          <NavigationButton
            icon="cross"
            onClick={() => {
              setBackgroundPage();
              history.push(page);
            }}
          />
        </div>
        <Switch>
          <Route exact path={`${path}/add-cosigners`}>
            <SetupSharedWallet walletName={name} address={addresses[0].address} onBack={() => history.goBack()} />
          </Route>
          <Route exact path={`${path}/wallet-name`}>
            <SetupSharedWallet
              walletName={name}
              address={addresses[0].address}
              onBack={() => history.goBack()}
              onNext={() => history.push(`${path}/add-cosigners`)}
            />
          </Route>
          <Route exact path={`${path}/`} component={SharedWalletGetStarted} />
        </Switch>
      </Modal>
    </WalletSetupFlowProvider>
  );
};
