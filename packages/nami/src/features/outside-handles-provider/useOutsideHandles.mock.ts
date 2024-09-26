/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fn } from '@storybook/test';

import * as actualApi from './useOutsideHandles';

export * from './useOutsideHandles';

export const useOutsideHandles = fn(actualApi.useOutsideHandles).mockName(
  'useOutsideHandles',
);
