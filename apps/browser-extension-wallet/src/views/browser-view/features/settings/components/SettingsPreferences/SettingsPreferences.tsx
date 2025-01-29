import React, { useEffect, useState } from 'react';
import { SettingsCard, SettingsLink } from '..';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from '../SettingsLayout.module.scss';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import { ThemeSwitch } from '@components/MainMenu/DropdownMenuOverlay/components';
import { CurrencyDrawer } from './CurrencyDrawer';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { currencyCode } from '@providers/currency/constants';
import { Switch } from '@lace/common';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';

const { Title } = Typography;

interface SettingsPreferencesProps {
  popupView?: boolean;
}

export const SettingsPreferences = ({ popupView = false }: SettingsPreferencesProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const [isCurrrencyChoiceDrawerOpen, setIsCurrrencyChoiceDrawerOpen] = useState(false);
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(false);
  const { t } = useTranslation();
  const { fiatCurrency } = useCurrencyStore();
  const posthog = usePostHogClientContext();
  const [isOptInBeta, setIsOptInBeta] = useState(false);

  useEffect(() => {
    const subscription = posthog.hasOptedInBeta().subscribe((optInStatus) => {
      setIsOptInBeta(optInStatus);
    });

    (async () => {
      const backgroundStorage = await getBackgroundStorage();
      setIsLoggingEnabled(backgroundStorage.logLevel === 'debug');
    })();

    return () => {
      subscription.unsubscribe();
    };
  }, [posthog]);

  const handleLoggingOnChange = async () => {
    await setBackgroundStorage({ logLevel: isLoggingEnabled ? 'info' : 'debug' });
    setIsLoggingEnabled(!isLoggingEnabled);
    void analytics.sendEventToPostHog(
      isLoggingEnabled ? PostHogAction.SettingsDebuggingOffClick : PostHogAction.SettingsDebuggingOnClick
    );
  };

  const handleOpenCurrencyDrawer = () => {
    setIsCurrrencyChoiceDrawerOpen(true);
    analytics.sendEventToPostHog(PostHogAction.SettingsCurrencyClick);
  };

  const handleCloseCurrencyDrawer = () => {
    setIsCurrrencyChoiceDrawerOpen(false);
    analytics.sendEventToPostHog(PostHogAction.SettingsCurrencyXClick);
  };

  const handleSendCurrencyChangeEvent = (currency: currencyCode) =>
    analytics.sendEventToPostHog(PostHogAction.SettingsCurrencySelectCurrencyClick, { currency });

  const handleBetaOptInChoice = async (isOptedIn: boolean) => {
    await posthog.setOptedInBeta(isOptedIn);
    setIsOptInBeta(isOptedIn);

    await analytics.sendEventToPostHog(
      isOptedIn ? PostHogAction.SettingsBetaProgramOptInClick : PostHogAction.SettingsBetaProgramOptOutClick
    );
  };

  return (
    <>
      <CurrencyDrawer
        visible={isCurrrencyChoiceDrawerOpen}
        onClose={handleCloseCurrencyDrawer}
        popupView={popupView}
        sendCurrencyChangeEvent={handleSendCurrencyChangeEvent}
      />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="wallet-settings-heading">
          {t('browserView.settings.preferences.title')}
        </Title>
        <SettingsLink
          onClick={handleOpenCurrencyDrawer}
          description={t('browserView.settings.preferences.currency.description')}
          addon={fiatCurrency?.code?.toUpperCase()}
          data-testid="settings-wallet-currency-link"
        >
          {t('browserView.settings.preferences.currency.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.preferences.theme.description')}
          data-testid="settings-wallet-theme"
          addon={<ThemeSwitch section="settings" />}
        >
          {t('browserView.settings.preferences.theme.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.preferences.betaProgram.description')}
          addon={
            <Switch
              testId="settings-beta-program-switch"
              checked={isOptInBeta}
              onChange={handleBetaOptInChoice}
              className={styles.analyticsSwitch}
            />
          }
          data-testid="settings-beta-program-section"
        >
          {t('browserView.settings.preferences.betaProgram.title')}
        </SettingsLink>
        <SettingsLink
          onClick={handleLoggingOnChange}
          description={t('browserView.settings.preferences.debugging.description')}
          addon={
            <Switch
              testId="settings-logging-switch"
              checked={isLoggingEnabled}
              onChange={() => setIsLoggingEnabled(!isLoggingEnabled)}
              className={styles.analyticsSwitch}
            />
          }
          data-testid="settings-logging-level-section"
        >
          {t('browserView.settings.preferences.debugging.title')}
        </SettingsLink>
      </SettingsCard>
    </>
  );
};
