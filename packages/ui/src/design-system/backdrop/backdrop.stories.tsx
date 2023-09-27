import React from 'react';

import type { Meta } from '@storybook/react';

import { Backdrop } from './backdrop.component';

export default {
  title: 'Modals/Backdrop',
  component: Backdrop,
} as Meta;

export const Overview = (): JSX.Element => <Backdrop />;
