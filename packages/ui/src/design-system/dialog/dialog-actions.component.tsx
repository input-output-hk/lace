import type { ReactNode } from 'react';
import React from 'react';

import * as cx from './dialog-actions.css';

export interface DialogActionsProps {
  children: ReactNode;
}

export const Actions = ({
  children,
}: Readonly<DialogActionsProps>): JSX.Element => (
  <div className={cx.dialogActions}>{children}</div>
);
