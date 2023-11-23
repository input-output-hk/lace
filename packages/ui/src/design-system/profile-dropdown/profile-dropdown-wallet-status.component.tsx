import React from 'react';

import { Flex } from '../flex';
import * as Text from '../typography';

import * as cx from './profile-dropdown-wallet-status.css';

export interface Props {
  status: 'error' | 'synced' | 'syncing';
  label: string;
}

export const WalletStatus = ({
  label,
  status,
}: Readonly<Props>): JSX.Element => {
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      py="$8"
      px="$12"
      className={cx.button}
    >
      <Flex
        className={cx.icon({
          bg: status,
        })}
        w="$10"
        h="$10"
        alignItems="center"
        justifyContent="center"
        mr="$8"
      />
      <Text.Label weight="$medium" className={cx.label}>
        {label}
      </Text.Label>
    </Flex>
  );
};
