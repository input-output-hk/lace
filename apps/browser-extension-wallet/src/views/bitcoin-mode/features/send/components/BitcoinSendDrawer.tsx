/* eslint-disable unicorn/no-null, consistent-return, sonarjs/cognitive-complexity */
import React from 'react';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { SendFlow } from '@src/views/bitcoin-mode/features/send/components/SendFlow';
import styles from './BitcoinSendDrawer.module.scss';

export const BitcoinSendDrawer = (): React.ReactElement => (
  <Flex className={styles.container} flexDirection="column" justifyContent="space-between" alignItems="center">
    <SendFlow />
  </Flex>
);
