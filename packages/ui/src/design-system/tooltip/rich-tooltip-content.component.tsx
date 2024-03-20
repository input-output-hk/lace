import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './rich-tooltip-content.css';
import * as cx2 from './tooltip-content.css';

export interface RichTooltipContentProps {
  title: string;
  description: ReactNode;
  dotColor?: string;
}

export const RichTooltipContent = ({
  title,
  description,
  dotColor,
}: Readonly<RichTooltipContentProps>): JSX.Element => {
  const customDotStyle =
    dotColor == undefined ? {} : { backgroundColor: dotColor };

  return (
    <Flex gap="$8" className={cx2.tooltipContent}>
      <Flex mt="$8">
        <Box className={cx.dot} style={customDotStyle} />
      </Flex>
      <Flex flexDirection="column" gap="$4">
        <Text.Body.Normal weight="$bold">{title}</Text.Body.Normal>
        <Text.Body.Small color="secondary" weight="$semibold">
          {description}
        </Text.Body.Small>
      </Flex>
    </Flex>
  );
};
