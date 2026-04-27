import { map } from 'rxjs';
import { describe, it } from 'vitest';

import { testSideEffect } from '../src';

import type { State, LaceSideEffect } from '@lace-contract/module';

type Selectors = { scope: { selectNumber: (state: State) => number } };
type ActionCreators = {
  scope: { someAction: () => { type: string } };
};

describe('test-side-effect', () => {
  it('lets you assert behavior of a side effect observable', () => {
    const sideEffect: LaceSideEffect<Selectors, ActionCreators> = ({
      scope: { someAction$ },
    }) => someAction$.pipe(map((_, index) => ({ type: 'Action' + index })));

    testSideEffect(sideEffect, ({ cold, expectObservable }) => ({
      actionObservables: {
        scope: { someAction$: cold('abc') },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('abc', {
          a: { type: 'Action0' },
          b: { type: 'Action1' },
          c: { type: 'Action2' },
        });
      },
    }));
  });
});
