import type { ReactNode } from 'react';
import React from 'react';

import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { Text } from '../text';

import * as cx from './dialog-title.css';

export interface DialogTitleProps {
  children: ReactNode;
}

export const Title = ({
  children,
}: Readonly<DialogTitleProps>): JSX.Element => (
  <AlertDialog.Title asChild>
    {typeof children === 'string' ? (
      <Text.SubHeading weight="$bold" className={cx.dialogTitle}>
        {children}
      </Text.SubHeading>
    ) : (
      children
    )}
  </AlertDialog.Title>
);
