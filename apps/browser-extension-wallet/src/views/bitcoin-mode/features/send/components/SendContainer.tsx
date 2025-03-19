import React, { useState } from 'react';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '../../../wallet-paths';
import { SendFlow } from './SendFlow';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import styles from './SendFlow.module.scss';

export const SendContainer = (): React.ReactElement => {
  const redirectToOverview = useRedirection(walletRoutePaths.assets);

  return (
    <Drawer
      open
      onClose={redirectToOverview}
      title={
        <DrawerHeader
          title={'Send Bitcoin'} // TODO: Add i18n
        />
      }
      navigation={<DrawerNavigation onCloseIconClick={redirectToOverview} />}
      popupView
    >
      <Flex className={styles.container} data-testid="btc-send" flexDirection="column" gap="$16">
        <SendFlow />
      </Flex>
    </Drawer>
  );
};
