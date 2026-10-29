import { createSlice } from '@reduxjs/toolkit';

import type { GrantRecord, GrantScopeInput } from '../grants';
import type { DeviceReader } from '../types';
import type { GrantId, TokenColor } from '../value-objects';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer'; // NOSONAR: required so immer's WritableDraft types are referenceable in emitted .d.ts files

/**
 * Lifecycle status of a Passport account's Account Custody Contract.
 * `ready` accounts have at least one activated device.
 */
export type PassportAccountStatus = 'ready';

/**
 * The account a wallet holds: the address of its Account Custody
 * Contract, the binding version it was deployed with, its status, and the
 * Midnight network id it lives on, since an account exists on one network
 * only.
 */
export type PassportAccountInfo = {
  address: string;
  bindingVersion: string;
  status: PassportAccountStatus;
  networkId: string;
};

/**
 * Progress of the current Passport operation: from idle, through the
 * passkey ceremony and on-chain deployment steps, to a ready account.
 * 'confirming' is the wait for the indexer to reflect an accepted call;
 * 'rotating' and 'reencrypting' are the encryption key rotation a read
 * grant's issue or revocation, or a device removal, performs before its
 * own call; 'recording' is the writing of the account keys for a device,
 * or of a grant's bookkeeping, to the account's inbox.
 */
export type PassportFlow =
  | 'activating'
  | 'ceremony'
  | 'confirming'
  | 'deploying'
  | 'error'
  | 'idle'
  | 'proving'
  | 'ready'
  | 'recording'
  | 'reencrypting'
  | 'rotating'
  | 'sponsoring';

export type PassportFlowError = {
  code: string;
  message: string;
};

export type PassportDevice = {
  commitmentHex: string;
  isLocal: boolean;
};

/**
 * One shielded coin the account holds, verified against chain data: the
 * token it is denominated in, its value as a decimal string, the coin
 * commitment the chain carries for it as lowercase hex, and the position
 * of that commitment in the Zswap commitment tree.
 */
export type ShieldedHolding = {
  color: TokenColor;
  value: string;
  commitment: string;
  index: number;
};

export type PassportSliceState = {
  account?: PassportAccountInfo;
  flow: PassportFlow;
  flowError?: PassportFlowError;
  devices: PassportDevice[];
  localUseCounter?: string;
  grants: GrantRecord[];
  lastIssuedGrantId?: GrantId;
  shieldedHoldings: ShieldedHolding[];
  /**
   * The account encryption public key the ledger held as `enc_key` when a
   * flow last read or rotated it, as 32-byte lowercase hex, which tells a
   * read grant's stored seal current from stale. Absent once a device or
   * grant call failed, since a rotation it ran may have landed before the
   * failure: no seal counts as current until the next sign-in or rotation
   * publishes the key again.
   */
  encKey?: string;
  /**
   * The live read grants the last grant call could not seal the account's
   * current viewing secret to, or, after a sign-in, the live read grants
   * this client issued whose kept seal does not hold that secret: their
   * grantees read nothing newer until a rotation from this client re-seals
   * them, or they are issued again. It reports that one flow only: each
   * grant call and sign-in replaces it, so it is empty after a call that
   * sealed every one even when an earlier call left grants unsealed, and
   * a failed device or grant call empties it with `encKey`.
   */
  unsealedGrantIds: GrantId[];
  /**
   * The live read grants the last grant call could not seal the account's
   * current viewing secret to because the hosted signer signed their
   * revocation, which has not landed: the signer forgets a grantee's read
   * key once it signs the revocation, so these are revoked again rather
   * than issued again. They are not listed in `unsealedGrantIds`. Each
   * grant call and sign-in replaces it, a sign-in with none, since it
   * does not ask the signer, and a failed device or grant call empties it
   * with `encKey`.
   */
  revocationPendingGrantIds: GrantId[];
  /**
   * The live device entries the last rotation sealed no new viewing key
   * to, because two reader keys claimed one of them or one reader key two:
   * those devices read nothing newer until they are enrolled again. Each
   * rotating flow replaces it.
   */
  droppedDevices: string[];
};

const initialState: PassportSliceState = {
  flow: 'idle',
  devices: [],
  grants: [],
  shieldedHoldings: [],
  unsealedGrantIds: [],
  revocationPendingGrantIds: [],
  droppedDevices: [],
};

/** What `passportActions.createAccount` carries: whether to lock the account. */
export type CreateAccountPayload = { lockAccount: boolean };
/** The device a device action acts on, by its commitment. */
export type DevicePayload = { commitmentHex: string };
/** What `passportActions.addDevice` carries: the device and its optional reader. */
export type AddDevicePayload = DevicePayload & { reader?: DeviceReader };
/** What `passportActions.revokeGrant` carries: the grant to revoke. */
export type RevokeGrantPayload = { grantId: GrantId };
/** What `passportActions.installOperations` carries: the operations to install. */
export type InstallOperationsPayload = { operations: string[] };

