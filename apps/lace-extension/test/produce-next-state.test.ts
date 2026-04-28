import { describe, expect, it, vi } from 'vitest';

import { produceNextState } from '../src/util';

import type { State } from '@lace-contract/module';

vi.mock('../src/util/config', () => ({
  ENV: 'testing',
}));

describe('produce next state', () => {
  const initialState = {
    first: {
      some: 'some',
      prop: 'prop',
    },
    second: {
      another: 'another',
      nested: {
        prop: 'prop',
      },
    },
  };
  it('returns exactly the same state hierarchy when nothing has changed', () => {
    const state = produceNextState(
      initialState as unknown as State,
      JSON.parse(JSON.stringify(initialState)),
    ) as unknown as typeof initialState;

    // all parts of the state should stay referentially the same
    expect(state === initialState).toBeTruthy();
    expect(state.first === initialState.first).toBeTruthy();
    expect(state.second === initialState.second).toBeTruthy();
    expect(state.second.nested === initialState.second.nested).toBeTruthy();
  });

  it('makes an immutable update of changed sub-paths of state', () => {
    const clonedState = JSON.parse(
      JSON.stringify(initialState),
    ) as unknown as typeof initialState;
    clonedState.second.nested.prop = 'changed';

    const state = produceNextState(
      initialState as unknown as State,
      clonedState as unknown as State,
    ) as unknown as typeof initialState;

    // The root of produced state always needs to change
    expect(state !== initialState).toBeTruthy();
    // But unchanged sub-paths should stay referencially the same
    expect(state.first === initialState.first).toBeTruthy();
    // And changed sub-paths need to be referntially different (immutability)
    expect(state.second !== initialState.second).toBeTruthy();
    expect(state.second.nested !== initialState.second.nested).toBeTruthy();
    expect(state.second.nested.prop).toEqual('changed');
  });
});
