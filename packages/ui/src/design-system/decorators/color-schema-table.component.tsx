import React from 'react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import * as Variants from '../decorators/variants-table';

interface Props {
  children: React.ReactNode;
  headers?: string[] | undefined;
}

export const ColorSchemaTable = ({
  children,
  headers,
}: Readonly<Props>): JSX.Element => (
  <>
    <Variants.Table headers={headers}>{children}</Variants.Table>
    <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
      <Variants.Table>{children}</Variants.Table>
    </LocalThemeProvider>
  </>
);
