import { loadedSelectors } from '@lace-contract/module';
import { createUseLaceSelectorHook } from '@lace-lib/util-render';

import type { Selectors } from './contracts';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);
