import {
  WalletSetupSteps,
  WalletSetupFlowProvider,
  WalletSetupFlow,
  WalletAnalyticsInfo
} from '@lace/core';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import {
  PostHogAction,
  postHogOnboardingActions,
  PostHogProperties,
  EnhancedAnalyticsOptInStatus,
  UserTrackingType
} from '@providers/AnalyticsProvider/analyticsTracker';
import { walletRoutePaths } from '@routes/wallet-paths';
import { ILocalStorage } from '@src/types';
import { deleteFromLocalStorage, getValueFromLocalStorage } from '@src/utils/local-storage';
import React, { useCallback, useEffect } from 'react';
import { Redirect, Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { HardwareWalletFlow } from './HardwareWalletFlow';
import { Portal } from './Portal';
import { SendOnboardingAnalyticsEvent, SetupType } from '../types';
import { WalletSetupWizard } from './WalletSetupWizard';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { WalletSetupMainPage } from './WalletSetupMainPage';
import { useLocalStorage } from '@hooks';
import { EnhancedAnalyticsOptInStatus } from '@providers/AnalyticsProvider/analyticsTracker';
import { ConfirmationBanner } from '@lace/common';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
const userIdService = getUserIdService();

// This initial step is needed for configure the step that we want to snapshot
export interface WalletSetupProps {
  initialStep?: WalletSetupSteps;
}

export const WalletSetup = ({ initialStep = WalletSetupSteps.Register }: WalletSetupProps): React.ReactElement => {
  const history = useHistory();
  const { path } = useRouteMatch();
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [isDappConnectorWarningOpen, setIsDappConnectorWarningOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const isForgotPasswordFlow = getValueFromLocalStorage<ILocalStorage, 'isForgotPasswordFlow'>('isForgotPasswordFlow');
  const { t: translate, Trans } = useTranslate();
  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );

  const isForgotPasswordFlow = getValueFromLocalStorage<ILocalStorage, 'isForgotPasswordFlow'>('isForgotPasswordFlow');
  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );

  useEffect(() => {
    const handleEnterKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Enter') {
        const nextBnt: HTMLButtonElement = document.querySelector('[data-testid="wallet-setup-step-btn-next"]');
        const confirmGoBack: HTMLButtonElement = document.querySelector('[data-testid="delete-address-modal-confirm"]');

        if (confirmGoBack) {
          confirmGoBack.click();
        } else if (nextBnt && !nextBnt.getAttribute('disabled')) {
          nextBnt.click();
        }
      }
    };
    document.addEventListener('keydown', handleEnterKeyPress);
    return () => {
      document.removeEventListener('keydown', handleEnterKeyPress);
    };
  }, []);

  const clearUserIdService = useCallback(async () => {
    await userIdService.resetToDefaultValues();
  }, []);
  // reset values in user ID service if the background storage and local storage are manually removed
  useEffect(() => {
    clearUserIdService();
  }, [clearUserIdService]);

  const clearWallet = useCallback(() => {
    deleteFromLocalStorage('wallet');
    deleteFromLocalStorage(ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY);
    deleteFromLocalStorage('isForgotPasswordFlow');
  }, []);

  // delete "forgot_password" related data if user leaves the flow before completing
  useEffect(() => {
    if (isForgotPasswordFlow) {
      window.addEventListener('beforeunload', clearWallet);
    }
    return () => {
      window.removeEventListener('beforeunload', clearWallet);
    };
  }, [clearWallet, isForgotPasswordFlow]);

  const cancelWalletFlow = () => history.push(walletRoutePaths.setup.home);

  const handleStartHardwareOnboarding = () => {
    setIsDappConnectorWarningOpen(true);
    analytics.sendEventToPostHog(postHogOnboardingActions.hw?.SETUP_OPTION_CLICK);
  };

  const sendAnalytics = async (args: { postHogAction: PostHogAction; postHogProperties?: PostHogProperties }) => {
    await analytics.sendEventToPostHog(args.postHogAction, args?.postHogProperties);
  };

  const handleAnalyticsChoice = async (isAccepted: boolean) => {
    const analyticsStatus = isAccepted ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut;
    setDoesUserAllowAnalytics(analyticsStatus);
    await analytics.setOptedInForEnhancedAnalytics(analyticsStatus);

    const postHogAnalyticsAgreeAction = postHogOnboardingActions.landing.ANALYTICS_AGREE_CLICK;
    const postHogAnalyticsRejectAction = postHogOnboardingActions.landing.ANALYTICS_REJECT_CLICK;

    const postHogAction = isAccepted ? postHogAnalyticsAgreeAction : postHogAnalyticsRejectAction;
    const postHogProperties = {
      // eslint-disable-next-line camelcase
      $set: { user_tracking_type: isAccepted ? UserTrackingType.Enhanced : UserTrackingType.Basic }
    };
    await sendAnalytics({
      postHogAction,
      postHogProperties
    });
  };

  const sendAnalyticsHandler: SendOnboardingAnalyticsEvent = async (postHogAction, postHogProperties) =>
    await analytics.sendEventToPostHog(postHogAction, postHogProperties);

  return (
    <WalletSetupFlowProvider flow={WalletSetupFlow.ONBOARDING}>
      <Portal>
        <Switch>
          <Route exact path={`${path}/`}>
            <WalletSetupMainPage />
            <ConfirmationBanner
              message={
                <div>
                  <span>
                    Help us improve the quality and performance of Lace by sharing analytics data from your browser.
                  </span>
                  <span className={styles.learnMore} onClick={() => setIsAnalyticsModalOpen(true)}>
                    Learn more
                  </span>
                </div>
              }
              onConfirm={() => handleAnalyticsChoice(true)}
              onReject={() => handleAnalyticsChoice(false)}
              showBanner={enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.NotSet}
            />
            <WarningModal
              header={<div className={styles.analyticsModalTitle}>{translate('core.walletAnalyticsInfo.title')}</div>}
              content={<WalletAnalyticsInfo />}
              visible={isAnalyticsModalOpen}
              confirmLabel={translate('core.walletAnalyticsInfo.gotIt')}
              onConfirm={() => setIsAnalyticsModalOpen(false)}
            />
          </Route>
          {enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.NotSet ? (
            <Redirect to="/" />
          ) : (
            <>
              <Route path={`${path}/create`}>
                <WalletSetupWizard
                  setupType={SetupType.CREATE}
                  onCancel={cancelWalletFlow}
                  sendAnalytics={sendAnalyticsHandler}
                  initialStep={initialStep}
                />
              </Route>
              <Route path={`${path}/restore`}>
                <WalletSetupWizard
                  setupType={isForgotPasswordFlow ? SetupType.FORGOT_PASSWORD : SetupType.RESTORE}
                  onCancel={cancelWalletFlow}
                  sendAnalytics={sendAnalyticsHandler}
                  initialStep={initialStep}
                />
              </Route>
              <Route path={`${path}/hardware`}>
                <HardwareWalletFlow
                  onCancel={cancelWalletFlow}
                  onAppReload={() => location.reload()}
                  sendAnalytics={sendAnalyticsHandler}
                />
              </Route>
            </>
          )}
        </Switch>
      </Portal>
    </WalletSetupFlowProvider>
  );
};
