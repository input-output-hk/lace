import React, { useState } from 'react';
import { SettingsCard, SettingsLink } from '..';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from '../SettingsLayout.module.scss';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import { ThemeSwitch } from '@components/MainMenu/DropdownMenuOverlay/components';
import { CurrencyDrawer } from './CurrencyDrawer';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { currencyCode } from '@providers/currency/constants';

const { Title } = Typography;

interface SettingsPreferencesProps {
  popupView?: boolean;
}

export const SettingsPreferences = ({ popupView = false }: SettingsPreferencesProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const [isCurrrencyChoiceDrawerOpen, setIsCurrrencyChoiceDrawerOpen] = useState(false);
  const { t } = useTranslation();
  const { fiatCurrency } = useCurrencyStore();

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
      </SettingsCard>
    </>
  );
};
