import React, { useState } from 'react';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '../../../wallet-paths';
import { SendFlow } from './SendFlow';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import styles from './SendFlow.module.scss';
import { useTranslation } from 'react-i18next';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { useWalletStore } from '@src/stores';

export const SendContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { appMode }
  } = useWalletStore();
  const isPopupView = appMode === APP_MODE_POPUP;
  const redirectToOverview = useRedirection(walletRoutePaths.assets);

  return (
    <Drawer
      open
      onClose={redirectToOverview}
      title={isPopupView ? undefined : <DrawerHeader title={t('browserView.transaction.send.title')} />}
      navigation={<DrawerNavigation onCloseIconClick={redirectToOverview} />}
      popupView
    >
      <Flex className={styles.container} data-testid="btc-send" flexDirection="column" gap="$16">
        <SendFlow />
      </Flex>
    </Drawer>
  );
};
