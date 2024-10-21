/* eslint-disable functional/no-throw-statements */
import { useContext } from 'react';

import { context } from './context';

import type { CommonOutsideHandlesContextValue } from './types';

export const useOutsideHandles = ():
  | CommonOutsideHandlesContextValue
  | never => {
  const contextValue = useContext(context);
  if (!contextValue)
    throw new Error('Common OutsideHandles context not defined');
  return contextValue;
};
