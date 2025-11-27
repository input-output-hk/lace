import { useContext } from 'react';
import { context } from './context';

export const useOutsideHandles = () => {
  const contextValue = useContext(context);
  if (!contextValue) throw new Error('OutsideHandles context not defined');
  return contextValue;
};
