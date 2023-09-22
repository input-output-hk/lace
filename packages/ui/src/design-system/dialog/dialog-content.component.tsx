import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';

import classNames from 'classnames';

import * as cx from './dialog-content.css';

import type { AlertDialogContentProps } from '@radix-ui/react-alert-dialog';

export interface DialogContentProps extends AlertDialogContentProps {
  children: ReactNode;
  className?: string;
}

export const Content = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className, ...rest }, forwardReference) => (
    <div
      {...rest}
      className={classNames(cx.dialogContent, className)}
      ref={forwardReference}
    >
      {children}
    </div>
  ),
);
// eslint-disable-next-line functional/immutable-data
Content.displayName = 'Content';
