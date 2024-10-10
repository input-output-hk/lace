import { fn } from '@storybook/test';

import * as actualApi from './useOutsideHandles';

export * from './useOutsideHandles';

export const useCommonOutsideHandles: jest.Mock = fn(
  actualApi.useOutsideHandles,
).mockName('useOutsideHandles');
