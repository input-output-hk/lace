import type { ReactNode } from 'react';
import React from 'react';

import * as AlertDialog from '@radix-ui/react-alert-dialog';

import * as Text from '../typography';

import * as cx from './dialog-description.css';

export interface DialogDescriptionProps {
  children: ReactNode;
}

export const Description = ({
  children,
}: Readonly<DialogDescriptionProps>): JSX.Element => (
  <AlertDialog.Description asChild>
    {typeof children === 'string' ? (
      <Text.Body.Normal className={cx.dialogDescription}>
        {children}
      </Text.Body.Normal>
    ) : (
      children
    )}
  </AlertDialog.Description>
);
