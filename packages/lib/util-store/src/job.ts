import { createSlice } from '@reduxjs/toolkit';

import type { Draft, PayloadAction } from '@reduxjs/toolkit';
import type * as _ from 'immer';

export type JobId = string;
export type Job<P, R, E> = {
  error?: E;
  payload: P;
  result?: R;
};
export type Jobs<P, R, E> = {
  jobs: Partial<{
    [id: JobId]: Job<P, R, E>;
  }>;
};

type Drafted<T> = T extends infer V ? (V extends object ? Draft<V> : V) : never;

export const createJobsSlice = <Name extends string, P, R, E>(
  name: Name,
  jobIdSelectors: {
    completed: (r: R) => JobId;
    failed: (error: E) => JobId;
    start: (p: P) => JobId;
  },
) => {
  const slice = createSlice({
    name,
    initialState: { jobs: {} } as Jobs<P, R, E>,
    reducers: {
      start: (state, { payload }: PayloadAction<P>) => {
        state.jobs[jobIdSelectors.start(payload)] = {
          payload: payload as Drafted<P>,
        };
      },
      completed: (state, { payload }: PayloadAction<R>) => {
        const jobId = jobIdSelectors.completed(payload);
        const job = state.jobs[jobId];
        if (job) job.result = payload as Drafted<R>;
      },
      failed: (state, { payload }: PayloadAction<E>) => {
        const jobId = jobIdSelectors.failed(payload);
        const job = state.jobs[jobId];
        if (job) job.error = payload as Drafted<E>;
      },
    },
    selectors: {
      jobs: state => state.jobs,
    },
  });
  return slice;
};
