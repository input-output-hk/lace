import { createContext } from 'react';

import type { OutsideHandlesContextValue } from './types';

// eslint-disable-next-line unicorn/no-null
export const context = createContext<OutsideHandlesContextValue | null>(null);

export const { Provider } = context;
