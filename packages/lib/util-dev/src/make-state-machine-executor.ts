export const makeStateMachineExecutor =
  <State extends object, Event extends { type: string }>(stateMachine: {
    transition: (state: State, event: Event) => State;
  }) =>
  (initialState: State, ...events: [Event, ...Event[]]) =>
    events.reduce(stateMachine.transition, initialState);
