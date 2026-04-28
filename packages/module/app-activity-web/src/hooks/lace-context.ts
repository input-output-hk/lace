import { createContextualUseLoadModules } from '@lace-lib/util-render';

import type { AvailableAddons } from '../';

// Context-aware useLoadModules hook scoped to this module's available addons
export const useLoadModules = createContextualUseLoadModules<AvailableAddons>();
