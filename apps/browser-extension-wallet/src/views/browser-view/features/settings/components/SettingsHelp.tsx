import React, { useState } from 'react';
import { SettingsCard, SettingsLink, SupportDrawer } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';

const { Title } = Typography;

interface SettingsHelpProps {
  popupView?: boolean;
}

export const SettingsHelp = ({ popupView = false }: SettingsHelpProps): React.ReactElement => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);
  const toggleSupportDrawer = () => setIsSupportDrawerOpen(!isSupportDrawerOpen);

  return (
    <>
      <SupportDrawer visible={isSupportDrawerOpen} onClose={toggleSupportDrawer} popupView={popupView} />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="support-settings-heading">
          {t('browserView.settings.help.title')}
        </Title>
        <SettingsLink
          description={t('browserView.settings.help.faqs.description')}
          onClick={() => openExternalLink(process.env.FAQ_URL)}
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
