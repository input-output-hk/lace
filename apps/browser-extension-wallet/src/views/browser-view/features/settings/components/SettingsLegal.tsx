import React from 'react';
import { SettingsCard, SettingsLink } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const { Title } = Typography;

const PRIVACY_POLICY_URL = process.env.PRIVACY_POLICY_URL;
const TERMS_OF_USE_URL = process.env.TERMS_OF_USE_URL;
const COOKIE_POLICY_URL = process.env.COOKIE_POLICY_URL;

export const SettingsLegal = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const openExternalLink = useExternalLinkOpener();
  const { t } = useTranslation();

  const openTermsOfUse = () => {
    openExternalLink(TERMS_OF_USE_URL);
    analytics.sendEventToPostHog(PostHogAction.SettingsTermsAndConditionsClick);
  };

  const openPrivacyPolicy = () => {
    openExternalLink(PRIVACY_POLICY_URL);
    analytics.sendEventToPostHog(PostHogAction.SettingsPrivacyPolicyClick);
  };

  const openCookiePolicy = () => {
    openExternalLink(COOKIE_POLICY_URL);
    analytics.sendEventToPostHog(PostHogAction.SettingsCookiePolicyClick);
  };

  return (
    <>
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="legal-settings-heading">
          {t('browserView.settings.legal.title')}
        </Title>
        <SettingsLink
          description={t('browserView.settings.legal.tnc.description')}
          onClick={openTermsOfUse}
          data-testid="settings-legal-tnc-link"
        >
          {t('browserView.settings.legal.tnc.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.legal.privacyPolicy.description')}
          onClick={openPrivacyPolicy}
          data-testid="settings-legal-privacy-policy-link"
        >
          {t('browserView.settings.legal.privacyPolicy.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.legal.cookiePolicy.description')}
          onClick={openCookiePolicy}
          data-testid="settings-legal-cookie-policy-link"
        >
          {t('browserView.settings.legal.cookiePolicy.title')}
        </SettingsLink>
      </SettingsCard>
    </>
  );
};
