import React, { useCallback, useEffect, useState } from 'react';
import { SettingsCard, SettingsLink, PassphraseSettingsDrawer, ShowPassphraseDrawer } from './';
import { Switch } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useWalletStore } from '@src/stores';
import { useLocalStorage } from '@src/hooks';
import { useAnalyticsContext, useAppSettingsContext, useBackgroundServiceAPIContext } from '@providers';
import { PHRASE_FREQUENCY_OPTIONS } from '@src/utils/constants';
import { EnhancedAnalyticsOptInStatus, PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/matomo/config';

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
  const [isPassphraseSettingsDrawerOpen, setIsPassphraseSettingsDrawerOpen] = useState(false);
  const [isShowPassphraseDrawerOpen, setIsShowPassphraseDrawerOpen] = useState(false);
  const [hideShowPassphraseSetting, setHideShowPassphraseSetting] = useState(true);
  const { t } = useTranslation();
  const { walletLock } = useWalletStore();
  const [settings] = useAppSettingsContext();
  const { mnemonicVerificationFrequency } = settings;
  const frequency = PHRASE_FREQUENCY_OPTIONS.find(({ value }) => value === mnemonicVerificationFrequency)?.label;
  const [analyticsAccepted, { updateLocalStorage: setEnhancedAnalyticsOptInStatus }] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );
  const backgroundService = useBackgroundServiceAPIContext();
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
    if (!walletLock) {
      setHideShowPassphraseSetting(true);
      return;
    }
    const backgroundStorage = await backgroundService.getBackgroundStorage();
    if (!backgroundStorage?.mnemonic) {
      setHideShowPassphraseSetting(true);
      return;
    }
    setHideShowPassphraseSetting(false);
  }, [backgroundService, walletLock]);

  const handleCloseShowPassphraseDrawer = () => {
    setIsShowPassphraseDrawerOpen(false);
    analytics.sendEventToPostHog(PostHogAction.SettingsShowRecoveryPhraseYourRecoveryPhraseXClick);
  };

  const handleOpenShowPassphraseDrawer = () => {
    setIsShowPassphraseDrawerOpen(true);
    analytics.sendEventToPostHog(PostHogAction.SettingsShowRecoveryPhraseClick);
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
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="security-settings-heading">
          {t('browserView.settings.security.title')}
        </Title>
        {!hideShowPassphraseSetting && (
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
        {/* TODO: find better way to check if using a hardware wallet or not */}
        {showPassphraseVerification && walletLock && (
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
              checked={analyticsAccepted === EnhancedAnalyticsOptInStatus.OptedIn}
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
