import { useHistory, generatePath } from 'react-router';
import { useCallback } from 'react';

type GenericParams = Record<string, string>;

interface RouteConfig<P extends GenericParams = never, S extends GenericParams = never> {
  params?: P;
  search?: S;
}

export type RedirectionHandler<R> = (...args: R extends never ? [] : [R]) => void;

export const useRedirection = <R extends RouteConfig<GenericParams, GenericParams> = never>(
  path: string
): [RedirectionHandler<R>] => {
  const history = useHistory();

  const handleRedirection: RedirectionHandler<R> = useCallback(
    (config = {}) => {
      let url = path;
      if (config?.params) {
        url = generatePath(url, config.params);
      }
      if (config?.search) {
        const searchParams = new URLSearchParams(config.search);
        url = `${url}?${searchParams.toString()}`;
      }
      history.push(url);
    },
    [path, history]
  );

  return [handleRedirection];
};
