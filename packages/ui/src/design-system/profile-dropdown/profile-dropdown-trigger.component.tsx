import type { ComponentPropsWithoutRef } from 'react';
import React from 'react';

import { ReactComponent as ChevronDown } from '@lace/icons/dist/ChevronDownComponent';
import { ReactComponent as ChevronUp } from '@lace/icons/dist/ChevronUpComponent';
import classNames from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';

import * as cx from './profile-dropdown-trigger.css';
import { WalletCard } from './profile-dropdown-wallet-card.component';

import type { WalletType } from './profile-dropdown.data';

export type Props = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  disabled?: boolean;
  active?: boolean;
  title: string;
  subtitle: string;
  profile?: {
    imageSrc: string;
    fallbackText: string;
    alt?: string;
    delayMs?: number;
  };
  type: WalletType;
};

const makeTestId = (namespace = '', path = ''): string => {
  return namespace === ''
    ? namespace
    : `profile-dropdown-trigger-${namespace}${path}`;
};

export const Trigger = ({
  id,
  disabled,
  active = false,
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
      data-testid={makeTestId(id)}
    >
      <Flex alignItems="center">
        <WalletCard
          profile={profile}
          title={{ text: title, type: 'button' }}
          subtitle={subtitle}
          type={type}
          testId={makeTestId(id)}
        />

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
