import type { FC } from 'react';
import React from 'react';

import { ReactComponent as ColdWallet } from '../../assets/icons/hardware-wallet.component.svg';
import { ReactComponent as SharedWallet } from '../../assets/icons/user-group.component.svg';
import { ReactComponent as HotWallet } from '../../assets/icons/wallet.component.svg';
import { Flex } from '../flex';

import * as cx from './profile-dropdown-wallet-icon.css';

import type { WalletType } from './profile-dropdown.data';

export interface Props {
  type: WalletType;
}

const icons: Record<WalletType, FC<React.SVGProps<SVGSVGElement>>> = {
  hot: HotWallet,
  cold: ColdWallet,
  shared: SharedWallet,
};

export const WalletIcon = ({ type }: Readonly<Props>): JSX.Element => {
  const Icon = icons[type];
  return (
    <Flex
      className={cx.container({
        bg: type,
      })}
    >
      <Icon />
    </Flex>
  );
};
