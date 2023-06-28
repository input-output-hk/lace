import { useTranslate, WalletSetupOptionsStep, WalletSetupSteps } from '@lace/core';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames,
  PostHogAction,
  postHogOnboardingActions
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
import { SendOboardingAnalyticsEvent } from '../types';
import styles from './WalletSetup.module.scss';
import { WalletSetupWizard } from './WalletSetupWizard';

const { WalletSetup: Events } = AnalyticsEventNames;

type SetupAnalyticsCategories =
  | AnalyticsEventCategories.WALLET_CREATE
  | AnalyticsEventCategories.WALLET_RESTORE
  | AnalyticsEventCategories.HW_CONNECT;

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
  const { t: translate, Trans } = useTranslate();
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

  const sendAnalytics = async (
    category: SetupAnalyticsCategories,
    eventName: string,
    value = 1,
    postHogAction?: PostHogAction
  ) => {
    await analytics.sendEvent({
      action: AnalyticsEventActions.CLICK_EVENT,
      category,
      name: eventName,
      value
    });
    if (postHogAction) {
      await analytics.sendEventToPostHog(postHogAction);
    }
  };

  const getSendAnalyticsHandler: (eventCategory: SetupAnalyticsCategories) => SendOboardingAnalyticsEvent =
    (eventCategory) => (event, postHogAction, value) =>
      sendAnalytics(eventCategory, event, value, postHogAction);

  const handleRestoreWallet = () => {
    setIsConfirmRestoreOpen(true);
    analytics.sendEventToPostHog(postHogOnboardingActions.restore?.SETUP_OPTION_CLICK);
  };

  const handleCreateNewWallet = () => {
    sendAnalytics(
      AnalyticsEventCategories.WALLET_CREATE,
      Events.CREATE_WALLET_START,
      undefined,
      postHogOnboardingActions.create.SETUP_OPTION_CLICK
    );
    history.push(walletRoutePaths.setup.create);
  };

  const handleCancelRestoreWarning = () => {
    setIsConfirmRestoreOpen(false);
    analytics.sendEventToPostHog(postHogOnboardingActions.restore?.RESTORE_MULTI_ADDR_CANCEL_CLICK);
  };

  const handleConfirmRestoreWarning = () => {
    setIsConfirmRestoreOpen(false);
    sendAnalytics(
      AnalyticsEventCategories.WALLET_RESTORE,
      Events.RESTORE_WALLET_START,
      undefined,
      postHogOnboardingActions.restore?.RESTORE_MULTI_ADDR_OK_CLICK
    );
    history.push(walletRoutePaths.setup.restore);
  };

  return (
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
                sendAnalytics(AnalyticsEventCategories.HW_CONNECT, Events.CONNECT_HW_START);
                history.push(walletRoutePaths.setup.hardware);
              }}
            />
          </WalletSetupLayout>
        </Route>
        <Route path={`${path}/create`}>
          <WalletSetupWizard
            setupType="create"
            onCancel={cancelWalletFlow}
            sendAnalytics={getSendAnalyticsHandler(AnalyticsEventCategories.WALLET_CREATE)}
            initialStep={initialStep}
          />
        </Route>
        <Route path={`${path}/restore`}>
          <WalletSetupWizard
            setupType={isForgotPasswordFlow ? 'forgot_password' : 'restore'}
            onCancel={cancelWalletFlow}
            sendAnalytics={getSendAnalyticsHandler(AnalyticsEventCategories.WALLET_RESTORE)}
            initialStep={initialStep}
          />
        </Route>
        <Route path={`${path}/hardware`}>
          <HardwareWalletFlow
            onCancel={cancelWalletFlow}
            onAppReload={() => location.reload()}
            sendAnalytics={getSendAnalyticsHandler(AnalyticsEventCategories.HW_CONNECT)}
          />
        </Route>
      </Switch>
    </Portal>
  );
};
