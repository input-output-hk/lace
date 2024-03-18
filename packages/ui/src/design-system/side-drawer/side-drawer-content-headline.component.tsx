import React from 'react';

import { Box } from '../box';
import * as Typography from '../typography';

interface Props {
  title: string;
  description?: string;
}

export const Headline = ({
  title,
  description,
}: Readonly<Props>): JSX.Element => (
  <Box>
    <Typography.SubHeading weight="$bold">{title}</Typography.SubHeading>
    {description !== undefined && (
      <Box mt="$8">
        <Typography.Body.Normal color="secondary" weight="$medium">
          {description}
        </Typography.Body.Normal>
      </Box>
    )}
  </Box>
);
