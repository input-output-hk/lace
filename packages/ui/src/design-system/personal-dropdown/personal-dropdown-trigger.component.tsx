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
  active?: boolean;
  title: string;
  subtitle: string;
  profile: {
    imageSrc: string;
    fallback: string;
    alt?: string;
    delayMs?: number;
  };
};

const makeTestId = (namespace?: string, path?: string): string | undefined => {
  return namespace === undefined
    ? undefined
    : `personal-dropdown-trigger-${namespace}${path === undefined ? '' : path}`;
};

export const Trigger = ({
  id,
  disabled,
  active = false,
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
      data-testid={makeTestId(id)}
    >
      <Flex alignItems="center">
        <Flex>
          <UserProfile {...profile} radius="rounded" />
          <Flex flexDirection="column" ml="$10" h="$32" alignItems="flex-start">
            <Text.Label
              className={cx.title}
              data-testid={makeTestId(id, '-title')}
            >
              {title}
            </Text.Label>
            <Box className={cx.subtitleOffset}>
              <Text.Body.Small
                weight="$semibold"
                className={cx.subtitle}
                data-testid={makeTestId(id, '-subtitle')}
              >
                {subtitle}
              </Text.Body.Small>
            </Box>
          </Flex>
        </Flex>
        <Box ml="$10">
          <Flex w="$16" h="$16" alignItems="center" justifyContent="center">
            {active ? (
              <ChevronUp data-testid={makeTestId(id, '-chevron-up')} />
            ) : (
              <ChevronDown data-testid={makeTestId(id, '-chevron-down')} />
            )}
          </Flex>
        </Box>
      </Flex>
    </button>
  );
};
