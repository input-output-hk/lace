import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';

import classNames from 'classnames';

import * as cx from './dialog-content.css';

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export const Content = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className }, forwardReference) => (
    <div
      className={classNames(cx.dialogContent, className)}
      ref={forwardReference}
    >
      {children}
    </div>
  ),
);
// eslint-disable-next-line functional/immutable-data
Content.displayName = 'Content';