const slice = createSlice({
  name: 'passport',
  initialState,
  reducers: {
    /**
     * Requests deployment of a new Account Custody Contract and the
     * activation of its first device. `lockAccount` decides whether the
     * contract's maintenance authority is retired once activation
     * completes; the side effect that drives the ceremony reads it from
     * the action rather than from state.
     *
     * A pure trigger: passport flows are mutually exclusive and only the
     * side effect knows whether a request is accepted or dropped, so it
     * owns every transition, down to entering 'ceremony'. A dropped
     * request must leave the running flow's state alone.
     */
    createAccount: (_state, _action: PayloadAction<CreateAccountPayload>) => {},

    /**
     * Requests that an existing account be recognised on this device. A
     * pure trigger, for the same reason as {@link createAccount}.
     */
    signIn: () => {},

    /**
     * Requests enrolment of a device by its entry commitment and, when
     * `reader` names the joining device's reader and device keys, the
     * delivery of the account keys to it. A pure trigger, for the same
     * reason as {@link createAccount}: the roster only changes via
     * setDevices once the on-chain add_device call is confirmed, so a
     * failed enrolment never leaves state diverged from the chain.
     */
    addDevice: (_state, _action: PayloadAction<AddDevicePayload>) => {},

    /**
     * Requests revocation of a device by its commitment. A pure trigger,
     * for the same reason as {@link createAccount}: the roster only
     * changes via setDevices once the on-chain remove_device call is
     * confirmed, so a rejected removal (see LastDeviceError) never leaves
     * state diverged from the chain.
     */
    removeDevice: (_state, _action: PayloadAction<DevicePayload>) => {},

    /**
     * Requests issuance of a scoped grant. A pure trigger, for the same
     * reason as {@link createAccount}: the roster only changes via
     * setGrants once the on-chain issue call is confirmed, and
     * lastIssuedGrantId only via setLastIssuedGrantId.
     */
    issueGrant: (_state, _action: PayloadAction<GrantScopeInput>) => {},

    /**
     * Requests revocation of one grant by its identifier. A pure trigger,
     * for the same reason as {@link issueGrant}.
     */
    revokeGrant: (_state, _action: PayloadAction<RevokeGrantPayload>) => {},

    /**
     * Requests revocation of every grant the account has issued. A pure
     * trigger, for the same reason as {@link issueGrant}.
     */
    revokeAllGrants: () => {},

    /**
     * Requests the account's shielded holdings, read from its inbox with
     * the encryption secret and verified against chain data. A pure
     * trigger, for the same reason as {@link createAccount}: the holdings
     * only change via setShieldedHoldings once the walk completes.
     */
    readShieldedHoldings: () => {},

    /**
     * Requests the install of verifier keys for operations of the deployed
     * roster the account lacks, signed by its maintenance authority. A
     * pure trigger, for the same reason as {@link createAccount}: nothing
     * in state changes once the install lands.
     */
    installOperations: (
      _state,
      _action: PayloadAction<InstallOperationsPayload>,
    ) => {},

    setFlow: (state, { payload }: PayloadAction<PassportFlow>) => {
      state.flow = payload;
      if (payload !== 'error') state.flowError = undefined;
    },

    setFlowError: (state, { payload }: PayloadAction<PassportFlowError>) => {
      state.flow = 'error';
      state.flowError = payload;
    },

    setAccount: (state, { payload }: PayloadAction<PassportAccountInfo>) => {
      state.account = payload;
    },

    setDevices: (state, { payload }: PayloadAction<PassportDevice[]>) => {
      state.devices = payload;
    },

    setGrants: (state, { payload }: PayloadAction<GrantRecord[]>) => {
      state.grants = payload;
    },

    setLastIssuedGrantId: (state, { payload }: PayloadAction<GrantId>) => {
      state.lastIssuedGrantId = payload;
    },

    setLocalUseCounter: (state, { payload }: PayloadAction<string>) => {
      state.localUseCounter = payload;
    },

    setShieldedHoldings: (
      state,
      { payload }: PayloadAction<ShieldedHolding[]>,
    ) => {
      state.shieldedHoldings = payload;
    },

    setEncKey: (state, { payload }: PayloadAction<string>) => {
      state.encKey = payload;
    },

    /**
     * Forgets the `enc_key` state holds, for a failed flow that may have
     * rotated it before failing.
     */
    clearEncKey: state => {
      state.encKey = undefined;
    },

    setUnsealedGrantIds: (state, { payload }: PayloadAction<GrantId[]>) => {
      state.unsealedGrantIds = payload;
    },

    setRevocationPendingGrantIds: (
      state,
      { payload }: PayloadAction<GrantId[]>,
    ) => {
      state.revocationPendingGrantIds = payload;
    },

    setDroppedDevices: (state, { payload }: PayloadAction<string[]>) => {
      state.droppedDevices = payload;
    },

    reset: () => initialState,
  },
  selectors: {
    selectAccount: ({ account }) => account,
    selectFlow: ({ flow }) => flow,
    selectFlowError: ({ flowError }) => flowError,
    selectDevices: ({ devices }) => devices,
    selectLocalUseCounter: ({ localUseCounter }) => localUseCounter,
    selectGrants: ({ grants }) => grants,
    selectGrantById: ({ grants }, grantId: GrantId) =>
      grants.find(({ id }) => id === grantId),
    selectLastIssuedGrantId: ({ lastIssuedGrantId }) => lastIssuedGrantId,
    selectShieldedHoldings: ({ shieldedHoldings }) => shieldedHoldings,
    selectEncKey: ({ encKey }) => encKey,
    selectUnsealedGrantIds: ({ unsealedGrantIds }) => unsealedGrantIds,
    selectRevocationPendingGrantIds: ({ revocationPendingGrantIds }) =>
      revocationPendingGrantIds,
    selectDroppedDevices: ({ droppedDevices }) => droppedDevices,
  },
});

export const passportReducers = {
  [slice.name]: slice.reducer,
};

export const passportActions = {
  passport: slice.actions,
};

export const passportSelectors = {
  passport: slice.selectors,
};

export type PassportStoreState = StateFromReducersMapObject<
  typeof passportReducers
>;
