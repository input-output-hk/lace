/* eslint-disable functional/no-throw-statements */
import { useContext } from 'react';

import { context } from './context';

import type { OutsideHandlesContextValue } from './types';

export const useOutsideHandles = (): OutsideHandlesContextValue | never => {
  const contextValue = useContext(context);
  if (!contextValue) throw new Error('OutsideHandles context not defined');
  return contextValue;
};
