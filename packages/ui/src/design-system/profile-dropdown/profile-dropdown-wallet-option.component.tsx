import type { ComponentPropsWithoutRef } from 'react';
import React from 'react';

import { ReactComponent as ChevronRight } from '@lace/icons/dist/ChevronRightThinComponent';
import classNames from 'classnames';

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
  onOpenAccountsMenu?: () => void;
};

export const WalletOption = ({
  id,
  disabled,
  className,
  title,
  subtitle,
  profile,
  type,
  onOpenAccountsMenu,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <button
      {...props}
      id={id}
      disabled={disabled}
      className={classNames(cx.button, cx.container, className)}
      data-testid="wallet-option-item"
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
          testId="wallet-option"
        />
        {type !== 'shared' && (
          <Box ml="$10">
            <Flex
              className={cx.icon}
              w="$24"
              h="$24"
              alignItems="center"
              justifyContent="center"
            >
              <IconButton
                onClick={(event): void => {
                  onOpenAccountsMenu?.();
                  event.stopPropagation();
                }}
                icon={<ChevronRight />}
                size="extraSmall"
                as="div"
                testId="wallet-option-accounts-menu-button"
              />
            </Flex>
          </Box>
        )}
      </Flex>
    </button>
  );
};
