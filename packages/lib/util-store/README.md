# @lace-lib/util-store

## createStateMachine

The [createStateMachine](./src/create-state-machine.ts) is a util that helps you define
a hierarchical structure representing a state machine. It requires your state to be
an object with a `status` property of a string type. It works well with discriminated unions:

```typescript
type DoorClosed = {
  status: 'Closed';
  lastTimeDoorbellUsed?: Date;
  nameOfPersonWhoClosed: string;
};

type DoorOpen = {
  status: 'Open';
  lastTimeDoorbellUsed?: Date;
};

type DoorState = DoorClosed | DoorOpen;
```

The structure you define is a two-level object where the first level keys represent your
state's statuses. The second level keys are events available in a particular state.
Additionally, you can define a `_crossState` property on the first level (state level)
of the structure for events available regardless the active state.
Each of the event property is a function (event handler) with a `previousState`
and `eventPayload` params, except the `_crossState` event handlers
does not support `previosState`.

```typescript
const initialState = {
  status: 'Open',
} as DoorState;

const doorMachine = createStateMachine('door', initialState, {
  _crossState: {
    doorbellRang: (eventPayload: { time: Date }) => ({
      lastTimeDoorbellUsed: eventPayload.time,
      status: 'Open',
    }),
  },
  Open: {
    pushed: (previousState, eventPayload: { name: string }) => ({
      ...previousState,
      nameOfPersonWhoClosed: eventPayload.name,
      status: 'Closed',
    }),
  },
  Closed: {
    pulled: ({ lastTimeDoorbellUsed }) => ({
      lastTimeDoorbellUsed,
      status: 'Open',
    }),
  },
});

const doorbellRangEvent = doorMachine.events.doorbellRang({
  time: new Date(0),
});
let nextState = doorMachine.transition(initialState, doorbellRangEvent);

const pushedEvent = doorMachine.events.pushed({ name: 'Dan' });
nextState = doorMachine.transition(nextState, pushedEvent);

console.info(nextState);
// {
//   status: 'Closed',
//   lastTimeDoorbellUsed: 1970-01-01T00:00:00.000Z,
//   nameOfPersonWhoClosed: 'Dan'
// }
```
