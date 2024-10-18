import { createContext } from 'react';

import type { CommonOutsideHandlesContextValue } from './types';

export const context = createContext<CommonOutsideHandlesContextValue | null>(
  // eslint-disable-next-line unicorn/no-null
  null,
);

export const { Provider } = context;
