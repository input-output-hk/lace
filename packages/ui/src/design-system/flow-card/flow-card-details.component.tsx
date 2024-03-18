import React from 'react';

import { Flex } from '../flex';
import * as Typography from '../typography';

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
        <Typography.Body.Large weight="$semibold">
          {title}
        </Typography.Body.Large>
      )}

      {subtitle === undefined ? undefined : (
        <Typography.Body.Normal color="secondary" weight="$semibold">
          {subtitle}
        </Typography.Body.Normal>
      )}
    </Flex>
  );
};
