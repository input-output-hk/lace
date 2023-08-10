import React from 'react';
import styles from './SettingsLayout.module.scss';
import { Button, Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';

const { Title, Text } = Typography;

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

export const SupportDrawer = ({
  visible,
  onClose,
  popupView = false
}: GeneralSettingsDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.help.support.help')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
    >
      <div className={popupView ? styles.popupContainer : undefined}>
        <Text className={styles.drawerDescription} data-testid="help-description">
          {t('browserView.settings.help.support.description')}
        </Text>
        <Title
          level={5}
          className={`${popupView ? 'mt-5' : 'mt-4'} mb-3 font-weight-600 line-height-3 font-body-large`}
          data-testid="help-zen-title"
        >
          {t('browserView.settings.help.support.iogZenDesk')}
        </Title>
        <Button
          size="large"
          color="primary"
          block
          data-testid="create-new-ticket-button"
          onClick={() => openExternalLink(process.env.HELP_URL)}
        >
          {t('browserView.settings.help.support.createASupportTicket')}
        </Button>
      </div>
    </Drawer>
  );
};
