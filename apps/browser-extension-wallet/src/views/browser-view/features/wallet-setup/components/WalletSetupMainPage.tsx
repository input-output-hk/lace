import React, { ReactElement, useState } from 'react';
import { WalletSetupLayout, WarningModal } from '@views/browser/components';
import {
  AnalyticsConfirmationBanner,
  useTranslate,
  WalletAnalyticsInfo,
  WalletSetupOptionsStepRevamp
} from '@lace/core';
import styles from '@views/browser/features/wallet-setup/components/WalletSetup.module.scss';
import { walletRoutePaths } from '@routes';
import {
  EnhancedAnalyticsOptInStatus,
  PostHogAction,
  postHogOnboardingActions,
  PostHogProperties
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useLocalStorage } from '@hooks';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { useHistory } from 'react-router-dom';

export const WalletSetupMainPage = (): ReactElement => {
  const history = useHistory();
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [isDappConnectorWarningOpen, setIsDappConnectorWarningOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const { t: translate, Trans } = useTranslate();

  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.NotSet
  );

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

    // TODO: https://input-output.atlassian.net/browse/LW-9761 send proper analytics
    // The code removed here was sending analytics to PostHog and it's still useful. You can find it in git history of this file.
  };

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
    <>
      <WalletSetupLayout>
        <WalletSetupOptionsStepRevamp
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
      <AnalyticsConfirmationBanner
        message={
          <>
            <span>{translate('analyticsConfirmationBanner.message')}</span>
            <span className={styles.learnMore} onClick={() => setIsAnalyticsModalOpen(true)}>
              {translate('analyticsConfirmationBanner.learnMore')}
            </span>
          </>
        }
        onConfirm={() => handleAnalyticsChoice(true)}
        onReject={() => handleAnalyticsChoice(false)}
        show={enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.NotSet}
      />
      <WarningModal
        header={<div className={styles.analyticsModalTitle}>{translate('core.walletAnalyticsInfo.title')}</div>}
        content={<WalletAnalyticsInfo />}
        visible={isAnalyticsModalOpen}
        confirmLabel={translate('core.walletAnalyticsInfo.gotIt')}
        onConfirm={() => setIsAnalyticsModalOpen(false)}
      />
    </>
  );
};
