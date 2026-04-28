import { describe, expect, it } from 'vitest';

import { dappConnectorActions, DappId } from '../../src';
import { authorizeDappJobs } from '../../src/store/authorize-job-slices';
import { authorizedDappsSlice } from '../../src/store/authorized-dapps-slice';

import type { AuthorizedDappsDataSlice } from '../../src/store/authorized-dapps-slice';

describe('authorizedDappsSlice', () => {
  const { reducer } = authorizedDappsSlice;

  const dappA = {
    id: DappId('https://dapp-a.example'),
    name: 'Dapp A',
    origin: 'https://dapp-a.example',
    imageUrl: 'https://dapp-a.example/icon.png',
  };

  const dappB = {
    id: DappId('https://dapp-b.example'),
    name: 'Dapp B',
    origin: 'https://dapp-b.example',
    imageUrl: 'https://dapp-b.example/icon.png',
  };

  describe('authorizeDappJobs.actions.completed', () => {
    it('adds a new authorized dapp to the correct blockchain list', () => {
      const state = reducer(
        undefined,
        authorizeDappJobs.actions.completed({
          dapp: dappA,
          authorized: true,
          blockchainName: 'Cardano',
        }),
      );

      expect(state).toEqual({
        Cardano: [
          {
            blockchain: 'Cardano',
            dapp: dappA,
            isPersisted: true,
          },
        ],
      });
    });

    it('re-authorizing an existing dapp replaces the entry instead of duplicating', () => {
      const completedAction = authorizeDappJobs.actions.completed({
        dapp: dappA,
        authorized: true,
        blockchainName: 'Midnight',
      });

      let state = reducer(undefined, completedAction);
      state = reducer(state, completedAction);

      expect(state.Midnight).toHaveLength(1);
      expect(state.Midnight).toEqual([
        {
          blockchain: 'Midnight',
          dapp: dappA,
          isPersisted: true,
        },
      ]);
    });

    it('re-authorizing with updated dapp metadata replaces the entry', () => {
      const initial: AuthorizedDappsDataSlice = {
        Midnight: [
          {
            blockchain: 'Midnight',
            dapp: { ...dappA, name: 'Old Name' },
            isPersisted: true,
          },
        ],
      };

      const state = reducer(
        initial,
        authorizeDappJobs.actions.completed({
          dapp: { ...dappA, name: 'New Name' },
          authorized: true,
          blockchainName: 'Midnight',
        }),
      );

      expect(state.Midnight).toHaveLength(1);
      expect(state.Midnight?.[0].dapp.name).toBe('New Name');
    });

    it('does not modify state when authorized is false', () => {
      const initial: AuthorizedDappsDataSlice = {
        Cardano: [
          {
            blockchain: 'Cardano',
            dapp: dappA,
            isPersisted: true,
          },
        ],
      };

      const state = reducer(
        initial,
        authorizeDappJobs.actions.completed({
          dapp: dappB,
          authorized: false,
        }),
      );

      expect(state).toEqual(initial);
    });

    it('does not duplicate when same dapp exists on another blockchain', () => {
      let state = reducer(
        undefined,
        authorizeDappJobs.actions.completed({
          dapp: dappA,
          authorized: true,
          blockchainName: 'Cardano',
        }),
      );
      state = reducer(
        state,
        authorizeDappJobs.actions.completed({
          dapp: dappA,
          authorized: true,
          blockchainName: 'Midnight',
        }),
      );

      expect(state.Cardano).toHaveLength(1);
      expect(state.Midnight).toHaveLength(1);
      expect(state.Cardano?.[0].dapp.id).toBe(dappA.id);
      expect(state.Midnight?.[0].dapp.id).toBe(dappA.id);
    });
  });

  describe('removeAuthorizedDapp', () => {
    it('removes the dapp from the blockchain list', () => {
      let state = reducer(
        undefined,
        authorizeDappJobs.actions.completed({
          dapp: dappA,
          authorized: true,
          blockchainName: 'Cardano',
        }),
      );
      state = reducer(
        state,
        dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
          blockchainName: 'Cardano',
          dapp: dappA,
        }),
      );

      expect(state.Cardano).toEqual([]);
    });
  });
});
