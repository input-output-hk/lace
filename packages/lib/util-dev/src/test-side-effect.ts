import { createTestScheduler } from '@cardano-sdk/util-dev';

import type {
  ActionObservables,
  ActionType,
  ScopedActionCreators,
  ScopedSelectors,
  SideEffectDependencies,
  StateObservables,
  LaceSideEffect,
  WithLaceContext,
} from '@lace-contract/module';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';
import type { Primitive } from 'type-fest';

/** Recursively make all properties optional Do not recurse into O types */
export type DeepPartialTilObservable<T, O = never> = T extends
  | O
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Observable<any>
  | Primitive
  ? T
  : {
      [P in keyof T]?: DeepPartialTilObservable<T[P], O>;
    };

type SideEffectTest<
  Selectors extends ScopedSelectors,
  ActionCreators extends ScopedActionCreators,
> = {
  actionObservables?: DeepPartialTilObservable<
    ActionObservables<ActionCreators>
  >;
  assertion: (
    sideEffect$: Readonly<Observable<ActionType<ActionCreators>>>,
  ) => void;
  dependencies?: Partial<
    SideEffectDependencies & {
      actions: Partial<ActionCreators>;
      selectors: Partial<Selectors>;
    }
  >;
  stateObservables?: DeepPartialTilObservable<StateObservables<Selectors>>;
};

type SideEffectBuilder<
  Selectors extends ScopedSelectors,
  ActionCreators extends ScopedActionCreators,
> = {
  build: (
    helpers: Readonly<RunHelpers>,
  ) => LaceSideEffect<Selectors, ActionCreators>;
};

export const testSideEffect = <
  Selectors extends ScopedSelectors,
  ActionCreators extends ScopedActionCreators,
>(
  sideEffectOrBuilder:
    | LaceSideEffect<Selectors, ActionCreators>
    | SideEffectBuilder<Selectors, ActionCreators>,
  setup: (
    helpers: Readonly<RunHelpers>,
  ) => SideEffectTest<Selectors, ActionCreators>,
) => {
  createTestScheduler().run((helpers): void => {
    const sideEffect =
      typeof sideEffectOrBuilder === 'object' && 'build' in sideEffectOrBuilder
        ? sideEffectOrBuilder.build(helpers)
        : sideEffectOrBuilder;
    const { actionObservables, stateObservables, dependencies, assertion } =
      setup(helpers);
    assertion(
      sideEffect(
        actionObservables as ActionObservables<ActionCreators>,
        stateObservables as StateObservables<Selectors>,
        dependencies as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      ),
    );
  });
};
