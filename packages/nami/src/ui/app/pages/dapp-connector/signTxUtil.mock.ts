import { fn } from '@storybook/test';

import * as actualApi from './signTxUtil';

export * from './signTxUtil';

export const getValue = fn(actualApi.getValue).mockName('getValue');

export const getKeyHashes = fn(actualApi.getKeyHashes).mockName('getKeyHashes');
