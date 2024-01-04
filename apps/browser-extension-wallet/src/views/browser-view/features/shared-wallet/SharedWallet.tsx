import React from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { Modal } from 'antd';
import { WalletSetupFlow, WalletSetupFlowProvider } from '@lace/core';
import { NavigationButton } from '@lace/common';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import styles from '@views/browser/features/multi-wallet/MultiWallet.module.scss';
import { SetupSharedWalletStep } from '@views/browser/features/shared-wallet/ui-flow/setup/SetupSharedWalletStep';

export const SharedWallet = (): JSX.Element => {
  const { path } = useRouteMatch();
  const history = useHistory();
  const { page, setBackgroundPage } = useBackgroundPage();

  return (
    <WalletSetupFlowProvider flow={WalletSetupFlow.SHARED_WALLET}>
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
          <Route exact path={`${path}/`} component={SetupSharedWalletStep} />
        </Switch>
      </Modal>
    </WalletSetupFlowProvider>
  );
};
