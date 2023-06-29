import React from 'react';

import { Box } from '../box';
import * as Typography from '../typography';

import * as cx from './side-drawer-content-headline.css';

interface Props {
  title: string;
  description?: string;
}

export const Headline = ({
  title,
  description,
}: Readonly<Props>): JSX.Element => (
  <Box>
    <Typography.SubHeading weight="$bold" className={cx.title}>
      {title}
    </Typography.SubHeading>
    {description !== undefined && (
      <Box mt="$8">
        <Typography.Body.Normal weight="$medium" className={cx.description}>
          {description}
        </Typography.Body.Normal>
      </Box>
    )}
  </Box>
);
