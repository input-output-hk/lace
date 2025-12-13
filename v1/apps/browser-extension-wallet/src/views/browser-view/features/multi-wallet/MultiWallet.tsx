/* eslint-disable unicorn/no-null */
import { NavigationButton } from '@lace/common';
import { WalletSetupConfirmationDialogProvider, WalletSetupFlow, WalletSetupFlowProvider } from '@lace/core';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { walletRoutePaths } from '@routes';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styles from './MultiWallet.module.scss';
import { WalletOnboardingFlows } from './WalletOnboardingFlows';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { Home } from './Home';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { WalletSetupLayout } from '@views/browser/components';
import { Portal } from '@views/browser/features/wallet-setup/components/Portal';
import { APP_MODE, cameFromLmpStorage, lmpModeStorage } from '@src/utils/lmp';

export const MultiWallet = (): JSX.Element => {
  const history = useHistory();
  const posthogClient = usePostHogClientContext();
  const { page, setBackgroundPage } = useBackgroundPage();
  const [cameFromLMP, setCameFromLMP] = useState(false);

  useEffect(() => {
    const checkCameFromLMP = async () => {
      const result = await cameFromLmpStorage.get();
      if (result) {
        setCameFromLMP(true);
      }
    };
    void checkCameFromLMP();
  }, []);

  const handleOnCancel = useCallback(
    (withConfirmationDialog: (callback: () => void) => () => void) => {
      withConfirmationDialog(async () => {
        if (cameFromLMP) {
          await cameFromLmpStorage.clear();
          await lmpModeStorage.set(APP_MODE.LMP);
          window.location.href = '/tab.html';
          return;
        }
        setBackgroundPage();
        history.push(page);
        window.location.reload();
      })();
    },
    [history, page, setBackgroundPage, cameFromLMP]
  );

  return (
    <WalletSetupFlowProvider flow={WalletSetupFlow.ADD_WALLET}>
      <WalletSetupConfirmationDialogProvider>
        {({ withConfirmationDialog, shouldShowDialog$ }) => (
          <Portal>
            <WalletSetupLayout>
              <div className={styles.contentWrapper}>
                <div className={styles.closeButton}>
                  <NavigationButton icon="cross" onClick={() => handleOnCancel(withConfirmationDialog)} />
                </div>
                <WalletOnboardingFlows
                  mergeEventRequired
                  postHogActions={postHogMultiWalletActions}
                  renderHome={() => <Home />}
                  setFormDirty={(dirty) => shouldShowDialog$.next(dirty)}
                  urlPath={walletRoutePaths.newWallet}
                  flowsEnabled={!!posthogClient.featureFlagsByNetwork}
                />
              </div>
            </WalletSetupLayout>
          </Portal>
        )}
      </WalletSetupConfirmationDialogProvider>
    </WalletSetupFlowProvider>
  );
};
