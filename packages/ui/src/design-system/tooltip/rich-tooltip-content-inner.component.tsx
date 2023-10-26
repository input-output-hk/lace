import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import * as Typography from '../typography';

import * as cx from './rich-tooltip-content-inner.css';

export interface RichContentInnerProps {
  title: string;
  description: ReactNode;
  dotColor?: string;
}

export const RichContentInner = ({
  title,
  description,
  dotColor,
}: Readonly<RichContentInnerProps>): JSX.Element => {
  const customDotStyle =
    dotColor == undefined ? {} : { backgroundColor: dotColor };

  return (
    <Flex gap="$8">
      <Flex mt="$8">
        <Box className={cx.dot} style={customDotStyle} />
      </Flex>
      <Flex flexDirection="column" gap="$4">
        <Typography.Body.Normal weight="$bold" className={cx.title}>
          {title}
        </Typography.Body.Normal>
        <Typography.Body.Small weight="$semibold" className={cx.description}>
          {description}
        </Typography.Body.Small>
      </Flex>
    </Flex>
  );
};
