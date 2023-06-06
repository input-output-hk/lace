import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import * as cx from './side-drawer-overlay.css';

export const Overlay = (): JSX.Element => (
  <Dialog.Overlay className={cx.container} />
);
