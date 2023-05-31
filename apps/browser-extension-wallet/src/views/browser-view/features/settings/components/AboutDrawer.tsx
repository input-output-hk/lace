import React from 'react';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { SettingsAbout } from './SettingsAbout';
import { useTranslation } from 'react-i18next';

interface AboutDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

export const AboutDrawer = ({ visible, onClose, popupView }: AboutDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
    >
      <SettingsAbout data-testid="about-container" />
    </Drawer>
  );
};
