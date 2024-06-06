import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { Text } from '../text';
import { FontWeights } from '../text/create-text.util';
import * as cx from './action-card.css';
import classNames from 'classnames';
import type { OmitClassName } from '../../types';

type Props = Omit<OmitClassName<'div'>, 'title'> & {
  title: { text: string; highlight?: boolean; weight?: FontWeights }[];
  description?: string;
  icon: ReactNode;
  rootClassName?: string;
  iconClassName?: string;
};

export const ActionCard = ({
  title,
  description = '',
  icon,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Box {...props} className={classNames([cx.root, props.rootClassName])}>
    <Flex
      className={classNames([cx.iconBox, props.iconClassName])}
      mr="$24"
      alignItems="center"
      justifyContent="center"
    >
      {icon}
    </Flex>
    <Box w="$fill">
      <Flex justifyContent="center" h="$fill" flexDirection="column">
        <Box>
          {title.map(({ text, highlight, weight }) => (
            <Text.Body.Normal
              weight={weight || '$medium'}
              color={highlight ? 'highlight' : 'primary'}
              key={text}
            >
              {text}{' '}
            </Text.Body.Normal>
          ))}
        </Box>
        {description.length > 0 && (
          <Box mt="$8">
            <Text.Body.Small weight="$medium" color="secondary">
              {description}
            </Text.Body.Small>
          </Box>
        )}
      </Flex>
    </Box>
  </Box>
);
