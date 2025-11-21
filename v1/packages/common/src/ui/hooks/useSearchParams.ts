import { useLocation } from 'react-router-dom';

export const useSearchParams = <T extends string>(keys: T[]): Record<T, string | null> => {
  const { search } = useLocation();
  const urlSearchParams = new URLSearchParams(search);
  const searchParams = {} as Record<T, string | null>;
  keys.forEach((key: T) => {
    searchParams[key] = urlSearchParams.get(key);
  });
  return searchParams;
};
