import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import * as cx from './side-drawer-overlay.css';

interface Props {
  zIndex?: number;
}

export const Overlay = ({ zIndex }: Readonly<Props>): JSX.Element => (
  <Dialog.Overlay className={cx.container} style={{ zIndex }} />
);
