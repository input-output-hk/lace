import { beforeEach, describe, expect, it } from 'vitest';

import { createJobsSlice } from '../src';

type Identifiable = {
  id: string;
};

type JobFailure = { entity: Identifiable; reason: string };

const jobs = createJobsSlice('testAction', {
  start: (object: Identifiable) => object.id,
  completed: (object: Identifiable) => object.id,
  failed: (failure: JobFailure) => failure.entity.id,
});

describe('jobs slice', () => {
  let initialState = jobs.getInitialState();

  beforeEach(() => {
    initialState = jobs.getInitialState();
  });

  describe('reducers', () => {
    it('jobs that started should not have result or error fields set', () => {
      const action = jobs.actions.start({ id: '1' });

      const state = jobs.reducer(initialState, action);

      expect(state.jobs).toEqual({
        '1': { payload: { id: '1' } },
      });
    });

    it('jobs that completed should have result field set', () => {
      // Arrange
      initialState = {
        jobs: {
          '1': { payload: { id: '1' } },
        },
      };

      // Act
      const action = jobs.actions.completed({ id: '1' });

      // Assert
      const state = jobs.reducer(initialState, action);

      expect(state.jobs).toEqual({
        '1': { payload: { id: '1' }, result: { id: '1' } },
      });
    });

    it('jobs that failed should have error field set', () => {
      // Arrange
      initialState = {
        jobs: {
          '1': { payload: { id: '1' } },
        },
      };

      // Act
      const action = jobs.actions.failed({
        entity: { id: '1' },
        reason: 'error',
      });

      // Assert
      const state = jobs.reducer(initialState, action);

      expect(state.jobs).toEqual({
        '1': {
          payload: { id: '1' },
          error: { entity: { id: '1' }, reason: 'error' },
        },
      });
    });
  });
});
