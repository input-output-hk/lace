import type { FC } from 'react';
import React from 'react';

import * as AlertDialog from '@radix-ui/react-alert-dialog';

/**
 * [WARNING]: This is a wrapper for storybook usage only.
 * It provides necessary context from the AlertDialog.Root component (@radix-ui/react-alert-dialog).
 */
export const DialogStorybookContextProvider: FC = ({ children }) => (
  <AlertDialog.Root open>
    <AlertDialog.Content>{children}</AlertDialog.Content>
  </AlertDialog.Root>
);
