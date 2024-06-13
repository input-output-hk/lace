import { fn } from '@storybook/test';

import * as actualApi from './';

export * from './';

export const createTab = fn(actualApi.createTab).mockName('createTab');

export const getAccounts = fn(actualApi.getAccounts).mockName('getAccounts');

export const getCurrentAccount = fn(actualApi.getCurrentAccount).mockName(
  'getCurrentAccount',
);

export const getCurrentAccountIndex = fn(
  actualApi.getCurrentAccountIndex,
).mockName('getCurrentAccountIndex');

export const getDelegation = fn(actualApi.getDelegation).mockName(
  'getDelegation',
);

export const getNativeAccounts = fn(actualApi.getNativeAccounts).mockName(
  'getNativeAccounts',
);

export const getNetwork = fn(actualApi.getNetwork).mockName('getNetwork');

export const getTransactions = fn(actualApi.getTransactions).mockName(
  'getTransactions',
);

export const switchAccount = fn(actualApi.switchAccount).mockName(
  'switchAccount',
);

export const updateAccount = fn(actualApi.updateAccount).mockName(
  'updateAccount',
);

export const onAccountChange = fn(actualApi.onAccountChange).mockName(
  'onAccountChange',
);

export const getAsset = fn(actualApi.getAsset).mockName('getAsset');
