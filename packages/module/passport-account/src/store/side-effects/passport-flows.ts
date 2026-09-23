import { NoAccountError } from '@lace-contract/passport';
import { concat, exhaustMap, map, merge, of, withLatestFrom } from 'rxjs';

import { flowActions, toFlowError } from './flow-actions';

import type { CreateAccountInput } from '../../flows/create-account';
import type { DeviceCallInput, DeviceRoster } from '../../flows/devices';
import type { FlowAccountState } from '../../flows/types';
import type {
  PassportAccountInfo,
  PassportDevice,
  PassportFlow,
  SideEffect,
} from '@lace-contract/passport';
import type { Observable } from 'rxjs';

/** Flow error code for creation failures that carry no typed code of their own. */
const CREATE_ACCOUNT_FALLBACK_ERROR_CODE = 'account-create-failed';
/** Flow error code for sign-in failures that carry no typed code of their own. */
const SIGN_IN_FALLBACK_ERROR_CODE = 'account-sign-in-failed';
/** Flow error codes for device call failures that carry no typed code of their own. */
const ADD_DEVICE_FALLBACK_ERROR_CODE = 'device-add-failed';
const REMOVE_DEVICE_FALLBACK_ERROR_CODE = 'device-remove-failed';

/**
 * Flows a device call may start from. 'error' is a settled state, not an
 * operation in progress, so a call that failed can be retried without a
 * fresh sign-in ceremony; every other non-ready flow is an operation left
 * unfinished, whose account and use counter cannot be trusted yet.
 */
const SETTLED_FLOWS: readonly PassportFlow[] = ['error', 'ready'];

type FlowDependencies = Parameters<SideEffect>[2];
type FlowStateObservables = Parameters<SideEffect>[1];
type StoreActions = FlowDependencies['actions'];
type SideEffectAction = ReturnType<SideEffect> extends Observable<infer A>
  ? A
  : never;

/** Either device action stream, read for its target commitment only. */
type DeviceActionObservable = Observable<{
  payload: { commitmentHex: string };
}>;

/** A flow held back until the shared gate starts it. */
type FlowStart = () => Observable<SideEffectAction>;

type DeviceCallConfig = {
  /** The device flow the call runs through. */
  flow: 'addDevice' | 'removeDevice';
  /** Flow error code when the failure carries no typed code. */
  fallbackCode: string;
};

/** The state a device action was dispatched over, as the call reads it. */
type SampledDeviceCall = {
  commitmentHex: string;
  flow: PassportFlow;
  account: PassportAccountInfo | undefined;
  devices: PassportDevice[];
  localUseCounter: string | undefined;
};

type DeviceCallStartsProps = {
  config: DeviceCallConfig;
  device$: DeviceActionObservable;
  stateObservables: FlowStateObservables;
  dependencies: FlowDependencies;
};

/**
 * The actions that publish a roster a flow left behind: the devices, then
 * the counter the local row sits at. Both land ahead of 'ready', in the
 * order the flows have always published them.
 */
const publishDeviceRoster =
  (actions: StoreActions) =>
  ({ devices, localUseCounter }: DeviceRoster): SideEffectAction[] =>
    [
      actions.passport.setDevices(devices),
      actions.passport.setLocalUseCounter(localUseCounter),
    ];

/** The actions that publish an account a flow left ready: the account, then its roster. */
const publishAccountState =
  (actions: StoreActions) =>
  ({ account, ...roster }: FlowAccountState): SideEffectAction[] =>
    [
      actions.passport.setAccount(account),
      ...publishDeviceRoster(actions)(roster),
    ];

/**
 * The createAccount flow behind the createAccount action, as the actions it
 * publishes: each reported stage as setFlow, then the created account, its
 * one-device roster and this device's counter, then 'ready'. The flow
 * itself persists the account record before it resolves, so the account
 * is never published ahead of the record that recognises it.
 */
const runCreateAccount = (
  input: CreateAccountInput,
  dependencies: FlowDependencies,
): Observable<SideEffectAction> => {
  const { actions, passportFlows } = dependencies;
  return flowActions(passportFlows.createAccount(input, dependencies), {
    actions,
    fallbackCode: CREATE_ACCOUNT_FALLBACK_ERROR_CODE,
    onDone: publishAccountState(actions),
  });
};

/**
 * The signIn flow behind the signIn action, as the actions it publishes:
 * the recognised account, its whole device roster and this device's
 * healed use counter, then 'ready'. The flow itself persists the healed
 * counter before it resolves, so the record is never left behind the
 * state it publishes.
 */
const runSignIn = (
  dependencies: FlowDependencies,
): Observable<SideEffectAction> => {
  const { actions, passportFlows } = dependencies;
  return flowActions(passportFlows.signIn(dependencies), {
    actions,
    fallbackCode: SIGN_IN_FALLBACK_ERROR_CODE,
    onDone: publishAccountState(actions),
  });
};

