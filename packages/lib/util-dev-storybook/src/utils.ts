import { combineContracts, ModuleName } from '@lace-contract/module';
import { map } from 'rxjs';

import type {
  LaceModule,
  SideEffectDependencies,
  LaceSideEffect,
  ScopedSelectors,
  ScopedActionCreators,
  ViewId,
  ActionObservables,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { Observable } from 'rxjs';

export type PatchModule = (m: LaceModule) => LaceModule;

export const patchModules = (
  modules: LaceModule[],
  patches: Record<ModuleName, PatchModule>,
): LaceModule[] =>
  modules.map(m => (m.moduleName in patches ? patches[m.moduleName](m) : m));

export const createIntegrationModules = <
  S extends ScopedSelectors,
  A extends ScopedActionCreators,
>({
  modulesToLoad,
  storageModule,
  bockfrostProviderModule,
  sideEffects,
  sideEffectDependencies,
}: {
  modulesToLoad: LaceModule[];
  storageModule: LaceModule;
  bockfrostProviderModule?: LaceModule;
  sideEffects: LaceSideEffect<S, A>[];
  sideEffectDependencies: Partial<SideEffectDependencies>;
}): LaceModule[] => [
  ...modulesToLoad,
  storageModule,
  ...(bockfrostProviderModule ? [bockfrostProviderModule] : []),
  // an additional 'test' module is used to inject stub sideEffects and sideEffectDependencies
  {
    moduleName: ModuleName('test'),
    implements: combineContracts([] as const),
    store: {
      context: {
        actions: {},
        selectors: {},
      },
      load: async () => ({
        default: () => ({ sideEffects, sideEffectDependencies }),
      }),
    },
    addons: {},
  } as LaceModule<object, object, object, object, object, object, []>,
];

export const getNavigationSideEffectStub = <
  S extends ScopedSelectors,
  A extends ScopedActionCreators,
>(
  viewId: ViewId,
): LaceSideEffect<S, A> => {
  return ((
    actionObservables: ActionObservables<A>,
    _: StateObservables<S>,
    { actions }: WithLaceContext<S, A>,
  ) =>
    (
      actionObservables as unknown as {
        views: {
          navigate$: Observable<{
            payload: { viewId: ViewId; args: [string] };
          }>;
        };
      }
    ).views.navigate$.pipe(
      map(({ payload }) =>
        (
          actions as unknown as {
            views: {
              locationChanged: (props: {
                viewId: ViewId;
                location: string;
              }) => unknown;
            };
          }
        ).views.locationChanged({
          viewId,
          location: payload.args[0],
        }),
      ),
    )) as LaceSideEffect<S, A>;
};

export type RetryUntilOptions = {
  /**
   * Default: 10
   */
  numberOfTries?: number;
  errorMessage: string;
};

export const retryUntil = async <T>(
  action: () => Promise<T>,
  check: (result: T) => Promise<boolean>,
  { numberOfTries = 10, errorMessage }: RetryUntilOptions,
): Promise<T> => {
  if (numberOfTries === 0) throw new Error('Too many retries: ' + errorMessage);
  const result = await action();
  if (await check(result)) {
    return result;
  }
  return retryUntil(action, check, {
    errorMessage,
    numberOfTries: numberOfTries - 1,
  });
};
