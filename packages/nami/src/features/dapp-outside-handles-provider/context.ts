import { createContext } from 'react';

import type { DappOutsideHandlesContextValue } from './types';

export const context = createContext<DappOutsideHandlesContextValue | null>(
  // eslint-disable-next-line unicorn/no-null
  null,
);

export const { Provider } = context;
