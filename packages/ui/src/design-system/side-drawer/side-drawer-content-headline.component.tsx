import React from 'react';

import { Box } from '../box';
import { Text } from '../text';

interface Props {
  title: string;
  description?: string;
}

export const Headline = ({
  title,
  description,
}: Readonly<Props>): JSX.Element => (
  <Box>
    <Text.SubHeading weight="$bold">{title}</Text.SubHeading>
    {description !== undefined && (
      <Box mt="$8">
        <Text.Body.Normal color="secondary" weight="$medium">
          {description}
        </Text.Body.Normal>
      </Box>
    )}
  </Box>
);
