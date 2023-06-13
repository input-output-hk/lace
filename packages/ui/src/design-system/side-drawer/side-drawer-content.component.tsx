import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import classNames from 'classnames';

import { ContentCard } from './side-drawer-content-card.component';
import * as cx from './side-drawer-content.css';

type Props = Omit<Dialog.DialogContentProps, 'className'> & { zIndex?: number };

export const Content = ({
  children,
  zIndex,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Dialog.Content
    {...props}
    className={classNames(cx.container)}
    style={{ zIndex }}
  >
    <ContentCard>{children}</ContentCard>
  </Dialog.Content>
);
