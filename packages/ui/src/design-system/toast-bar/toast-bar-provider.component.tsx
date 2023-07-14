import React from 'react';
import type { PropsWithChildren } from 'react';

import * as Toast from '@radix-ui/react-toast';

type Props = PropsWithChildren<{
  duration?: number;
}>;

export const Provider = ({
  duration,
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <>
      <Toast.Provider duration={duration}>{children}</Toast.Provider>
    </>
  );
};
