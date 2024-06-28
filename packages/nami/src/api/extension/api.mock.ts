/* eslint-disable @typescript-eslint/no-unsafe-argument */
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

export const isValidAddress = fn(actualApi.isValidAddress).mockName(
  'isValidAddress',
);

export const isValidEthAddress = fn(actualApi.isValidEthAddress).mockName(
  'isValidEthAddress',
);

export const getUtxos = fn(actualApi.getUtxos).mockName('getUtxos');

export const updateRecentSentToAddress = fn(
  actualApi.updateRecentSentToAddress,
).mockName('updateRecentSentToAddress');

export const getAdaHandle = fn(actualApi.getAdaHandle).mockName('getAdaHandle');

export const getAsset = fn(actualApi.getAsset).mockName('getAsset');

export const getWhitelisted = fn(actualApi.getWhitelisted).mockName(
  'getWhitelisted',
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const getFavoriteIcon = fn(actualApi.getFavoriteIcon).mockName(
  'getFavoriteIcon',
);
