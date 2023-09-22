import type { ReactNode } from 'react';
import React from 'react';

import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { Content } from './dialog-content.component';
import * as cx from './dialog-root.css';

export interface DialogRootProps {
  children: ReactNode;
  open: boolean;
  /**
   * The HTMLElement which will be a Portal, the mounting point for the Dialog.
   * @default document.body
   * @see https://www.radix-ui.com/primitives/docs/components/alert-dialog#portal
   */
  portalContainer?: HTMLElement;
  // TODO refactor: pass z-indices config on app level: https://vanilla-extract.style/documentation/packages/dynamic/
  zIndex?: number;
}

export const Root = ({
  open,
  children,
  portalContainer,
  zIndex,
}: Readonly<DialogRootProps>): JSX.Element => (
  <AlertDialog.Root open={open}>
    <AlertDialog.Portal container={portalContainer}>
      <AlertDialog.Overlay className={cx.dialogOverlay} style={{ zIndex }} />
      <AlertDialog.Content asChild>
        <Content
          className={cx.dialogContent}
          style={{ zIndex: zIndex === undefined ? undefined : zIndex + 1 }}
        >
          {children}
        </Content>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
