import React from 'react';

import * as Toast from '@radix-ui/react-toast';

import * as cx from './toast-bar-viewport.css';

interface Props {
  zIndex?: number;
}

export const Viewport = ({ zIndex }: Readonly<Props>): JSX.Element => {
  return <Toast.Viewport className={cx.viewport} style={{ zIndex }} />;
};
