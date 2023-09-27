import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import classNames from 'classnames';

import { Backdrop } from '../backdrop';

import { ContentCard } from './side-drawer-content-card.component';
import * as cx from './side-drawer-content.css';

// TODO refactor: pass z-indices config on app level: https://vanilla-extract.style/documentation/packages/dynamic/
type Props = Dialog.DialogPortalProps &
  Omit<Dialog.DialogContentProps, 'className'> & { zIndex?: number };

export const Content = ({
  children,
  zIndex,
  container,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Dialog.Portal container={container}>
    <Dialog.Overlay asChild>
      <Backdrop zIndex={zIndex} />
    </Dialog.Overlay>
    <Dialog.Content
      {...props}
      className={classNames(cx.container)}
      style={{ zIndex: zIndex === undefined ? undefined : zIndex + 1 }}
    >
      <ContentCard>{children}</ContentCard>
    </Dialog.Content>
  </Dialog.Portal>
);
