import { NoAccountError } from '@lace-contract/passport';
import { concat, exhaustMap, map, merge, of, withLatestFrom } from 'rxjs';

import { flowActions, toFlowError } from './flow-actions';

import type { CreateAccountInput } from '../../flows/create-account';
import type { DeviceRoster } from '../../flows/devices';
import type { GrantRoster, IssuedGrant } from '../../flows/grants';
import type { ShieldedHoldings } from '../../flows/holdings';
import type { InstalledOperations } from '../../flows/install-operations';
import type { RecognisedAccount } from '../../flows/sign-in';
import type { AccountCallInput, FlowAccountState } from '../../flows/types';
import type { FlowEvent } from '../dependencies';
import type {
  DeviceReader,
  GrantId,
  GrantScopeInput,
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
/** Flow error codes for grant call failures that carry no typed code of their own. */
const ISSUE_GRANT_FALLBACK_ERROR_CODE = 'grant-issue-failed';
const REVOKE_GRANT_FALLBACK_ERROR_CODE = 'grant-revoke-failed';
const REVOKE_ALL_GRANTS_FALLBACK_ERROR_CODE = 'grant-revoke-all-failed';
/** Flow error code for holdings reads that carry no typed code of their own. */
const READ_HOLDINGS_FALLBACK_ERROR_CODE = 'holdings-read-failed';
/** Flow error code for installs that carry no typed code of their own. */
const INSTALL_OPERATIONS_FALLBACK_ERROR_CODE = 'operations-install-failed';

/**
 * Flows an account call may start from. 'error' is a settled state, not
 * an operation in progress, so a call that failed can be retried without
 * a fresh sign-in ceremony; every other non-ready flow is an operation
 * left unfinished, whose account and use counter cannot be trusted yet.
 */
const SETTLED_FLOWS: readonly PassportFlow[] = ['error', 'ready'];

type FlowDependencies = Parameters<SideEffect>[2];
type FlowStateObservables = Parameters<SideEffect>[1];
type StoreActions = FlowDependencies['actions'];
type SideEffectAction = ReturnType<SideEffect> extends Observable<infer A>
  ? A
  : never;

/** A flow held back until the shared gate starts it. */
type FlowStart = () => Observable<SideEffectAction>;

/** The payloads the device and grant triggers carry. */
type DevicePayload = { commitmentHex: string };
type AddDevicePayload = DevicePayload & { reader?: DeviceReader };
type RevokeGrantPayload = { grantId: GrantId };
type InstallOperationsPayload = { operations: string[] };

/**
 * A gated call over the account in state: how its flow is started from
 * the trigger's payload and the sampled account, what it publishes when
 * it settles, and the error code it reports without a typed one.
 */
type AccountCallConfig<Payload, Result> = {
  /** The flow events behind the call. */
  start: (
    payload: Payload,
    input: AccountCallInput,
    dependencies: FlowDependencies,
  ) => Observable<FlowEvent<Result>>;
  /** The actions that publish the call's result, emitted before 'ready'. */
  onDone: (actions: StoreActions) => (result: Result) => SideEffectAction[];
  /** Flow error code when the failure carries no typed code. */
  fallbackCode: string;
  /**
   * The actions that undo what state may wrongly claim after the call
   * failed.
   */
  onFailed?: (actions: StoreActions) => SideEffectAction[];
};

/**
 * An account call as dispatched: the trigger's payload and the state it
 * was dispatched over, as the call reads it.
 */
type SampledAccountCall<Payload> = {
  payload: Payload;
  flow: PassportFlow;
  account: PassportAccountInfo | undefined;
  devices: PassportDevice[];
  localUseCounter: string | undefined;
};

type AccountCallStartsProps<Payload, Result> = {
  config: AccountCallConfig<Payload, Result>;
  trigger$: Observable<{ payload: Payload }>;
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

/**
 * The actions that publish what a grant call left behind: the device
 * roster and counter it advanced, the `enc_key` a rotation it ran stepped
 * the encryption key to and the devices it left without the new key, the
 * grant roster, then the read grants the
 * call could not seal the viewing secret to, empty when it sealed all,
 * and those the signer refused because their revocation is pending.
 */
const publishGrantRoster =
  (actions: StoreActions) =>
  ({
    grants,
    encKey,
    unsealedGrantIds,
    revocationPendingGrantIds,
    droppedDevices,
    ...roster
  }: GrantRoster): SideEffectAction[] =>
    [
      ...publishDeviceRoster(actions)(roster),
      ...(encKey === undefined ? [] : [actions.passport.setEncKey(encKey)]),
      ...(droppedDevices === undefined
        ? []
        : [actions.passport.setDroppedDevices(droppedDevices)]),
      actions.passport.setGrants(grants),
      actions.passport.setUnsealedGrantIds(unsealedGrantIds),
      actions.passport.setRevocationPendingGrantIds(revocationPendingGrantIds),
    ];

/**
 * The actions that publish an issued grant: the rosters, then the id of
 * the grant, last so a consumer reacting to it finds the record in state.
 */
const publishIssuedGrant =
  (actions: StoreActions) =>
  ({ grantId, ...roster }: IssuedGrant): SideEffectAction[] =>
    [
      ...publishGrantRoster(actions)(roster),
      actions.passport.setLastIssuedGrantId(grantId),
    ];

/**
 * The actions that publish an account a flow left ready: the account,
 * its device roster and counter, the `enc_key` its encryption key is
 * at, then its grant roster.
 */
const publishAccountState =
  (actions: StoreActions) =>
  ({
    account,
    grants,
    encKey,
    ...roster
  }: FlowAccountState): SideEffectAction[] =>
    [
      actions.passport.setAccount(account),
      ...publishDeviceRoster(actions)(roster),
      actions.passport.setEncKey(encKey),
      actions.passport.setGrants(grants),
    ];

/**
 * The actions that publish an account a sign-in recognised: the account
 * state, see {@link publishAccountState}, then the read grants whose kept
 * seal does not hold the live viewing secret, and no grants pending a
 * revocation, which only a grant call learns from the signer.
 */
const publishRecognisedAccount =
  (actions: StoreActions) =>
  ({ unsealedGrantIds, ...state }: RecognisedAccount): SideEffectAction[] =>
    [
      ...publishAccountState(actions)(state),
      actions.passport.setUnsealedGrantIds(unsealedGrantIds),
      actions.passport.setRevocationPendingGrantIds([]),
    ];

/**
 * A device or grant call may rotate the account keys before it fails, so
 * the `enc_key` state holds may be the one rotated away: it is forgotten
 * until the next sign-in or rotation publishes it again, rather than let
 * a stale seal pass as current. The read grants an earlier call reported
 * unsealed or pending revocation were judged against that key, so they
 * are emptied with it.
 */
const forgetKeyState = (actions: StoreActions): SideEffectAction[] => [
  actions.passport.clearEncKey(),
  actions.passport.setUnsealedGrantIds([]),
  actions.passport.setRevocationPendingGrantIds([]),
];

/**
 * The createAccount flow behind the createAccount action, as the actions it
 * publishes: each reported stage as setFlow, then the created account, its
 * one-device roster, this device's counter and its empty grant roster,
 * then 'ready'. The flow itself persists the account record before it
 * resolves, so the account is never published ahead of the record that
 * recognises it.
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
 * the recognised account, its whole device roster, this device's healed
 * use counter, the grant roster and its unsealed read grants, then
 * 'ready'. The flow itself persists the healed counter before it
 * resolves, so the record is never left behind the state it publishes.
 */
const runSignIn = (
  dependencies: FlowDependencies,
): Observable<SideEffectAction> => {
  const { actions, passportFlows } = dependencies;
  return flowActions(passportFlows.signIn(dependencies), {
    actions,
    fallbackCode: SIGN_IN_FALLBACK_ERROR_CODE,
    onDone: publishRecognisedAccount(actions),
  });
};

/**
 * The actions that publish what a device call left behind: its roster and
 * counter, then, when it rotated the account keys, the `enc_key` it
 * stepped to and the devices it left without the new key.
 */
const publishDeviceCall =
  (actions: StoreActions) =>
  ({ encKey, droppedDevices, ...roster }: DeviceRoster): SideEffectAction[] =>
    [
      ...publishDeviceRoster(actions)(roster),
      ...(encKey === undefined ? [] : [actions.passport.setEncKey(encKey)]),
      ...(droppedDevices === undefined
        ? []
        : [actions.passport.setDroppedDevices(droppedDevices)]),
    ];

/**
 * The addDevice flow behind its action: what the call left behind, see
 * {@link publishDeviceCall}, then 'ready'. The joining device's keys
 * travel with the request when the action names them.
 */
const addDeviceCall: AccountCallConfig<AddDevicePayload, DeviceRoster> = {
  start: ({ commitmentHex, reader }, input, dependencies) =>
    dependencies.passportFlows.addDevice(
      { commitmentHex, ...(reader ? { reader } : {}), ...input },
      dependencies,
    ),
  onDone: publishDeviceCall,
  fallbackCode: ADD_DEVICE_FALLBACK_ERROR_CODE,
  onFailed: forgetKeyState,
};

/**
 * The removeDevice flow behind its action: what the call left behind, see
 * {@link publishDeviceCall}, then 'ready'.
 */
const removeDeviceCall: AccountCallConfig<DevicePayload, DeviceRoster> = {
  start: ({ commitmentHex }, input, dependencies) =>
    dependencies.passportFlows.removeDevice(
      { commitmentHex, ...input },
      dependencies,
    ),
  onDone: publishDeviceCall,
  fallbackCode: REMOVE_DEVICE_FALLBACK_ERROR_CODE,
  onFailed: forgetKeyState,
};

/**
 * The issueGrant flow behind its action: the rosters the call left
 * behind and the issued grant's id, then 'ready'.
 */
const issueGrantCall: AccountCallConfig<GrantScopeInput, IssuedGrant> = {
  start: (scope, input, dependencies) =>
    dependencies.passportFlows.issueGrant({ scope, ...input }, dependencies),
  onDone: publishIssuedGrant,
  fallbackCode: ISSUE_GRANT_FALLBACK_ERROR_CODE,
  onFailed: forgetKeyState,
};

/** The revokeGrant flow behind its action: the rosters it left behind, then 'ready'. */
const revokeGrantCall: AccountCallConfig<RevokeGrantPayload, GrantRoster> = {
  start: ({ grantId }, input, dependencies) =>
    dependencies.passportFlows.revokeGrant({ grantId, ...input }, dependencies),
  onDone: publishGrantRoster,
  fallbackCode: REVOKE_GRANT_FALLBACK_ERROR_CODE,
  onFailed: forgetKeyState,
};

/** The revokeAllGrants flow behind its action: the rosters it left behind, then 'ready'. */
const revokeAllGrantsCall: AccountCallConfig<undefined, GrantRoster> = {
  start: (_payload, input, dependencies) =>
    dependencies.passportFlows.revokeAllGrants(input, dependencies),
  onDone: publishGrantRoster,
  fallbackCode: REVOKE_ALL_GRANTS_FALLBACK_ERROR_CODE,
  onFailed: forgetKeyState,
};

/**
 * The readShieldedHoldings flow behind its action: the holdings the walk
 * verified, then 'ready'. The skip count is the flow's to report, not the
 * store's to keep: a skipped entry is noise the inbox will carry forever.
 */
const readShieldedHoldingsCall: AccountCallConfig<undefined, ShieldedHoldings> =
  {
    start: (_payload, input, dependencies) =>
      dependencies.passportFlows.readShieldedHoldings(input, dependencies),
    onDone:
      actions =>
      ({ holdings }) =>
        [actions.passport.setShieldedHoldings(holdings)],
    fallbackCode: READ_HOLDINGS_FALLBACK_ERROR_CODE,
  };

/**
 * The installOperations flow behind its action, then 'ready'. A landed
 * install changes nothing state holds, so it publishes nothing of its
 * own.
 */
const installOperationsCall: AccountCallConfig<
  InstallOperationsPayload,
  InstalledOperations
> = {
  start: ({ operations }, { account }, dependencies) =>
    dependencies.passportFlows.installOperations(
      { account, operations },
      dependencies,
    ),
  onDone: () => () => [],
  fallbackCode: INSTALL_OPERATIONS_FALLBACK_ERROR_CODE,
};

/**
 * An account call behind its action, as the actions it publishes: what
 * the call left behind, then 'ready', or, when it fails, the actions
 * undoing what state may wrongly claim, then the error. The flow itself
 * persists the counter before it resolves.
 *
 * Requires an account and a settled flow: with no account in state, or
 * with an operation left unfinished, the flow is never called (so the
 * chain and the key session are never touched) and the call settles in
 * 'error' with 'no-account'. The refusal still runs behind the gate, so
 * it enters 'ceremony' first like any accepted request and clears the
 * error a previous flow left behind.
 */
const runAccountCall = <Payload, Result>(
  { start, onDone, fallbackCode, onFailed }: AccountCallConfig<Payload, Result>,
  {
    payload,
    flow,
    account,
    devices,
    localUseCounter,
  }: SampledAccountCall<Payload>,
  dependencies: FlowDependencies,
): Observable<SideEffectAction> => {
  const { actions } = dependencies;
  if (!account || !SETTLED_FLOWS.includes(flow)) {
    return of(
      actions.passport.setFlowError(
        toFlowError(new NoAccountError(), fallbackCode),
      ),
    );
  }
  return flowActions(
    start(payload, { account, devices, localUseCounter }, dependencies),
    {
      actions,
      fallbackCode,
      onDone: onDone(actions),
      ...(onFailed ? { onFailed: onFailed(actions) } : {}),
    },
  );
};

/**
 * One start per dispatched account call action, each carrying the state
 * the call needs. State is sampled when the action arrives rather than
 * when the shared gate starts the call, so a call reads the account,
 * roster and counter the user acted on.
 */
const accountCallStarts = <Payload, Result>({
  config,
  trigger$,
  stateObservables: {
    passport: {
      selectAccount$,
      selectDevices$,
      selectFlow$,
      selectLocalUseCounter$,
    },
  },
  dependencies,
}: AccountCallStartsProps<Payload, Result>): Observable<FlowStart> =>
  trigger$.pipe(
    withLatestFrom(
      selectFlow$,
      selectAccount$,
      selectDevices$,
      selectLocalUseCounter$,
    ),
    map(
      ([{ payload }, flow, account, devices, localUseCounter]) =>
        () =>
          runAccountCall(
            config,
            { payload, flow, account, devices, localUseCounter },
            dependencies,
          ),
    ),
  );

/**
 * Runs whichever passport flow was requested: {@link runCreateAccount}
 * behind the createAccount action, {@link runSignIn} behind signIn, and
 * {@link runAccountCall} behind addDevice, removeDevice, issueGrant,
 * revokeGrant, revokeAllGrants, readShieldedHoldings and
 * installOperations.
 *
 * Every flow owns the same account record, the same device key and the
 * same flow state, and each chain call resolves the account's use counter
 * and auth nonce, so they must never overlap: two calls resolving the same
 * counter both spend the same entry, one transaction is rejected, and the
 * loser reports its own failure over state the winner already moved on.
 * A holdings read spends no entry, but it opens the same key session and
 * reports through the same flow state, so it runs behind the same gate.
 * One exhaustMap over the merged starts, rather than one per action,
 * makes them mutually exclusive: a dispatch arriving while any flow is in
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
  {
    passport: {
      addDevice$,
      createAccount$,
      installOperations$,
      issueGrant$,
      readShieldedHoldings$,
      removeDevice$,
      revokeAllGrants$,
      revokeGrant$,
      signIn$,
    },
  },
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
    accountCallStarts({
      config: addDeviceCall,
      trigger$: addDevice$,
      stateObservables,
      dependencies,
    }),
    accountCallStarts({
      config: removeDeviceCall,
      trigger$: removeDevice$,
      stateObservables,
      dependencies,
    }),
    accountCallStarts({
      config: issueGrantCall,
      trigger$: issueGrant$,
      stateObservables,
      dependencies,
    }),
    accountCallStarts({
      config: revokeGrantCall,
      trigger$: revokeGrant$,
      stateObservables,
      dependencies,
    }),
    accountCallStarts({
      config: revokeAllGrantsCall,
      trigger$: revokeAllGrants$,
      stateObservables,
      dependencies,
    }),
    accountCallStarts({
      config: readShieldedHoldingsCall,
      trigger$: readShieldedHoldings$,
      stateObservables,
      dependencies,
    }),
    accountCallStarts({
      config: installOperationsCall,
      trigger$: installOperations$,
      stateObservables,
      dependencies,
    }),
  ).pipe(
    exhaustMap(start =>
      concat(of(dependencies.actions.passport.setFlow('ceremony')), start()),
    ),
  );
