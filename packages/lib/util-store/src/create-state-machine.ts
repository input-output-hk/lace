/* eslint-disable @typescript-eslint/no-explicit-any */

export type StateObject<
  S extends string = string,
  Data extends object = object,
> = Data & { status: S };

export type EventObject<
  T extends string = string,
  P extends object | undefined = undefined,
> = P extends undefined ? { type: T } : { payload: P; type: T };

type CrossStateHandler<
  TargetState extends StateObject,
  EventPayload extends object,
> = (eventPayload: EventPayload) => TargetState;

type Handler<
  PreviousState extends StateObject,
  TargetState extends StateObject,
  EventPayload extends object,
> = (previousState: PreviousState, eventPayload: EventPayload) => TargetState;

export type TransitionFunction<
  State extends StateObject,
  Event extends EventObject,
> = (previousState: State, event: Event) => State;

type StateMachineEvents<Event extends EventObject> = {
  [E in Event['type']]: Event extends { payload: infer U; type: E }
    ? (payload: U) => Event
    : Event extends { type: E }
    ? () => Event
    : never;
};

export type StateMachine<
  State extends StateObject,
  Event extends EventObject,
  Name extends string,
> = {
  events: StateMachineEvents<Event>;
  initialState: State;
  name: Name;
  transition: TransitionFunction<State, Event>;
};

export type EventOf<SM extends StateMachine<any, any, any>> = Parameters<
  SM['transition']
>[1];

type StateHandlers<State extends StateObject> = {
  [S in State['status']]: Record<
    string,
    Handler<State & StateObject<S>, State, any>
  >;
};

type CrossStateHandlers<State extends StateObject> = {
  _crossState: Record<string, CrossStateHandler<State, any>>;
};

// picking only string keys, while there might be also symbols and numbers
type KeyOf<O extends object> = Extract<keyof O, string>;

export const createStateMachine = <
  Name extends string,
  State extends StateObject,
  HandlersTree extends
    | StateHandlers<State>
    | (CrossStateHandlers<State> & StateHandlers<State>),
  EventObjectsTree extends {
    [Key in keyof HandlersTree]: KeyOf<HandlersTree[Key]> extends never
      ? never
      : {
          [EventType in KeyOf<HandlersTree[Key]>]: EventObject<
            EventType,
            Parameters<HandlersTree[Key][EventType]>[Key extends '_crossState'
              ? 0
              : 1]
          >;
        };
  },
  Event extends EventObject = EventObjectsTree extends Record<string, infer U>
    ? U extends Record<string, infer UU>
      ? UU
      : never
    : never,
>(
  name: Name,
  initialState: State,
  handlers: HandlersTree,
): StateMachine<State, Event, Name> => {
  const transition = (previousState = initialState, event: Event) => {
    const eventHandlers = handlers[previousState.status as State['status']];
    if (eventHandlers) {
      const handler = eventHandlers[event.type];
      if (handler) {
        return handler(
          previousState,
          'payload' in event ? event.payload : undefined,
        );
      }
    }

    if ('_crossState' in handlers) {
      const crossStateEventHandlers = handlers._crossState;
      if (crossStateEventHandlers) {
        const generalHandler = crossStateEventHandlers[event.type];
        if (generalHandler) {
          return generalHandler('payload' in event ? event.payload : undefined);
        }
      }
    }

    // eslint-disable-next-line no-console
    console.error(
      `"${name}" state-machine: handler not found for status "${previousState.status}" and event "${event.type}"`,
    );
    return previousState;
  };

  const eventTypes = Object.values(handlers).flatMap(
    (eventHandlers: HandlersTree[State['status']]) =>
      Object.keys(eventHandlers),
  );

  const events: StateMachineEvents<Event> = eventTypes.reduce(
    (partialEvents, eventType) => ({
      ...partialEvents,
      [eventType]: (payload: object | undefined) => ({
        type: eventType,
        ...(payload ? { payload } : {}),
      }),
    }),
    {} as StateMachineEvents<Event>,
  );

  return {
    name,
    initialState,
    events,
    transition,
  };
};
