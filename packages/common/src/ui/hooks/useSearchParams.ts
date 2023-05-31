import { useLocation } from 'react-router-dom';

export const useSearchParams = <T extends string>(keys: T[]): Record<T, string> => {
  const { search } = useLocation();
  const urlSearchParams = new URLSearchParams(search);
  const searchParams = {} as Record<T, string>;
  keys.forEach((key) => {
    searchParams[key] = urlSearchParams.get(key);
  });
  return searchParams;
};
