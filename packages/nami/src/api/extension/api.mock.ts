/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fn } from '@storybook/test';

import * as actualApi from './';

import type { HardwareDeviceInfo } from '../../ui/app/hw/types';

export * from './';

export const createTab: jest.Mock = fn(actualApi.createTab).mockName(
  'createTab',
);

export const isValidAddress: jest.Mock = fn(actualApi.isValidAddress).mockName(
  'isValidAddress',
);

export const getAdaHandle: jest.Mock = fn(actualApi.getAdaHandle).mockName(
  'getAdaHandle',
);

export const initHW: jest.Mock = fn(
  async ({ device, id }: Readonly<HardwareDeviceInfo>) => {
    console.log({ device, id });
    return actualApi.initHW();
  },
).mockName('initHW');

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const getFavoriteIcon: jest.Mock = fn(
  actualApi.getFavoriteIcon,
).mockName('getFavoriteIcon');
