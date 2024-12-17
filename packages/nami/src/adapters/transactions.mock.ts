/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fn } from '@storybook/test';

import * as actualApi from './transactions';

export * from './transactions';

export const useWalletTxs: jest.Mock = fn(actualApi.useWalletTxs).mockName(
  'useWalletTxs',
);
