import type { ReactNode } from 'react';
import React from 'react';

import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import * as Text from '../typography';

import * as cx from './action-card.css';

import type { OmitClassName } from '../../types';

type Props = Omit<OmitClassName<'div'>, 'title'> & {
  title: { text: string; highlight: boolean }[];
  description?: string;
  icon: ReactNode;
};

export const ActionCard = ({
  title,
  description = '',
  icon,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Box {...props} className={cx.root}>
    <Flex
      className={cx.iconBox}
      mr="$24"
      alignItems="center"
      justifyContent="center"
    >
      {icon}
    </Flex>
    <Box w="$fill">
      <Flex justifyContent="center" h="$fill" flexDirection="column">
        <Box>
          {title.map(({ text, highlight }) => (
            <Text.Body.Normal
              weight="$medium"
              className={cn({
                [cx.highlightTitle]: highlight,
                [cx.title]: !highlight,
              })}
              key={text}
            >
              {text}{' '}
            </Text.Body.Normal>
          ))}
        </Box>
        {description.length > 0 && (
          <Box mt="$8">
            <Text.Body.Small weight="$medium" className={cx.description}>
              {description}
            </Text.Body.Small>
          </Box>
        )}
      </Flex>
    </Box>
  </Box>
);
