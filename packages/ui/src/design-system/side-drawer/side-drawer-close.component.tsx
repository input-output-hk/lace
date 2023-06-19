import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';

interface Props {
  children: React.ReactNode;
}

export const Close = ({ children }: Readonly<Props>): JSX.Element => (
  <Dialog.Close asChild>{children}</Dialog.Close>
);
