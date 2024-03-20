import type { PropsWithChildren } from 'react';
import React from 'react';

import { Box } from '../box';
import { Text } from '../text';

type Props = PropsWithChildren<{
  title: string;
}>;

export const Section = ({ children, title }: Readonly<Props>): JSX.Element => {
  return (
    <Box>
      <Box pb="$32">
        <Text.Heading>{title}</Text.Heading>
      </Box>
      {children}
    </Box>
  );
};
