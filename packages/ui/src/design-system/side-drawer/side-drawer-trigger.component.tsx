import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';

interface Props {
  children: React.ReactNode;
}

export const Trigger = ({ children }: Readonly<Props>): JSX.Element => (
  <Dialog.Trigger asChild>{children}</Dialog.Trigger>
);
