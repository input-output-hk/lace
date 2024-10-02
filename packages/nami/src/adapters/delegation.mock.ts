/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fn } from '@storybook/test';

import * as actualApi from './delegation';

export * from './delegation';

export const useDelegation = fn(actualApi.useDelegation).mockName(
  'useDelegation',
);
