/* eslint-disable unicorn/no-null, consistent-return, sonarjs/cognitive-complexity */
import React, { useState } from 'react';
import styles from './BitcoinSendDrawer.module.scss';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { SendFlow } from "@src/views/bitcoin-mode/features/send/components/SendFlow";
import cn from "classnames";

export const BitcoinSendDrawer = (): React.ReactElement => {
  const [subtitle, setSubtitle] = useState('');

  return (
    <Flex flexDirection="column" justifyContent="space-between" alignItems="center">
      <div className={cn(styles.subtitle)} data-testid="drawer-header-subtitle">
        {subtitle}
      </div>
      <SendFlow updateSubtitle={setSubtitle}/>
    </Flex>
  );
};
