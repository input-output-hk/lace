import type { FC } from 'react';
import React from 'react';

import { ReactComponent as ColdWallet } from '@lace/icons/dist/HardwareWalletComponent';
import { ReactComponent as SharedWallet } from '@lace/icons/dist/UserGroupComponent';
import { ReactComponent as HotWallet } from '@lace/icons/dist/WalletComponent';

import { Flex } from '../flex';

import * as cx from './profile-dropdown-wallet-icon.css';

import type { WalletType } from './profile-dropdown.data';

export interface Props {
  type: WalletType;
  testId?: string;
}

const icons: Record<WalletType, FC<React.SVGProps<SVGSVGElement>>> = {
  hot: HotWallet,
  cold: ColdWallet,
  shared: SharedWallet,
};

export const WalletIcon = ({ type, testId }: Readonly<Props>): JSX.Element => {
  const Icon = icons[type];
  return (
    <Flex
      className={cx.container({
        bg: type,
      })}
      data-testid={testId}
      data-value={type}
    >
      <Icon />
    </Flex>
  );
};
