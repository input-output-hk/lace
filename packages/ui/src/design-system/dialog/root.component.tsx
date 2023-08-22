import type { ReactNode } from 'react';
import React from 'react';

import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { Content } from './dialog-content.component';
import * as cx from './root.css';

export interface DialogRootProps {
  open: boolean;
  children: ReactNode;
  // TODO check if needed - side drawer uses that
  portalContainer: HTMLElement;
}

export const Root = ({
  open,
  children,
  portalContainer,
}: Readonly<DialogRootProps>): JSX.Element => (
  <AlertDialog.Root open={open}>
    <AlertDialog.Portal container={portalContainer}>
      <AlertDialog.Overlay className={cx.dialogOverlay} />
      <AlertDialog.Content asChild>
        <Content className={cx.dialogContent}>{children}</Content>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
