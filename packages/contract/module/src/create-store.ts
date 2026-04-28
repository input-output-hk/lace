/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isNotNil } from '@cardano-sdk/util';
import {
  applyMiddleware,
  combineReducers,
  configureStore,
  isAnyOf,
  type Reducer,
  type ReducersMapObject,
  type Store,
  type StoreEnhancer,
} from '@reduxjs/toolkit';
import merge from 'lodash/merge';
import { combineEpics, createEpicMiddleware } from 'redux-observable';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import {
  delay,
  distinctUntilChanged,
  filter,
  map,
  NEVER,
  type Observable,
  share,
  shareReplay,
  Subject,
  takeUntil,
} from 'rxjs';

import { IS_PARAMETERIZED } from './util-selector';

import type {
  Action,
  ActionObservables,
  AnyLaceSideEffect,
  DefaultSideEffectDependencies,
  LaceModuleStoreInit,
  LaceReduxObservableEpic,
  LaceSideEffect,
  ModuleInitDependencies,
  ModuleInitProps,
  ScopedActionCreators,
  ScopedSelectors,
  SideEffectDependencies,
  State,
  StateObservables,
  WithLaceContext,
} from './types';
import type { StateObservable } from 'redux-observable';
import type { Storage } from 'redux-persist';

const createActionObservables = (
  action$: Observable<Action>,
  actions: object,
): ActionObservables<any> => {
  return Object.fromEntries(
    Object.entries(actions).map(([scope, actionCreators]) => [
      scope,
      Object.fromEntries(
        Object.entries(actionCreators).map(
          ([actionCreatorName, actionCreator]) => [
            `${actionCreatorName}$`,
            action$.pipe(filter(isAnyOf(actionCreator as any)), share()),
          ],
        ),
      ),
    ]),
  );
};

export const createStateObservables = (
  state$: Observable<State>,
  selectors: object,
): StateObservables<any> => {
  return Object.fromEntries(
    Object.entries(selectors).map(([scope, selectors]) => [
      scope,
      Object.fromEntries(
        Object.entries(selectors).map(([selectorName, selector]) => {
          const selectorFunction = selector as (...args: any[]) => any;

          return [
            `${selectorName}$`,
            state$.pipe(
              map(state => {
                // Check for explicit parameterized marker first
                if ((selectorFunction as any)[IS_PARAMETERIZED] === true) {
                  return (parameter: unknown) =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    selectorFunction(state, parameter);
                }
                // Fallback to length check for backward compatibility
                if (selectorFunction.length > 1) {
                  return (parameter: unknown) =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    selectorFunction(state, parameter);
                }
                // Otherwise call selector directly
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return selectorFunction(state);
              }),
              distinctUntilChanged(),
              shareReplay(1),
            ),
          ];
        }),
      ),
    ]),
  );
};

const rehydrateStore = async (store: Store): Promise<void> => {
  return new Promise(resolve => {
    persistStore(store, null, resolve);
  });
};

const mergeStoreExports = <T extends object>(
  storeExports: LaceModuleStoreInit[],
  getter: (s: LaceModuleStoreInit) => T | undefined,
): T => merge({}, ...storeExports.map(getter).filter(isNotNil)) as T;
export interface CreateStoreProps extends ModuleInitProps {
  devTools?: boolean;
  lastEnhancer?: StoreEnhancer;
  noEpicDelay?: boolean;
}

export type CreateStoreDependencies = ModuleInitDependencies & {
  reduxPersistStorage: Storage;
  /** Merged last into epic middleware dependencies (e.g. Storybook integration overrides). */
  sideEffectDependenciesOverride?: Partial<SideEffectDependencies>;
};

export type CreateStoreResult<
  Selectors extends ScopedSelectors,
  ActionCreators extends ScopedActionCreators,
> = {
  actionObservables: ActionObservables<ActionCreators>;
  stateObservables: StateObservables<Selectors>;
  store: Store<State, Action>;
  /** Completes all side-effect epics. Call on teardown to prevent zombie subscriptions. */
  teardown: () => void;
};

export const createStore = async <
  Selectors extends ScopedSelectors = ScopedSelectors,
  ActionCreators extends ScopedActionCreators = ScopedActionCreators,
