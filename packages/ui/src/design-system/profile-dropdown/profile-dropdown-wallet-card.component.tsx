import React from 'react';

import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import { UserProfile } from '../profile-picture';
import { Text } from '../text';

import * as cx from './profile-dropdown-wallet-card.css';
import { WalletIcon } from './profile-dropdown-wallet-icon.component';

import type { WalletType } from './profile-dropdown.data';

export interface Props {
  title: {
    text: string;
    type: 'button' | 'content';
  };
  subtitle: string;
  profile?: {
    imageSrc: string;
    fallback: string;
    alt?: string;
    delayMs?: number;
  };
  type: WalletType;
  testId?: string;
}

const makeTestId = (namespace = '', path = ''): string => {
  return namespace === '' ? namespace : `${namespace}${path}`;
};

export const WalletCard = ({
  title,
  subtitle,
  profile,
  type,
  testId = '',
}: Readonly<Props>): JSX.Element => {
  const Title = title.type === 'button' ? Text.Label : Text.Address;

  return (
    <Flex>
      {profile === undefined ? (
        <WalletIcon type={type} testId={makeTestId(testId, '-icon')} />
      ) : (
        <UserProfile {...profile} radius="rounded" />
      )}
      <Flex flexDirection="column" ml="$10" h="$32" alignItems="flex-start">
        <Title color="secondary" data-testid={makeTestId(testId, '-title')}>
          {title.text}
        </Title>
        <Box
          className={cn(cx.subtitleBox, {
            [cx.subtitleButtonOffset]: title.type === 'button',
            [cx.subtitleContentOffset]: title.type === 'content',
          })}
        >
          <Text.Body.Small
            weight="$semibold"
            data-testid={makeTestId(testId, '-subtitle')}
          >
            {subtitle}
          </Text.Body.Small>
        </Box>
      </Flex>
    </Flex>
  );
};
