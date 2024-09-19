/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fn } from '@storybook/test';

import * as actualApi from './collateral';

export * from './collateral';

export const useCollateral = fn(actualApi.useCollateral).mockName(
  'useCollateral',
);
