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
        <Typography.Body.Large weight="$semibold" className={cx.title}>
          {title}
        </Typography.Body.Large>
      )}

      {subtitle === undefined ? undefined : (
        <Typography.Body.Normal weight="$semibold" className={cx.subtitle}>
          {subtitle}
        </Typography.Body.Normal>
      )}
    </Flex>
  );
};
