import React, { useState } from 'react';
import { SettingsCard, SettingsLink, TermsDrawer, PrivacyPolicyDrawer, CookiePolicyDrawer } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';

const { Title } = Typography;

interface SettingsLegalProps {
  popupView?: boolean;
}

export const SettingsLegal = ({ popupView = false }: SettingsLegalProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isTermsDrawerOpen, setIsTermsDrawerOpen] = useState(false);
  const toggleTermsDrawer = () => setIsTermsDrawerOpen(!isTermsDrawerOpen);
  const [isPrivacyPolicyDrawerOpen, setIsPrivacyPolicyDrawerOpen] = useState(false);
  const togglePrivacyPolicyDrawer = () => setIsPrivacyPolicyDrawerOpen(!isPrivacyPolicyDrawerOpen);
  const [isCookiePolicyDrawerOpen, setIsCookiePolicyDrawerOpen] = useState(false);
  const toggleCookiePolicyDrawer = () => setIsCookiePolicyDrawerOpen(!isCookiePolicyDrawerOpen);

  return (
    <>
      <TermsDrawer visible={isTermsDrawerOpen} onClose={toggleTermsDrawer} popupView={popupView} />
      <PrivacyPolicyDrawer
        visible={isPrivacyPolicyDrawerOpen}
        onClose={togglePrivacyPolicyDrawer}
        popupView={popupView}
      />
      <CookiePolicyDrawer visible={isCookiePolicyDrawerOpen} onClose={toggleCookiePolicyDrawer} popupView={popupView} />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="legal-settings-heading">
          {t('browserView.settings.legal.title')}
        </Title>
        <SettingsLink
          description={t('browserView.settings.legal.tnc.description')}
          onClick={toggleTermsDrawer}
          data-testid="settings-legal-tnc-link"
        >
          {t('browserView.settings.legal.tnc.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.legal.privacyPolicy.description')}
          onClick={togglePrivacyPolicyDrawer}
          data-testid="settings-legal-privacy-policy-link"
        >
          {t('browserView.settings.legal.privacyPolicy.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.legal.cookiePolicy.description')}
          onClick={toggleCookiePolicyDrawer}
          data-testid="settings-legal-cookie-policy-link"
        >
          {t('browserView.settings.legal.cookiePolicy.title')}
        </SettingsLink>
      </SettingsCard>
    </>
  );
};
