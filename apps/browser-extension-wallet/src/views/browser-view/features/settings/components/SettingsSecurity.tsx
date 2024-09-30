import React, { useCallback, useEffect, useState } from 'react';
import {
  SettingsCard,
  SettingsLink,
  PassphraseSettingsDrawer,
  ShowPassphraseDrawer,
  PaperWalletSettingsDrawer
} from './';
import { Switch } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useWalletStore } from '@src/stores';
import { useLocalStorage } from '@src/hooks';
import { useAnalyticsContext, useAppSettingsContext } from '@providers';
import { PHRASE_FREQUENCY_OPTIONS } from '@src/utils/constants';
import { EnhancedAnalyticsOptInStatus, PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

const { Title } = Typography;
interface SettingsSecurityProps {
  popupView?: boolean;
  defaultPassphraseVisible?: boolean;
  defaultMnemonic?: Array<string>;
}

export const SettingsSecurity = ({
  popupView = false,
  defaultPassphraseVisible,
  defaultMnemonic
}: SettingsSecurityProps): React.ReactElement | null => {
  const posthog = usePostHogClientContext();
  const paperWalletEnabled = posthog?.isFeatureFlagEnabled('create-paper-wallet');
  const [isPassphraseSettingsDrawerOpen, setIsPassphraseSettingsDrawerOpen] = useState(false);
  const [isShowPassphraseDrawerOpen, setIsShowPassphraseDrawerOpen] = useState(false);
  const [hideShowPassphraseSetting, setHideShowPassphraseSetting] = useState(true);
  const [isPaperWalletSettingsDrawerOpen, setIsPaperWalletSettingsDrawerOpen] = useState(false);
  const { t } = useTranslation();
  const { isWalletLocked, isInMemoryWallet, isSharedWallet } = useWalletStore();
  const [settings] = useAppSettingsContext();
  const { mnemonicVerificationFrequency } = settings;
  const frequency = PHRASE_FREQUENCY_OPTIONS.find(({ value }) => value === mnemonicVerificationFrequency)?.label;
  const [analyticsStatus, { updateLocalStorage: setEnhancedAnalyticsOptInStatus }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );
  const analytics = useAnalyticsContext();
  const showPassphraseVerification = process.env.USE_PASSWORD_VERIFICATION === 'true';

  const handleAnalyticsChoice = async (isOptedIn: boolean) => {
    const status = isOptedIn ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut;

    if (isOptedIn) {
      await analytics.setOptedInForEnhancedAnalytics(status);
      await analytics.sendEventToPostHog(PostHogAction.SettingsAnalyticsAgreeClick);
      await analytics.sendAliasEvent();
    } else {
      await analytics.sendEventToPostHog(PostHogAction.SettingsAnalyticsSkipClick);
      await analytics.setOptedInForEnhancedAnalytics(status);
    }

    setEnhancedAnalyticsOptInStatus(status);
  };

  const isMnemonicAvailable = useCallback(async () => {
    setHideShowPassphraseSetting(isWalletLocked() || !isInMemoryWallet);
  }, [isInMemoryWallet, isWalletLocked]);

  const handleCloseShowPassphraseDrawer = () => {
    setIsShowPassphraseDrawerOpen(false);
    analytics.sendEventToPostHog(PostHogAction.SettingsShowRecoveryPhraseYourRecoveryPhraseXClick);
  };

  const handleOpenShowPassphraseDrawer = () => {
    setIsShowPassphraseDrawerOpen(true);
    analytics.sendEventToPostHog(PostHogAction.SettingsShowRecoveryPhraseClick);
  };

  const handleOpenShowPaperWalletDrawer = () => {
    setIsPaperWalletSettingsDrawerOpen(true);
    analytics.sendEventToPostHog(PostHogAction.SettingsOpenGeneratePaperWalletDrawer);
  };

  useEffect(() => {
    isMnemonicAvailable();
  }, [isMnemonicAvailable]);

  return (
    <>
      <PassphraseSettingsDrawer
        visible={isPassphraseSettingsDrawerOpen}
        onClose={() => setIsPassphraseSettingsDrawerOpen(false)}
        popupView={popupView}
      />
      <ShowPassphraseDrawer
        visible={isShowPassphraseDrawerOpen}
        onClose={handleCloseShowPassphraseDrawer}
        popupView={popupView}
        defaultPassphraseVisible={defaultPassphraseVisible}
        defaultMnemonic={defaultMnemonic}
        sendAnalyticsEvent={(event: PostHogAction) => analytics.sendEventToPostHog(event)}
      />
      {isInMemoryWallet && paperWalletEnabled && (
        <PaperWalletSettingsDrawer
          isOpen={isPaperWalletSettingsDrawerOpen}
          onClose={() => setIsPaperWalletSettingsDrawerOpen(false)}
          popupView={popupView}
        />
      )}
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="security-settings-heading">
          {t('browserView.settings.security.title')}
        </Title>
        {!hideShowPassphraseSetting && !isSharedWallet && (
          <>
            <SettingsLink
              onClick={handleOpenShowPassphraseDrawer}
              description={t('browserView.settings.security.showPassphrase.description')}
              data-testid="settings-show-recovery-phrase-link"
            >
              {t('browserView.settings.security.showPassphrase.title')}
            </SettingsLink>
          </>
        )}
        {isInMemoryWallet && paperWalletEnabled && !popupView && (
          <SettingsLink
            description={t('browserView.settings.generatePaperWallet.description')}
            onClick={handleOpenShowPaperWalletDrawer}
            data-testid="settings-generate-paperwallet-link"
          >
            {t('browserView.settings.generatePaperWallet.title')}
          </SettingsLink>
        )}
        {showPassphraseVerification && isInMemoryWallet && (
          <SettingsLink
            onClick={() => setIsPassphraseSettingsDrawerOpen(true)}
            description={t('browserView.settings.security.passphrasePeriodicVerification.description')}
            addon={`${frequency?.charAt(0)?.toUpperCase()}${frequency?.slice(1)}`}
            data-testid="settings-passphrase-verification-link"
          >
            {t('browserView.settings.security.passphrasePeriodicVerification.title')}
          </SettingsLink>
        )}
        <SettingsLink
          description={t('browserView.settings.security.analytics.description')}
          addon={
            <Switch
              testId="settings-analytics-switch"
              checked={analyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn}
              onChange={handleAnalyticsChoice}
              className={styles.analyticsSwitch}
            />
          }
          data-testid="settings-analytics-section"
        >
          {t('browserView.settings.security.analytics.title')}
        </SettingsLink>
      </SettingsCard>
    </>
  );
};
