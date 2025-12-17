import { walletRoutePaths } from '@routes/wallet-paths';
import React, { useCallback, useEffect, useState } from 'react';
import { deleteFromLocalStorage, getValueFromLocalStorage } from '@utils/local-storage';
import { Portal } from './Portal';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { WalletSetupMainPage } from './WalletSetupMainPage';
import { postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletOnboardingFlows } from '@views/browser/features/multi-wallet/WalletOnboardingFlows';
import { WalletSetupLayout } from '@views/browser/components';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { NavigationButton } from '@lace/common';
import { APP_MODE, cameFromLmpStorage, lmpModeStorage } from '@src/utils/lmp';
import styles from '@views/browser/features/multi-wallet/MultiWallet.module.scss';

export const WalletSetup = (): React.ReactElement => {
  const isForgotPasswordFlow = getValueFromLocalStorage('isForgotPasswordFlow');
  const posthogClient = usePostHogClientContext();
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

  useEffect(() => {
    if (!isForgotPasswordFlow) return () => void 0;

    // reset values in user ID service if the background storage and local storage are manually removed
    void getUserIdService().resetToDefaultValues();

    // delete "forgot_password" related data if user leaves the flow before completing
    const clearWallet = () => {
      deleteFromLocalStorage('wallet');
      deleteFromLocalStorage(ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY);
      deleteFromLocalStorage('isForgotPasswordFlow');
    };
    window.addEventListener('beforeunload', clearWallet);
    return () => {
      window.removeEventListener('beforeunload', clearWallet);
    };
  }, [isForgotPasswordFlow]);

  const handleCloseOnboarding = useCallback(async () => {
    await cameFromLmpStorage.clear();
    await lmpModeStorage.set(APP_MODE.LMP);
    window.location.href = '/tab.html';
  }, []);

  return (
    <Portal>
      <WalletSetupLayout>
        <div className={styles.contentWrapper}>
          {cameFromLMP && (
            <div className={styles.closeButton}>
              <NavigationButton icon="cross" onClick={handleCloseOnboarding} />
            </div>
          )}
          <WalletOnboardingFlows
            aliasEventRequired
            flowsEnabled={!!posthogClient.featureFlagsByNetwork}
            forgotPasswordFlowActive={isForgotPasswordFlow}
            postHogActions={{
              ...postHogOnboardingActions,
              hardware: postHogOnboardingActions.hw
            }}
            renderHome={() => <WalletSetupMainPage />}
            urlPath={walletRoutePaths.setup}
          />
        </div>
      </WalletSetupLayout>
    </Portal>
  );
};
