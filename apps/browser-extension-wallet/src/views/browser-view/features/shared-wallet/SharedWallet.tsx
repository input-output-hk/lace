import React from 'react';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { Modal } from 'antd';
import { NavigationButton } from '@lace/common';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import styles from '@views/browser/features/multi-wallet/MultiWallet.module.scss';
import { SharedWalletGetStarted } from './SharedWalletGetStarted';
import { walletRoutePaths } from '@routes';
import { SharedWalletCreationFlow } from './create-flow';

export const SharedWallet = (): JSX.Element => {
  const history = useHistory();
  const { page, setBackgroundPage } = useBackgroundPage();

  return (
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
        <Route exact path={walletRoutePaths.sharedWallet.create} component={SharedWalletCreationFlow} />
        <Route exact path={walletRoutePaths.sharedWallet.root} component={SharedWalletGetStarted} />
        <Redirect from="/" to={walletRoutePaths.sharedWallet.root} />
      </Switch>
    </Modal>
  );
};
