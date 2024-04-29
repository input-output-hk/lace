import type { PropsWithChildren } from 'react';
import React from 'react';

import { Box } from '../box';
import { Text } from '../text';

import { subtitleBox } from './page.css';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export const Section = ({
  children,
  title,
  subtitle,
}: Readonly<Props>): JSX.Element => {
  return (
    <Box>
      <Box pb="$32">
        <Text.Heading>{title}</Text.Heading>
        {Boolean(subtitle) && (
          <Box pt="$16">
            <div className={subtitleBox}>
              <Text.Body.Large>{subtitle}</Text.Body.Large>
            </div>
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
};
