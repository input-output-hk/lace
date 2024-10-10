import { fn } from '@storybook/test';

import * as actualApi from './util';

export * from './util';

export const minAdaRequired = fn(actualApi.minAdaRequired).mockName(
  'minAdaRequired',
);
