import React from 'react';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import styles from './SettingsLayout.module.scss';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { NetworkChoice } from './NetworkChoice';

const { Text } = Typography;

interface NetworkChoiceDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

export const NetworkChoiceDrawer = ({
  visible,
  onClose,
  popupView = false
}: NetworkChoiceDrawerProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.wallet.network.title')} />}
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
        <Text className={styles.drawerDescription}>{t('browserView.settings.wallet.network.drawerDescription')}</Text>
        <div className={styles.radios}>
          <NetworkChoice section="settings" />
        </div>
      </div>
    </Drawer>
  );
};
