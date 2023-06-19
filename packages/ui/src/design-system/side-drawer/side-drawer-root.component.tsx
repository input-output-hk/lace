import type { ReactNode } from 'react';
import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';

export interface Props {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export const Root = (props: Readonly<Props>): JSX.Element => (
  <Dialog.Root {...props} />
);
