import { fn } from '@storybook/test';

import * as actualApi from './wallet';

export * from './wallet';

export const buildTx: jest.Mock = fn(actualApi.buildTx).mockName('buildTx');
