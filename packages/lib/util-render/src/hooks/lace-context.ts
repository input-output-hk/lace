/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment  */
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type {
  AnyFunction,
  AnyParameteterlessSelector,
  LoadedActionCreators,
  LoadedSelectors,
  ScopedActionCreators,
  ScopedSelectors,
} from '@lace-contract/module';

type Args<T> = T extends (...args: infer Args) => any ? Args : never;
type KeyCombinations<T> = T extends object
  ? {
      [K in keyof T]: `${K & string}.${string & keyof T[K]}`;
    }[keyof T]
  : never;
type Key1<Key> = Key extends `${infer T}.${infer _}` ? T : never;
type Key2<Key> = Key extends `${infer _}.${infer T}` ? T : never;
type TryInferReturnType<T> = T extends AnyFunction ? ReturnType<T> : never;

export type UseLaceSelectorHook<AvailableSelectors extends ScopedSelectors> =
  ReturnType<typeof createUseLaceSelectorHook<AvailableSelectors>>;

const parseKey = <First, Second>(key: string) => {
  const items = key.split('.');
  if (items.length < 2)
    throw new Error(
      `Invalid key "${key}", expected format: "{scope}.{selectorName}"`,
    );
  return items as [First, Second];
};

export const createUseLaceSelectorHook = <
  AvailableSelectors extends ScopedSelectors,
>(
  loadedSelectors: LoadedSelectors,
) => {
  type ScopeSelectors<Key> = AvailableSelectors[Key1<Key>];
  type SelectorType<Key> = Key2<Key> extends keyof ScopeSelectors<Key>
    ? ScopeSelectors<Key>[Key2<Key>]
    : never;
  type MaybeFirstParameter<T> = T extends (...args: infer P) => any
    ? P[1]
    : never;
  type MaybeReturnType<T> = T extends (...args: any) => infer R ? R : never;
  type ParameterlessSelectors<T> = {
    [k in keyof T as T[k] extends AnyParameteterlessSelector ? k : never]: T[k];
  };
  type ScopedParameterlessSelectors = {
    [scope in keyof AvailableSelectors]: ParameterlessSelectors<
      AvailableSelectors[scope]
    >;
  };

  function useLaceSelector<
    Key extends KeyCombinations<ScopedParameterlessSelectors>,
    Scope extends Key1<Key>,
    SelectorName extends Key2<Key> & keyof ScopedParameterlessSelectors[Scope],
    Selector extends AnyFunction &
      ScopedParameterlessSelectors[Scope][SelectorName],
  >(key: Key): ReturnType<Selector>;

  function useLaceSelector<Key extends KeyCombinations<AvailableSelectors>>(
    key: Key,
    argument: MaybeFirstParameter<SelectorType<Key>>,
  ): MaybeReturnType<SelectorType<Key>>;

  function useLaceSelector(key: string, argument?: unknown): unknown {
    const [scope, selectorName] = parseKey<string, string>(key);
    const selector = (loadedSelectors as any)[scope][
      selectorName
    ] as AnyFunction;

    return useSelector((state: unknown) =>
      argument !== undefined ? selector(state, argument) : selector(state),
    );
  }

  return useLaceSelector;
};

export const createUseDispatchLaceAction =
  <AvailableActionCreators extends ScopedActionCreators>(
    loadedActionCreators: LoadedActionCreators,
  ) =>
  /**
   * @param ignoreArgs if true, it is safe to call it with args (e.g. use as DOM event handler directly)
   */
  <
    Key extends KeyCombinations<AvailableActionCreators>,
    Scope extends Key1<Key>,
    ActionCreatorName extends Key2<Key> & keyof AvailableActionCreators[Scope],
  >(
    key: Key,
    ignoreArgs = false,
  ): AvailableActionCreators[Scope][ActionCreatorName] => {
    const dispatch = useDispatch();
    return useMemo(() => {
      const [scope, actionCreatorName] = parseKey<Scope, ActionCreatorName>(
        key,
      );
      const actionCreator = (loadedActionCreators as any)[scope][
        actionCreatorName
      ];

      const dispatchAction = (
        ...args: Args<AvailableActionCreators[Scope][ActionCreatorName]>
      ): TryInferReturnType<
        AvailableActionCreators[Scope][ActionCreatorName]
      > => {
        const action = ignoreArgs ? actionCreator() : actionCreator(...args);
        dispatch(action);
        return action;
      };
      return dispatchAction as unknown as AvailableActionCreators[Scope][ActionCreatorName];
    }, [dispatch]);
  };
