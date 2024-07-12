/* eslint-disable @typescript-eslint/no-explicit-any */
import { fn } from '@storybook/test';

import * as actual from './store';

export * from './store';

export const useStoreState: any = fn(actual.useStoreState).mockName(
  'useStoreState',
);

export const useStoreActions: any = fn(actual.useStoreActions).mockName(
  'useStoreActions',
);
