import { createSlice } from '@reduxjs/toolkit';

import type {
  EventObject,
  StateMachine,
  StateObject,
} from './create-state-machine';
import type {
  CaseReducer,
  PayloadAction,
  SliceSelectors,
  ValidateSliceCaseReducers,
} from '@reduxjs/toolkit';

type AllEventsReducers<
  State extends StateObject,
  Event extends EventObject,
> = ValidateSliceCaseReducers<
  State,
  {
    [E in Event['type']]: Event extends { payload: unknown; type: E }
      ? CaseReducer<State, PayloadAction<Event['payload']>>
      : Event extends { type: E }
      ? CaseReducer<State>
      : never;
  }
>;

export const createStateMachineSlice = <
  State extends StateObject,
  Event extends EventObject,
  Name extends string,
  Selectors extends SliceSelectors<State>,
>(
  stateMachine: StateMachine<State, Event, Name>,
  options: {
    selectors?: Selectors;
  } = {},
) => {
  const reducers: AllEventsReducers<State, Event> = Object.keys(
    stateMachine.events,
  ).reduce(
    (reducers, eventType) => ({
      ...reducers,
      [eventType]: (state: State, action: Event) =>
        stateMachine.transition(state, {
          ...action,
          type: eventType,
        }),
    }),
    {} as AllEventsReducers<State, Event>,
  );

  return createSlice({
    name: stateMachine.name,
    initialState: stateMachine.initialState,
    reducers,
    selectors: options.selectors,
  });
};
