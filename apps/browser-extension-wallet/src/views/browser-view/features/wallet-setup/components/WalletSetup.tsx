import { walletRoutePaths } from '@routes/wallet-paths';
import React, { useEffect } from 'react';
import { deleteFromLocalStorage, getValueFromLocalStorage } from '@utils/local-storage';
import { Portal } from './Portal';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { WalletSetupMainPage } from './WalletSetupMainPage';
import { useLocalStorage } from '@hooks';
import { EnhancedAnalyticsOptInStatus, postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletOnboardingFlows } from '@views/browser/features/multi-wallet/WalletOnboardingFlows';
import { WalletSetupLayout } from '@views/browser/components';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

export const WalletSetup = (): React.ReactElement => {
  const isForgotPasswordFlow = getValueFromLocalStorage('isForgotPasswordFlow');
  const posthogClient = usePostHogClientContext();
  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );

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

  return (
    <Portal>
      <WalletSetupLayout>
        <WalletOnboardingFlows
          aliasEventRequired
          flowsEnabled={enhancedAnalyticsStatus !== EnhancedAnalyticsOptInStatus.NotSet && !!posthogClient.featureFlags}
          forgotPasswordFlowActive={isForgotPasswordFlow}
          postHogActions={{
            ...postHogOnboardingActions,
            hardware: postHogOnboardingActions.hw
          }}
          renderHome={() => <WalletSetupMainPage />}
          urlPath={walletRoutePaths.setup}
        />
      </WalletSetupLayout>
    </Portal>
  );
};
