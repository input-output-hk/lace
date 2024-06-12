/* eslint-disable unicorn/no-null */
import { NavigationButton } from '@lace/common';
import { WalletSetupConfirmationDialogProvider } from '@lace/core';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { walletRoutePaths } from '@routes';
import { Modal } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';
import styles from './MultiWallet.module.scss';
import { WalletOnboardingFlows } from '../../components';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { Home } from './Home';

export const MultiWallet = (): JSX.Element => {
  const history = useHistory();
  const { page, setBackgroundPage } = useBackgroundPage();

  return (
    <WalletSetupConfirmationDialogProvider>
      {({ isDialogOpen, withConfirmationDialog, shouldShowDialog$ }) => (
        <Modal centered closable={false} footer={null} open={!isDialogOpen} width="100%" className={styles.modal}>
          <div className={styles.closeButton}>
            <NavigationButton
              icon="cross"
              onClick={withConfirmationDialog(() => {
                setBackgroundPage();
                history.push(page);
              })}
            />
          </div>
          <WalletOnboardingFlows
            mergeEventRequiredpostHogActions={postHogMultiWalletActions}
            renderHome={() => <Home />}
            setFormDirty={(dirty) => shouldShowDialog$.next(dirty)}
            urlPath={walletRoutePaths.newWallet}
          />
        </Modal>
      )}
    </WalletSetupConfirmationDialogProvider>
  );
};
