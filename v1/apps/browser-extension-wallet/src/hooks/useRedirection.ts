import { useHistory, generatePath } from 'react-router-dom';
import { useCallback } from 'react';

type GenericParams = Record<string, string>;

interface RouteConfig<P extends GenericParams = never, S extends GenericParams = never> {
  params?: P;
  search?: S;
}

export type RedirectionHandler<R> = (...args: [R] extends [never] ? [] : [R]) => void;

export const useRedirection = <R extends RouteConfig<GenericParams, GenericParams> = never>(
  path: string
): RedirectionHandler<R> => {
  const history = useHistory();

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config = {} as any) => {
      let url = path;
      if (config.params) {
        url = generatePath(url, config.params);
      }
      if (config.search) {
        const searchParams = new URLSearchParams(config.search);
        url = `${url}?${searchParams.toString()}`;
      }
      history.push(url);
    },
    [path, history]
  );
};
