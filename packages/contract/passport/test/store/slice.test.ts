import { describe, expect, it } from 'vitest';

import { passportActions as actions } from '../../src/index';
import { passportReducers, passportSelectors } from '../../src/store/slice';
import { GrantId, GrantSlot, TokenColor } from '../../src/value-objects';

import type { GrantRecord, GrantScopeInput } from '../../src/grants';
import type {
  PassportAccountInfo,
  PassportDevice,
  PassportSliceState,
} from '../../src/store/slice';
import type { State } from '@lace-contract/module';

const initialState: PassportSliceState = {
  flow: 'idle',
  devices: [],
  grants: [],
  shieldedHoldings: [],
  unsealedGrantIds: [],
  revocationPendingGrantIds: [],
  droppedDevices: [],
};

const holding = {
  color: TokenColor('ab'.repeat(32)),
  value: '5',
  commitment: 'cd'.repeat(32),
  index: 7,
};

const grantScopeInput: GrantScopeInput = {
  grantee: { scheme: 'jubjub-schnorr', publicKey: 'ab'.repeat(32) },
  operations: ['withdraw-unshielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '1000',
  perCallCap: '100',
  cap: '500',
  expiresAt: null,
};

const grantRecord = (id: string, slot: number): GrantRecord => ({
  id: GrantId(id.repeat(32)),
  slot: GrantSlot(slot),
  active: true,
  epoch: 0,
  generation: 0,
  issuedAt: 1_800_000_000,
  scope: {
    operations: ['withdraw-unshielded'],
    read: false,
    objectCommit: '00'.repeat(32),
    perCallCap: '100',
    cap: '500',
    expiresAt: null,
    rpCommit: '00'.repeat(32),
    readPkHash: '00'.repeat(32),
    window: null,
    callerCommit: '00'.repeat(32),
  },
  spentWindow: { start: 0, spent: '0' },
});

const firstGrant = grantRecord('aa', 0);
const secondGrant = grantRecord('bb', 1);

const account: PassportAccountInfo = {
  address: 'acc1address',
  bindingVersion: '1',
  status: 'ready',
  networkId: 'undeployed',
};

const failedState: PassportSliceState = {
  ...initialState,
  flow: 'error',
  flowError: { code: 'device-add-failed', message: 'node unreachable' },
};

describe('passport slice', () => {
  describe('reducers', () => {
    describe.each([
      [
        'createAccount',
        () => actions.passport.createAccount({ lockAccount: true }),
      ],
      ['signIn', () => actions.passport.signIn()],
      ['addDevice', () => actions.passport.addDevice({ commitmentHex: 'def' })],
      [
        'addDevice with the joining device keys',
        () =>
          actions.passport.addDevice({
            commitmentHex: 'def',
            reader: {
              readerPublicKey: '11'.repeat(32),
              devicePublicKey: '22'.repeat(32),
            },
          }),
      ],
      [
        'removeDevice',
        () => actions.passport.removeDevice({ commitmentHex: 'abc' }),
      ],
      ['issueGrant', () => actions.passport.issueGrant(grantScopeInput)],
      [
        'revokeGrant',
        () => actions.passport.revokeGrant({ grantId: firstGrant.id }),
      ],
      ['revokeAllGrants', () => actions.passport.revokeAllGrants()],
      ['readShieldedHoldings', () => actions.passport.readShieldedHoldings()],
      [
        'installOperations',
        () =>
          actions.passport.installOperations({
            operations: ['withdraw_unshielded_with_grant_k256'],
          }),
      ],
    ] as const)('%s', (_name, trigger) => {
      const populated: PassportSliceState = {
        ...initialState,
        flow: 'ready',
        devices: [
          { commitmentHex: 'abc', isLocal: true },
          { commitmentHex: 'def', isLocal: false },
        ],
        grants: [firstGrant],
        lastIssuedGrantId: firstGrant.id,
        shieldedHoldings: [holding],
      };

      it('leaves the flow, the roster and the counter to the side effect', () => {
        expect(passportReducers.passport(populated, trigger())).toEqual(
          populated,
        );
      });

      it('keeps the error a previous flow left behind, until the flow gate accepts the request', () => {
        expect(passportReducers.passport(failedState, trigger())).toEqual(
          failedState,
        );
      });
    });

    describe('setFlow', () => {
      it('sets the flow to the given value', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setFlow('proving'),
        );
        expect(state.flow).toBe('proving');
      });

      it('clears the error when the target flow is not error', () => {
        const state = passportReducers.passport(
          failedState,
          actions.passport.setFlow('ready'),
        );
        expect(state.flow).toBe('ready');
        expect(state.flowError).toBeUndefined();
      });

      it('keeps the error when the target flow is error', () => {
        const state = passportReducers.passport(
          failedState,
          actions.passport.setFlow('error'),
        );
        expect(state.flowError).toEqual(failedState.flowError);
      });
    });

    describe('setFlowError', () => {
      it('sets flow to error and records the error', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setFlowError({
            code: 'not-authorised',
            message: 'the account rejected the authorisation',
          }),
        );
        expect(state.flow).toBe('error');
        expect(state.flowError).toEqual({
          code: 'not-authorised',
          message: 'the account rejected the authorisation',
        });
      });
    });

    describe('setAccount', () => {
      it('sets the account', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setAccount(account),
        );
        expect(state.account).toEqual(account);
      });
    });

    describe('setDevices', () => {
      it('replaces the whole device set', () => {
        const withDevice: PassportSliceState = {
          ...initialState,
          devices: [{ commitmentHex: 'abc', isLocal: true }],
        };

        const nextDevices: PassportDevice[] = [
          { commitmentHex: 'def', isLocal: false },
          { commitmentHex: 'ghi', isLocal: false },
        ];

        const state = passportReducers.passport(
          withDevice,
          actions.passport.setDevices(nextDevices),
        );
        expect(state.devices).toEqual(nextDevices);
      });
    });

    describe('setGrants', () => {
      it('replaces the whole grant roster', () => {
        const withGrant: PassportSliceState = {
          ...initialState,
          grants: [firstGrant],
        };

        const state = passportReducers.passport(
          withGrant,
          actions.passport.setGrants([secondGrant]),
        );
        expect(state.grants).toEqual([secondGrant]);
      });
    });

    describe('setLastIssuedGrantId', () => {
      it('records the identifier of the last issued grant', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setLastIssuedGrantId(secondGrant.id),
        );
        expect(state.lastIssuedGrantId).toBe(secondGrant.id);
      });
    });

    describe('setLocalUseCounter', () => {
      it('sets the local use counter', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setLocalUseCounter('3'),
        );
        expect(state.localUseCounter).toBe('3');
      });
    });

    describe('setShieldedHoldings', () => {
      it('replaces the whole holdings list', () => {
        const populated = passportReducers.passport(
          initialState,
          actions.passport.setShieldedHoldings([holding]),
        );
        expect(populated.shieldedHoldings).toEqual([holding]);

        const emptied = passportReducers.passport(
          populated,
          actions.passport.setShieldedHoldings([]),
        );
        expect(emptied.shieldedHoldings).toEqual([]);
      });
    });

    describe('setEncKey', () => {
      it('records the enc_key the account is at', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setEncKey('ee'.repeat(32)),
        );
        expect(state.encKey).toBe('ee'.repeat(32));
      });
    });

    describe('clearEncKey', () => {
      it('forgets the enc_key state held', () => {
        const state = [
          actions.passport.setEncKey('ee'.repeat(32)),
          actions.passport.clearEncKey(),
        ].reduce(passportReducers.passport, initialState);
        expect(state.encKey).toBeUndefined();
      });
    });

    describe('setFlow to recording', () => {
      it('enters the stage that writes account keys or bookkeeping to the inbox', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setFlow('recording'),
        );
        expect(state.flow).toBe('recording');
      });
    });

    describe('setUnsealedGrantIds', () => {
      it('replaces the read grants the last call could not seal to', () => {
        const unsealed = passportReducers.passport(
          initialState,
          actions.passport.setUnsealedGrantIds([firstGrant.id]),
        );
        expect(unsealed.unsealedGrantIds).toEqual([firstGrant.id]);

        const sealed = passportReducers.passport(
          unsealed,
          actions.passport.setUnsealedGrantIds([]),
        );
        expect(sealed.unsealedGrantIds).toEqual([]);
      });
    });

    describe('setRevocationPendingGrantIds', () => {
      it('replaces the read grants whose revocation the last call found pending', () => {
        const pending = passportReducers.passport(
          initialState,
          actions.passport.setRevocationPendingGrantIds([firstGrant.id]),
        );
        expect(pending.revocationPendingGrantIds).toEqual([firstGrant.id]);
        expect(pending.unsealedGrantIds).toEqual([]);

        const cleared = passportReducers.passport(
          pending,
          actions.passport.setRevocationPendingGrantIds([]),
        );
        expect(cleared.revocationPendingGrantIds).toEqual([]);
      });
    });

    describe('setDroppedDevices', () => {
      it('replaces the devices the last rotation left without the new key', () => {
        const dropped = passportReducers.passport(
          initialState,
          actions.passport.setDroppedDevices(['dd'.repeat(32)]),
        );
        expect(dropped.droppedDevices).toEqual(['dd'.repeat(32)]);

        const cleared = passportReducers.passport(
          dropped,
          actions.passport.setDroppedDevices([]),
        );
        expect(cleared.droppedDevices).toEqual([]);
      });
    });

    describe('reset', () => {
      it('restores the initial state', () => {
        const modified: PassportSliceState = {
          account,
          flow: 'ready',
          devices: [{ commitmentHex: 'abc', isLocal: true }],
          localUseCounter: '3',
          grants: [firstGrant],
          lastIssuedGrantId: firstGrant.id,
          shieldedHoldings: [holding],
          encKey: 'e1'.repeat(32),
          unsealedGrantIds: [firstGrant.id],
          revocationPendingGrantIds: [secondGrant.id],
          droppedDevices: ['dd'.repeat(32)],
        };

        const state = passportReducers.passport(
          modified,
          actions.passport.reset(),
        );
        expect(state).toEqual(initialState);
      });
    });
  });

  describe('selectors', () => {
    const populatedState = {
      passport: {
        account,
        flow: 'ready',
        flowError: { code: 'not-authorised', message: 'rejected' },
        devices: [{ commitmentHex: 'abc', isLocal: true }],
        localUseCounter: '3',
        grants: [firstGrant, secondGrant],
        lastIssuedGrantId: secondGrant.id,
        shieldedHoldings: [holding],
        encKey: 'e3'.repeat(32),
        unsealedGrantIds: [firstGrant.id],
        revocationPendingGrantIds: [secondGrant.id],
        droppedDevices: ['dd'.repeat(32)],
      } as PassportSliceState,
    } as State;

    it('selectAccount returns the account', () => {
      expect(passportSelectors.passport.selectAccount(populatedState)).toBe(
        account,
      );
    });

    it('selectFlow returns the flow', () => {
      expect(passportSelectors.passport.selectFlow(populatedState)).toBe(
        'ready',
      );
    });

    it('selectFlowError returns the flow error', () => {
      expect(
        passportSelectors.passport.selectFlowError(populatedState),
      ).toEqual({ code: 'not-authorised', message: 'rejected' });
    });

    it('selectDevices returns the device list', () => {
      expect(passportSelectors.passport.selectDevices(populatedState)).toEqual([
        { commitmentHex: 'abc', isLocal: true },
      ]);
    });

    it('selectLocalUseCounter returns the local use counter', () => {
      expect(
        passportSelectors.passport.selectLocalUseCounter(populatedState),
      ).toBe('3');
    });

    it('selectGrants returns the grant roster', () => {
      expect(passportSelectors.passport.selectGrants(populatedState)).toEqual([
        firstGrant,
        secondGrant,
      ]);
    });

    it('selectGrantById returns the grant with that identifier', () => {
      expect(
        passportSelectors.passport.selectGrantById(
          populatedState,
          secondGrant.id,
        ),
      ).toBe(secondGrant);
    });

    it('selectGrantById returns undefined for an unknown identifier', () => {
      expect(
        passportSelectors.passport.selectGrantById(
          populatedState,
          GrantId('cc'.repeat(32)),
        ),
      ).toBeUndefined();
    });

    it('selectLastIssuedGrantId returns the last issued grant identifier', () => {
      expect(
        passportSelectors.passport.selectLastIssuedGrantId(populatedState),
      ).toBe(secondGrant.id);
    });

    it('selectShieldedHoldings returns the holdings', () => {
      expect(
        passportSelectors.passport.selectShieldedHoldings(populatedState),
      ).toEqual([holding]);
    });

    it('selectEncKey returns the enc_key the account is at', () => {
      expect(passportSelectors.passport.selectEncKey(populatedState)).toBe(
        'e3'.repeat(32),
      );
    });

    it('selectUnsealedGrantIds returns the read grants left unsealed', () => {
      expect(
        passportSelectors.passport.selectUnsealedGrantIds(populatedState),
      ).toEqual([firstGrant.id]);
    });

    it('selectRevocationPendingGrantIds returns the read grants awaiting a revocation', () => {
      expect(
        passportSelectors.passport.selectRevocationPendingGrantIds(
          populatedState,
        ),
      ).toEqual([secondGrant.id]);
    });

    it('selectDroppedDevices returns the devices left without the new key', () => {
      expect(
        passportSelectors.passport.selectDroppedDevices(populatedState),
      ).toEqual(['dd'.repeat(32)]);
    });
  });
});