/**
 * A device flow behind its action, as the actions it publishes: the
 * roster the call left behind and this device's advanced counter, then
 * 'ready'. The flow itself persists the counter before it resolves.
 *
 * Requires an account and a settled flow: with no account in state, or
 * with an operation left unfinished, the flow is never called (so the
 * chain and the key session are never touched) and the call settles in
 * 'error' with 'no-account'. The refusal still runs behind the gate, so
 * it enters 'ceremony' first like any accepted request and clears the
 * error a previous flow left behind.
 */
const runDeviceCall = (
  { flow: deviceFlow, fallbackCode }: DeviceCallConfig,
  { commitmentHex, flow, account, devices, localUseCounter }: SampledDeviceCall,
  dependencies: FlowDependencies,
): Observable<SideEffectAction> => {
  const { actions, passportFlows } = dependencies;
  if (!account || !SETTLED_FLOWS.includes(flow)) {
    return of(
      actions.passport.setFlowError(
        toFlowError(new NoAccountError(), fallbackCode),
      ),
    );
  }
  const input: DeviceCallInput = {
    commitmentHex,
    account,
    devices,
    localUseCounter,
  };
  return flowActions(passportFlows[deviceFlow](input, dependencies), {
    actions,
    fallbackCode,
    onDone: publishDeviceRoster(actions),
  });
};

/**
 * One start per dispatched device action, each carrying the state the
 * call needs. State is sampled when the action arrives rather than when
 * the shared gate starts the call, so a call reads the account, roster
 * and counter the user acted on.
 */
const deviceCallStarts = ({
  config,
  device$,
  stateObservables: {
    passport: {
      selectAccount$,
      selectDevices$,
      selectFlow$,
      selectLocalUseCounter$,
    },
  },
  dependencies,
}: DeviceCallStartsProps): Observable<FlowStart> =>
  device$.pipe(
    withLatestFrom(
      selectFlow$,
      selectAccount$,
      selectDevices$,
      selectLocalUseCounter$,
    ),
    map(
      ([{ payload }, flow, account, devices, localUseCounter]) =>
        () =>
          runDeviceCall(
            config,
            {
              commitmentHex: payload.commitmentHex,
              flow,
              account,
              devices,
              localUseCounter,
            },
            dependencies,
          ),
    ),
  );

/**
 * Runs whichever passport flow was requested: {@link runCreateAccount}
 * behind the createAccount action, {@link runSignIn} behind signIn, and
 * {@link runDeviceCall} behind addDevice and removeDevice.
 *
 * All four flows own the same account record, the same device key and the
 * same flow state, and each resolves the account's use counter and auth
 * nonce, so they must never overlap: two calls resolving the same counter
 * both spend the same entry, one transaction is rejected, and the loser
 * reports its own failure over state the winner already moved on. One
 * exhaustMap over the merged starts, rather than one per action, makes
 * them mutually exclusive: a dispatch arriving while any flow is in
 * flight emits nothing at all, and the next one is only accepted once the
 * running flow settles. Dropping it silently is the stance exhaustMap
 * already took for a repeated dispatch of one action; a flow the user
 * never saw start is not a failure to report.
 *
 * Because only the gate knows which requests it accepted, it also owns
 * the entry into 'ceremony': the trigger reducers are pure, so a dropped
 * request cannot overwrite the running flow's state, and setFlow clears
 * the error a previous flow left behind. The emission is synchronous on
 * the accepted start, so a consumer sees the ceremony within the same
 * dispatch cycle as the trigger.
 *
 * The flow state cannot carry this guard the other way round: state
 * reaches a side effect before the action does, and an inner flow is
 * still subscribed while its own terminal setFlow('ready') is delivered,
 * so a reducer reading the flow back cannot tell a request the gate will
 * accept from one it will drop.
 */
export const runPassportFlow: SideEffect = (
  { passport: { addDevice$, createAccount$, removeDevice$, signIn$ } },
  stateObservables,
  dependencies,
) =>
  merge(
    createAccount$.pipe(
      map(
        ({ payload }) =>
          () =>
            runCreateAccount(payload, dependencies),
      ),
    ),
    signIn$.pipe(map(() => () => runSignIn(dependencies))),
    deviceCallStarts({
      config: {
        flow: 'addDevice',
        fallbackCode: ADD_DEVICE_FALLBACK_ERROR_CODE,
      },
      device$: addDevice$,
      stateObservables,
      dependencies,
    }),
    deviceCallStarts({
      config: {
        flow: 'removeDevice',
        fallbackCode: REMOVE_DEVICE_FALLBACK_ERROR_CODE,
      },
      device$: removeDevice$,
      stateObservables,
      dependencies,
    }),
  ).pipe(
    exhaustMap(start =>
      concat(of(dependencies.actions.passport.setFlow('ceremony')), start()),
    ),
  );
