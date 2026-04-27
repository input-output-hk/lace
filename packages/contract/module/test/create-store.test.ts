/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { setTimeout as setTimeoutPromisified } from 'node:timers/promises';

import { createAction } from '@reduxjs/toolkit';
import { map, tap, BehaviorSubject, take } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  combineContracts,
  ContractName,
  createModuleLoader,
  createStore,
  createStateObservables,
  inferContractContext,
  inferModuleContext,
  inferStoreContext,
  ModuleName,
} from '../src';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  AnyLaceSideEffect,
  AppConfig,
} from '../src';
import type { Storage } from 'redux-persist';

type Selectors = ModuleSelectors<ReturnType<typeof makeTestModule>>;
type ActionCreators = ModuleActionCreators<ReturnType<typeof makeTestModule>>;
type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

const trigger = createAction('test/trigger');

const makeTestModule = (sideEffects: AnyLaceSideEffect[]) =>
  inferModuleContext({
    moduleName: ModuleName('test-module'),
    implements: combineContracts([
      inferContractContext({
        contractType: 'sideEffectDependency',
        name: ContractName('test-contract'),
        instance: 'exactly-one',
      }),
    ] as const),
    store: inferStoreContext({
      context: {
        actions: {
          test: {
            finalize: createAction('test/finalize'),
            react: createAction('test/react'),
            trigger,
          },
        },
      },
      load: async () => ({
        default: () => ({
          reducers: {
            test: (state = 'state') => state,
          },
          persistConfig: {
            test: { version: 1 },
          },
          sideEffects,
        }),
      }),
    }),
    addons: {},
  });

const runtime = {
  app: 'lace-extension' as const,
  env: 'production' as const,
  config: {} as AppConfig,
  platform: 'web-extension' as const,
  features: {
    availableModules: [],
    loaded: {
      featureFlags: [],
      modules: [],
    },
  },
};

const logger = console;

const reduxPersistStorage: Storage & { items: any } = {
  items: {} as Record<string, unknown>,
  async getItem(k) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.items[k];
  },
  async removeItem(k) {
    delete this.items[k];
  },
  async setItem(k, v) {
    this.items[k] = v;
  },
};

const makeStore = async (sideEffects: SideEffect[]) =>
  createStore(
    {
      loadModules: createModuleLoader(
        { modules: [makeTestModule(sideEffects)], runtime },
        { logger },
      ),
      runtime,
    },
    { logger, reduxPersistStorage },
  );

describe('createStore', () => {
  it('processes actions dispatched from side-effects asynchronously', async () => {
    const sideEffectLogger = vi.fn();
    const { store } = await makeStore([
      ({ test: { trigger$ } }, _, { actions }) =>
        trigger$.pipe(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          tap(() => sideEffectLogger('first')),
          map(() => actions.test.react()),
        ),
      ({ test: { trigger$ } }, _, { actions }) =>
        trigger$.pipe(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          tap(() => sideEffectLogger('second')),
          map(() => actions.test.react()),
        ),
      ({ test: { react$ } }, _, { actions }) =>
        react$.pipe(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          tap(() => sideEffectLogger('third')),
          map(() => actions.test.finalize()),
        ),
    ]);

    store.dispatch(trigger());
    await setTimeoutPromisified(1);

    const expectedLogs = ['first', 'second', 'third', 'third'];

    for (const [index, action] of expectedLogs.entries()) {
      expect(sideEffectLogger).toHaveBeenNthCalledWith(index + 1, action);
    }
  });

  describe('createStateObservables', () => {
    interface User {
      id: string;
      name: string;
      role: string;
    }

    interface MockState {
      users: User[];
    }

    const mockSelectors = {
      users: {
        selectAllUsers: (state: MockState) => state.users,
        selectUserById: (state: MockState, userId: string) =>
          state.users.find(user => user.id === userId),
      },
    };

    const mockState: MockState = {
      users: [
        { id: '1', name: 'Alice', role: 'admin' },
        { id: '2', name: 'Bob', role: 'user' },
        { id: '3', name: 'Charlie', role: 'admin' },
      ],
    };

    let state$: BehaviorSubject<MockState>;
    let stateObservables: any;

    beforeEach(() => {
      state$ = new BehaviorSubject<MockState>(mockState);
      stateObservables = createStateObservables(state$, mockSelectors);
    });

    it('should emit bound selector functions for parameterized selectors', () => {
      let selectUserById!: (userId: string) => User | undefined;

      stateObservables.users.selectUserById$
        .pipe(take(1))
        .subscribe((function_: any) => {
          selectUserById = function_;
        });

      expect(selectUserById('1')).toEqual({
        id: '1',
        name: 'Alice',
        role: 'admin',
      });
    });

    it('should return values directly for parameterless selectors', () => {
      let capturedValue!: User[];

      stateObservables.users.selectAllUsers$
        .pipe(take(1))
        .subscribe((value: any) => {
          capturedValue = value;
        });

      expect(Array.isArray(capturedValue)).toBe(true);
      expect(capturedValue).toHaveLength(3);
    });
  });
});
