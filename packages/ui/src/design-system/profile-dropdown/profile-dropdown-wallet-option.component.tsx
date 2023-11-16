import type { ComponentPropsWithoutRef } from 'react';
import React from 'react';

import classNames from 'classnames';

import { ReactComponent as ChevronRight } from '../../assets/icons/chevron-right.component.svg';
import { Box } from '../box';
import { Icon as IconButton } from '../control-buttons';
import { Flex } from '../flex';

import { WalletCard } from './profile-dropdown-wallet-card.component';
import * as cx from './profile-dropdown-wallet-option.css';

import type { WalletType } from './profile-dropdown.data';

export type Props = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  disabled?: boolean;
  title: string;
  subtitle: string;
  profile?: {
    imageSrc: string;
    fallback: string;
    alt?: string;
    delayMs?: number;
  };
  type: WalletType;
};

export const WalletOption = ({
  id,
  disabled,
  className,
  title,
  subtitle,
  profile,
  type,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <button
      {...props}
      id={id}
      disabled={disabled}
      className={classNames(cx.button, cx.container, className)}
    >
      <Flex alignItems="center" justifyContent="space-between" w="$fill">
        <WalletCard
          profile={profile}
          title={{
            text: title,
            type: 'content',
          }}
          subtitle={subtitle}
          type={type}
        />
        <Box ml="$10">
          <Flex
            className={cx.iconButton}
            w="$24"
            h="$24"
            alignItems="center"
            justifyContent="center"
          >
            <IconButton icon={<ChevronRight />} />
          </Flex>
        </Box>
      </Flex>
    </button>
  );
};
