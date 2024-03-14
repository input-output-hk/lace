import { WalletSetupOptionsStep, WalletSetupSteps, WalletSetupFlowProvider, WalletSetupFlow } from '@lace/core';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import {
  PostHogAction,
  postHogOnboardingActions,
  PostHogProperties
} from '@providers/AnalyticsProvider/analyticsTracker';
import { walletRoutePaths } from '@routes/wallet-paths';
import { ILocalStorage } from '@src/types';
import { deleteFromLocalStorage, getValueFromLocalStorage } from '@src/utils/local-storage';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { WarningModal } from '@src/views/browser-view/components/WarningModal';
import React, { useCallback, useEffect, useState } from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { HardwareWalletFlow } from './HardwareWalletFlow';
import { Portal } from './Portal';
import { SendOnboardingAnalyticsEvent, SetupType } from '../types';
import styles from './WalletSetup.module.scss';
import { WalletSetupWizard } from './WalletSetupWizard';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { useTranslation, Trans } from 'react-i18next';
const userIdService = getUserIdService();

// This initial step is needed for configure the step that we want to snapshot
export interface WalletSetupProps {
  initialStep?: WalletSetupSteps;
}

export const WalletSetup = ({ initialStep = WalletSetupSteps.Legal }: WalletSetupProps): React.ReactElement => {
  const history = useHistory();
  const { path } = useRouteMatch();
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [isDappConnectorWarningOpen, setIsDappConnectorWarningOpen] = useState(false);
  const isForgotPasswordFlow = getValueFromLocalStorage<ILocalStorage, 'isForgotPasswordFlow'>('isForgotPasswordFlow');
  const { t: translate } = useTranslation();
  const analytics = useAnalyticsContext();

  const walletSetupOptionsStepTranslations = {
    title: translate('core.walletSetupOptionsStep.title'),
    subTitle: translate('core.walletSetupOptionsStep.subTitle'),
    newWallet: {
      title: translate('core.walletSetupOptionsStep.newWallet.title'),
      description: translate('core.walletSetupOptionsStep.newWallet.description'),
      button: translate('core.walletSetupOptionsStep.newWallet.button')
    },
    hardwareWallet: {
      title: translate('core.walletSetupOptionsStep.hardwareWallet.title'),
      description: translate('core.walletSetupOptionsStep.hardwareWallet.description'),
      button: translate('core.walletSetupOptionsStep.hardwareWallet.button')
    },
    restoreWallet: {
      title: translate('core.walletSetupOptionsStep.restoreWallet.title'),
      description: translate('core.walletSetupOptionsStep.restoreWallet.description'),
      button: translate('core.walletSetupOptionsStep.restoreWallet.button')
    }
  };

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
    deleteFromLocalStorage('analyticsAccepted');
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

  const sendAnalyticsHandler: SendOnboardingAnalyticsEvent = async (postHogAction, postHogProperties) =>
    await sendAnalytics({ postHogAction, postHogProperties });

  const handleRestoreWallet = () => {
    setIsConfirmRestoreOpen(true);
    analytics.sendEventToPostHog(postHogOnboardingActions.restore?.SETUP_OPTION_CLICK);
  };

  const handleCreateNewWallet = () => {
    sendAnalytics({
      postHogAction: postHogOnboardingActions.create.SETUP_OPTION_CLICK
    });
    history.push(walletRoutePaths.setup.create);
  };

  const handleCancelRestoreWarning = () => {
    setIsConfirmRestoreOpen(false);
    analytics.sendEventToPostHog(postHogOnboardingActions.restore?.RESTORE_MULTI_ADDR_CANCEL_CLICK);
  };

  const handleConfirmRestoreWarning = () => {
    setIsConfirmRestoreOpen(false);
    sendAnalytics({
      postHogAction: postHogOnboardingActions.create.RESTORE_MULTI_ADDR_OK_CLICK
    });
    history.push(walletRoutePaths.setup.restore);
  };

  return (
    <WalletSetupFlowProvider flow={WalletSetupFlow.ONBOARDING}>
      <Portal>
        <Switch>
          <Route exact path={`${path}/`}>
            <WalletSetupLayout>
              <WalletSetupOptionsStep
                onNewWalletRequest={handleCreateNewWallet}
                onHardwareWalletRequest={handleStartHardwareOnboarding}
                onRestoreWalletRequest={handleRestoreWallet}
                translations={walletSetupOptionsStepTranslations}
              />
              <WarningModal
                header={translate('browserView.walletSetup.confirmRestoreModal.header')}
                content={
                  <div className={styles.confirmResetContent}>
                    <p>
                      <Trans
                        components={{
                          b: <b />
                        }}
                        i18nKey="browserView.walletSetup.confirmRestoreModal.content"
                      />
                    </p>
                  </div>
                }
                visible={isConfirmRestoreOpen}
                confirmLabel={translate('browserView.walletSetup.confirmRestoreModal.confirm')}
                onCancel={handleCancelRestoreWarning}
                onConfirm={handleConfirmRestoreWarning}
              />
              <WarningModal
                header={translate('browserView.walletSetup.confirmExperimentalHwDapp.header')}
                content={
                  <div className={styles.confirmResetContent}>
                    <p>
                      <Trans i18nKey="browserView.walletSetup.confirmExperimentalHwDapp.content" />
                    </p>
                  </div>
                }
                visible={isDappConnectorWarningOpen}
                confirmLabel={translate('browserView.walletSetup.confirmExperimentalHwDapp.confirm')}
                onCancel={() => setIsDappConnectorWarningOpen(false)}
                onConfirm={() => {
                  setIsDappConnectorWarningOpen(false);
                  history.push(walletRoutePaths.setup.hardware);
                }}
              />
            </WalletSetupLayout>
          </Route>
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
        </Switch>
      </Portal>
    </WalletSetupFlowProvider>
  );
};
