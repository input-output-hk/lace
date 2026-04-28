import React from 'react';

import { ReloadPrompt } from './reload-prompt';

import type { LaceInit } from '@lace-contract/module';
import type { Render } from '@lace-contract/views';

const render: LaceInit<Render[]> = () => [
  {
    key: 'reload-prompt',
    Component: () => <ReloadPrompt />,
  },
];

export default render;
