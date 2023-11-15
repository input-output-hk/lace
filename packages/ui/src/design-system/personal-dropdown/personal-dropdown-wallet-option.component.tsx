import type { ComponentPropsWithoutRef } from 'react';
import React from 'react';

import classNames from 'classnames';

import { ReactComponent as ChevronRight } from '../../assets/icons/chevron-right.component.svg';
import { Box } from '../box';
import { Icon as IconButton } from '../control-buttons';
import { Flex } from '../flex';
import { UserProfile } from '../profile-picture';
import * as Text from '../typography';

import * as cx from './personal-dropdown-wallet-option.css';

export type Props = ComponentPropsWithoutRef<'button'> & {
  disabled?: boolean;
  open?: boolean;
  title: string;
  subtitle: string;
  profile: {
    imageSrc: string;
    fallback: string;
    alt?: string;
    delayMs?: number;
  };
};

export const WalletOption = ({
  id,
  disabled,
  open = false,
  className,
  title,
  subtitle,
  profile,
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
        <Flex>
          <UserProfile {...profile} radius="rounded" />
          <Flex flexDirection="column" ml="$10" h="$32" alignItems="flex-start">
            <Text.Address className={cx.title}>{title}</Text.Address>
            <Box className={cx.subtitleOffset}>
              <Text.Body.Small weight="$semibold" className={cx.subtitle}>
                {subtitle}
              </Text.Body.Small>
            </Box>
          </Flex>
        </Flex>
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