>(
  createStoreProps: Readonly<CreateStoreProps>,
  createStoreDependencies: Readonly<CreateStoreDependencies>,
): Promise<CreateStoreResult<Selectors, ActionCreators>> => {
  const { loadModules, runtime, lastEnhancer } = createStoreProps;
  const { logger, reduxPersistStorage, sideEffectDependenciesOverride } =
    createStoreDependencies;
  const stores = await loadModules('store');
  const storeExports = await Promise.all(
    stores.map(async s =>
      s
        .load()
        .then(async module =>
          module.default(createStoreProps, createStoreDependencies),
        ),
    ),
  );
  const selectors = stores
    .map(s => s.context.selectors)
    .filter((selectors): selectors is object => !!selectors)
    .reduce(Object.assign, {});

  const actions = stores.map(s => s.context.actions).reduce(Object.assign, {});

  const persistConfigs = mergeStoreExports(storeExports, s => s.persistConfig);
  const preloadedState = mergeStoreExports(storeExports, s => s.preloadedState);
  const reducer = combineReducers<ReducersMapObject<State>>(
    Object.assign(
      {},
      ...storeExports.map(m =>
        m.reducers
          ? Object.fromEntries(
              Object.entries(m.reducers).map(([key, reducer]) => [
                key,
                key in persistConfigs
                  ? persistReducer(
                      {
                        key,
                        storage: reduxPersistStorage,
                        ...(persistConfigs as any)[key],
                      },
                      reducer as Reducer,
                    )
                  : reducer,
              ]),
            )
          : undefined,
      ),
    ),
  );

  const toEpic =
    (sideEffect: AnyLaceSideEffect): LaceReduxObservableEpic =>
    (action$, state$, dependencies) =>
      sideEffect(
        createActionObservables(action$, actions),
        createStateObservables(state$, selectors),
        dependencies,
      ).pipe(createStoreProps.noEpicDelay ? a => a : delay(0));

  let actionObservables: ActionObservables<ActionCreators>;
  let stateObservables: StateObservables<Selectors>;
  let state$: StateObservable<State> | null = null;

  const captureObservables: LaceSideEffect<Selectors, ActionCreators> = (
    actions,
    state,
  ) => {
    actionObservables = actions;
    stateObservables = state;
    return NEVER;
  };

  const rootEpic = combineEpics(
    ...[
      ...storeExports
        .flatMap(({ sideEffects }) => sideEffects)
        .filter(isNotNil),
      captureObservables,
    ].map(toEpic),
    (_, stateObservable$) => {
      state$ = stateObservable$;
      return NEVER;
    },
  );

  const defaultDependencies: DefaultSideEffectDependencies & WithLaceContext = {
    actions,
    selectors,
    createKeyValueStorage: () => {
      // this is here just to avoid typecast
      throw new Error('This must be overridden by storage module');
    },
    __getState: () => {
      if (!state$) {
        throw new Error(
          '__getState() is not available during SideEffect initialization',
        );
      }
      return state$.value;
    },
    runtime,
    logger,
    loadModules,
  };
  const dependencies = Object.assign(
    defaultDependencies,
    ...storeExports.map(({ sideEffectDependencies }) => sideEffectDependencies),
    sideEffectDependenciesOverride ?? {},
  ) as SideEffectDependencies & WithLaceContext;
  const epicMiddleware = createEpicMiddleware<
    Action,
    Action,
    State,
    SideEffectDependencies & WithLaceContext
  >({
    dependencies,
  });
  const middleware = storeExports
    .map(({ middleware }) => middleware)
    .filter(isNotNil)
    .flat();
  const store = configureStore({
    reducer,
    preloadedState,
    devTools: createStoreProps.devTools || false,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'accountManagement/attemptAddAccount',
            'accountManagement/attemptAddInMemoryWalletAccount',
            'txExecutor/tx-phase-completed',
            'cardanoContext/setProtocolParameters',
            'cardanoContext/setEraSummaries',
            'cardanoContext/setStakePoolsData',
            'cardanoContext/setAccountUtxos',
            FLUSH,
            REHYDRATE,
            PAUSE,
            PERSIST,
            PURGE,
            REGISTER,
          ],
        },
      }),
    enhancers: getDefaultEnhancers => {
      const enhancers = getDefaultEnhancers().prepend([
        applyMiddleware(...middleware, epicMiddleware),
      ]);
      if (lastEnhancer) {
        return enhancers.concat(lastEnhancer);
      }
      return enhancers;
    },
  });

  if (Object.keys(persistConfigs)) {
    await rehydrateStore(store);
  }

  const epicTeardown$ = new Subject<void>();
  epicMiddleware.run((...args) =>
    rootEpic(...args).pipe(takeUntil(epicTeardown$)),
  );
  return {
    store,
    teardown: () => {
      epicTeardown$.next();
      epicTeardown$.complete();
    },
    actionObservables: actionObservables!,
    stateObservables: stateObservables!,
  };
};
