import type { ComponentPropsWithoutRef } from 'react';
import React from 'react';

import classNames from 'classnames';

import { ReactComponent as ChevronDown } from '../../assets/icons/chevron-down.component.svg';
import { ReactComponent as ChevronUp } from '../../assets/icons/chevron-up.component.svg';
import { Box } from '../box';
import { Flex } from '../flex';
import { UserProfile } from '../profile-picture';
import * as Text from '../typography';

import * as cx from './personal-dropdown-trigger.css';

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

export const Trigger = ({
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
      <Flex alignItems="center">
        <Flex>
          <UserProfile {...profile} radius="rounded" />
          <Flex flexDirection="column" ml="$10" h="$32" alignItems="flex-start">
            <Text.Label className={cx.title}>{title}</Text.Label>
            <Box className={cx.subtitleOffset}>
              <Text.Body.Small weight="$semibold" className={cx.subtitle}>
                {subtitle}
              </Text.Body.Small>
            </Box>
          </Flex>
        </Flex>
        <Box ml="$10">
          <Flex w="$16" h="$16" alignItems="center" justifyContent="center">
            {open ? <ChevronUp /> : <ChevronDown />}
          </Flex>
        </Box>
      </Flex>
    </button>
  );
};
