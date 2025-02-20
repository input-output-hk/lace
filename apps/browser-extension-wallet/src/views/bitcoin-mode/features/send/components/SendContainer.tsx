import React, {useState} from 'react';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '../../../wallet-paths';
import { SendFlow } from './SendFlow';
import { Drawer, DrawerHeader, DrawerNavigation } from "@lace/common";
import { Flex } from "@input-output-hk/lace-ui-toolkit";
import styles from "./SendFlow.module.scss";

export const SendContainer = (): React.ReactElement => {
  const redirectToOverview = useRedirection(walletRoutePaths.assets);
  const [subtitle, setSubtitle] = useState('');

  return (
    <>
      <Drawer
        open
        onClose={redirectToOverview}
        title={
          <DrawerHeader
            title={'Send Bitcoin'} // TODO: Add i18n
            subtitle={subtitle}
          />
        }
        navigation={<DrawerNavigation onCloseIconClick={redirectToOverview} />}
        popupView
      >
        <Flex className={styles.container} testId="btc-send" flexDirection="column" gap="$16">
          <SendFlow updateSubtitle={setSubtitle}/>
        </Flex>
      </Drawer>
    </>
  );
};
