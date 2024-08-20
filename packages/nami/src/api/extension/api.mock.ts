/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fn } from '@storybook/test';

import * as actualApi from './';

import type { HardwareDeviceInfo } from '../../ui/app/hw/types';

export * from './';

export const createTab = fn(actualApi.createTab).mockName('createTab');

export const getAccounts = fn(actualApi.getAccounts).mockName('getAccounts');

export const getHwAccounts = fn(
  // eslint-disable-next-line @typescript-eslint/require-await
  async ({ device, id }: Readonly<HardwareDeviceInfo>) =>
    actualApi.getHwAccounts({ device, id }),
).mockName('getHwAccounts');

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

export const getUtxos = fn(actualApi.getUtxos).mockName('getUtxos');

export const getAdaHandle = fn(actualApi.getAdaHandle).mockName('getAdaHandle');

export const getAsset = fn(actualApi.getAsset).mockName('getAsset');

export const updateTxInfo = fn(actualApi.updateTxInfo).mockName('updateTxInfo');

export const setTransactions = fn(actualApi.setTransactions).mockName(
  'setTransactions',
);

export const setTxDetail = fn(actualApi.setTxDetail).mockName('setTxDetail');

export const createHWAccounts = fn(actualApi.createHWAccounts).mockName(
  'createHWAccounts',
);

export const initHW = fn(
  async ({ device, id }: Readonly<HardwareDeviceInfo>) => {
    return actualApi.initHW({ device, id });
  },
).mockName('initHW');

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const getFavoriteIcon = fn(actualApi.getFavoriteIcon).mockName(
  'getFavoriteIcon',
);

export const extractKeyOrScriptHash = fn(
  actualApi.extractKeyOrScriptHash,
).mockName('extractKeyOrScriptHash');
