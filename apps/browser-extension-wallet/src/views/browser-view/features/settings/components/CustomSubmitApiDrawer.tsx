import React from 'react';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TextBox, Button } from '@lace/ui';
import PlayIcon from '../../../../../assets/icons/play-icon.component.svg';

const { Text } = Typography;

interface CustomSubmitApiDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

export const CustomSubmitApiDrawer = ({ visible, onClose, popupView = false }: CustomSubmitApiDrawerProps) => {
  const { t } = useTranslation();

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title="Custom submit API" />}
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
        <Text className={styles.drawerDescription}>
          Ensure your local node is on the same network as your wallet and fully synced to submit transactions.{' '}
          <Link to="/">Learn more about Cardano-submit-API</Link>
        </Text>
        <div className={styles.customApiContainer}>
          <TextBox label="Insert the URL here" w="$fill" />
          <Button.Primary label="Enable" icon={<PlayIcon />} />
        </div>
      </div>
    </Drawer>
  );
};
