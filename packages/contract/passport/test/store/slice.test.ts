import { describe, expect, it } from 'vitest';

import { passportActions as actions } from '../../src/index';
import { passportReducers, passportSelectors } from '../../src/store/slice';

import type {
  PassportAccountInfo,
  PassportDevice,
  PassportSliceState,
} from '../../src/store/slice';
import type { State } from '@lace-contract/module';

const initialState: PassportSliceState = {
  flow: 'idle',
  devices: [],
};

const account: PassportAccountInfo = {
  address: 'acc1address',
  bindingVersion: '1',
  status: 'ready',
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
        'removeDevice',
        () => actions.passport.removeDevice({ commitmentHex: 'abc' }),
      ],
    ] as const)('%s', (_name, trigger) => {
      const populated: PassportSliceState = {
        ...initialState,
        flow: 'ready',
        devices: [
          { commitmentHex: 'abc', isLocal: true },
          { commitmentHex: 'def', isLocal: false },
        ],
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

    describe('setLocalUseCounter', () => {
      it('sets the local use counter', () => {
        const state = passportReducers.passport(
          initialState,
          actions.passport.setLocalUseCounter('3'),
        );
        expect(state.localUseCounter).toBe('3');
      });
    });

    describe('reset', () => {
      it('restores the initial state', () => {
        const modified: PassportSliceState = {
          account,
          flow: 'ready',
          devices: [{ commitmentHex: 'abc', isLocal: true }],
          localUseCounter: '3',
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
  });
});
