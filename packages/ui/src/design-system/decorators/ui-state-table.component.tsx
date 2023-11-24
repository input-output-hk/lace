import React from 'react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';

import * as Variants from './variants-table';

interface Props {
  children: React.ReactNode;
}

export const UIStateTable = ({ children }: Readonly<Props>): JSX.Element => (
  <>
    <Variants.Table
      headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
    >
      {children}
    </Variants.Table>

    <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
      <Variants.Table>{children}</Variants.Table>
    </LocalThemeProvider>
  </>
);
