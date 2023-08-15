import React, { useState } from 'react';
import { SettingsCard, SettingsLink } from '..';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from '../SettingsLayout.module.scss';
import { useCurrencyStore } from '@providers';
import { ThemeSwitch } from '@components/MainMenu/UserMenu/components';
import { CurrencyDrawer } from './CurrencyDrawer';

const { Title } = Typography;

interface SettingsPreferencesProps {
  popupView?: boolean;
}

export const SettingsPreferences = ({ popupView = false }: SettingsPreferencesProps): React.ReactElement => {
  const [isCurrrencyChoiceDrawerOpen, setIsCurrrencyChoiceDrawerOpen] = useState(false);
  const toggleCurrrencyChoiceDrawer = () => setIsCurrrencyChoiceDrawerOpen(!isCurrrencyChoiceDrawerOpen);
  const { t } = useTranslation();
  const { fiatCurrency } = useCurrencyStore();

  return (
    <>
      <CurrencyDrawer
        visible={isCurrrencyChoiceDrawerOpen}
        onClose={toggleCurrrencyChoiceDrawer}
        popupView={popupView}
      />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="wallet-settings-heading">
          {t('browserView.settings.preferences.title')}
        </Title>
        <SettingsLink
          onClick={toggleCurrrencyChoiceDrawer}
          description={t('browserView.settings.preferences.currency.description')}
          addon={fiatCurrency?.code?.toUpperCase()}
          data-testid="settings-wallet-currency-link"
        >
          {t('browserView.settings.preferences.currency.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.preferences.theme.description')}
          data-testid="settings-wallet-theme"
          addon={<ThemeSwitch />}
        >
          {t('browserView.settings.preferences.theme.title')}
        </SettingsLink>
      </SettingsCard>
    </>
  );
};
