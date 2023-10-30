import React, { useState } from 'react';
import { SettingsCard, SettingsLink, SupportDrawer } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const { Title } = Typography;

interface SettingsHelpProps {
  popupView?: boolean;
}

export const SettingsHelp = ({ popupView = false }: SettingsHelpProps): React.ReactElement => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);
  const analytics = useAnalyticsContext();

  const toggleSupportDrawer = () => {
    setIsSupportDrawerOpen(!isSupportDrawerOpen);
    const event = isSupportDrawerOpen ? PostHogAction.SettingsHelpXClick : PostHogAction.SettingsHelpClick;
    analytics.sendEventToPostHog(event);
  };

  const handleDrawerPosthogEvent = async (event: PostHogAction) => {
    await analytics.sendEventToPostHog(event);
  };

  const handleFaqClick = async () => {
    await analytics.sendEventToPostHog(PostHogAction.SettingsFaqsClick);
    openExternalLink(process.env.FAQ_URL);
  };

  return (
    <>
      <SupportDrawer
        visible={isSupportDrawerOpen}
        onClose={toggleSupportDrawer}
        popupView={popupView}
        sendPostHogEvent={handleDrawerPosthogEvent}
      />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="support-settings-heading">
          {t('browserView.settings.help.title')}
        </Title>
        <SettingsLink
          description={t('browserView.settings.help.faqs.description')}
          onClick={handleFaqClick}
          data-testid="settings-support-faqs-link"
        >
          {t('browserView.settings.help.faqs.title')}
        </SettingsLink>
        <SettingsLink
          description={t('browserView.settings.help.support.createASupportTicket')}
          onClick={toggleSupportDrawer}
          data-testid="settings-support-help-link"
        >
          {t('browserView.settings.help.support.help')}
        </SettingsLink>
      </SettingsCard>
    </>
  );
};
