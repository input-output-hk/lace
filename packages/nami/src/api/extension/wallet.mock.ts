import { fn } from '@storybook/test';

import * as actualApi from './wallet';

export * from './wallet';

export const initTx = fn(actualApi.initTx).mockName('initTx');

export const buildTx = fn(actualApi.buildTx).mockName('buildTx');

export const undelegateTx = fn(actualApi.undelegateTx).mockName('undelegateTx');

export const withdrawalTx = fn(actualApi.withdrawalTx).mockName('withdrawalTx');
