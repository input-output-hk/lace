import React from 'react';

import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './flow-card-details.css';

interface Props {
  title?: string;
  subtitle?: string;
}

export const Details = ({ title, subtitle }: Readonly<Props>): JSX.Element => {
  return (
    <Flex
      flexDirection="column"
      alignItems="flex-end"
      justifyContent="center"
      className={cx.container}
    >
      {title === undefined ? undefined : (
        <Text.Body.Large weight="$semibold">{title}</Text.Body.Large>
      )}

      {subtitle === undefined ? undefined : (
        <Text.Body.Normal color="secondary" weight="$semibold">
          {subtitle}
        </Text.Body.Normal>
      )}
    </Flex>
  );
};
