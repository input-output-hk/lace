import { createContext } from 'react';
import { OutsideHandlesContextValue } from './types';

export const context = createContext<OutsideHandlesContextValue | null>(null);

export const { Provider } = context;
