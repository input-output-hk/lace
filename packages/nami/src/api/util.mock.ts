/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fn } from '@storybook/test';

import * as actualApi from './util';

export * from './util';

export const minAdaRequired = fn(actualApi.minAdaRequired).mockName(
  'minAdaRequired',
);

export const sumUtxos = fn(actualApi.sumUtxos).mockName('sumUtxos');

export const valueToAssets = fn(actualApi.valueToAssets).mockName(
  'valueToAssets',
);
