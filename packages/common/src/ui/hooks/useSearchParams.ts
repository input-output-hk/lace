import { useLocation } from 'react-router-dom';

export const useSearchParams = <T extends string>(keys: T[]): Record<T, string> => {
  const { search } = useLocation();
  const urlSearchParams = new URLSearchParams(search);
  const searchParams = {} as Record<T, string>;
  keys.forEach((key) => {
    const paramFound = urlSearchParams.get(key);
    if (paramFound) searchParams[key];
  });
  return searchParams;
};
