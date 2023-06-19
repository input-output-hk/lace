import type { ReactNode } from 'react';
import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';

interface Props {
  children: ReactNode;
}

export const Portal = ({ children }: Readonly<Props>): JSX.Element => (
  <Dialog.Portal>{children}</Dialog.Portal>
);
