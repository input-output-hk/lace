import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import classNames from 'classnames';

import { ContentCard } from './side-drawer-content-card.component';
import * as cx from './side-drawer-content.css';
import { Overlay } from './side-drawer-overlay.component';

type Props = Dialog.DialogPortalProps &
  Omit<Dialog.DialogContentProps, 'className'> & { zIndex?: number };

export const Content = ({
  children,
  zIndex,
  container,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Dialog.Portal container={container}>
    <Overlay zIndex={zIndex} />
    <Dialog.Content
      {...props}
      className={classNames(cx.container)}
      style={{ zIndex: zIndex === undefined ? undefined : zIndex + 1 }}
    >
      <ContentCard>{children}</ContentCard>
    </Dialog.Content>
  </Dialog.Portal>
);
