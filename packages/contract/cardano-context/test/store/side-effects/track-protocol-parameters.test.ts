import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { createStubObservable } from '@cardano-sdk/util-dev';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { CardanoNetworkId } from '../../../src';
import { cardanoContextActions } from '../../../src/store';
import { trackProtocolParameters } from '../../../src/store/side-effects';
import { chainId } from '../../mocks';

import type {
  CardanoProviderDependencies,
  RequiredProtocolParameters,
} from '../../../src/types';
import type { Result } from '@lace-sdk/util';

const actions = {
  ...cardanoContextActions,
};

describe('cardano-context side effects', () => {
  describe('trackProtocolParameters', () => {
    it('dispatches setProtocolParameters action on successful retrieval', () => {
      testSideEffect(trackProtocolParameters, ({ cold, expectObservable }) => {
        const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });

        // Mock protocol parameters
        const mockProtocolParameters = {
          mock: 'parameter',
        } as unknown as RequiredProtocolParameters;

        const getProtocolParametersResults$ = createStubObservable<
          Result<RequiredProtocolParameters, ProviderError>
        >(of(Ok(mockProtocolParameters)));

        const getProtocolParameters = vi
          .fn()
          .mockReturnValue(getProtocolParametersResults$);

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$: chainId$ },
          },
          dependencies: {
            cardanoProvider: {
              getProtocolParameters,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.setProtocolParameters({
                protocolParameters: mockProtocolParameters,
                network: CardanoNetworkId(chainId.networkMagic),
              }),
            });
          },
        };
      });
    });

    it('dispatches getProtocolParametersFailed action on error', () => {
      testSideEffect(trackProtocolParameters, ({ cold, expectObservable }) => {
        const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
        const error = new ProviderError(ProviderFailure.ConnectionFailure);

        const getProtocolParametersResults$ = createStubObservable<
          Result<RequiredProtocolParameters, ProviderError>
        >(of(Err(error)));

        const getProtocolParameters = vi
          .fn()
          .mockReturnValue(getProtocolParametersResults$);

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$: chainId$ },
          },
          dependencies: {
            cardanoProvider: {
              getProtocolParameters,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.getProtocolParametersFailed({
                chainId: chainId,
                failure: error.reason,
              }),
            });
          },
        };
      });
    });

    it('updates protocol parameters when chainId changes', () => {
      testSideEffect(trackProtocolParameters, ({ cold, expectObservable }) => {
        const preprodChainId = Cardano.ChainIds.Preprod;
        const mainnetChainId = Cardano.ChainIds.Mainnet;
        const chainId$ = cold<Cardano.ChainId>('ab', {
          a: preprodChainId,
          b: mainnetChainId,
        });

        // Mock protocol parameters for different networks
        const preprodProtocolParams = {
          mock: 'parameter',
        } as unknown as Cardano.ProtocolParameters;

        const mainnetProtocolParams = {
          ...preprodProtocolParams,
          minFeeCoefficient: 55, // Different value to distinguish
        } as Cardano.ProtocolParameters;

        const getProtocolParameters = vi.fn<
          CardanoProviderDependencies['cardanoProvider']['getProtocolParameters']
        >(({ chainId }) => {
          return of(
            Ok(
              chainId === Cardano.ChainIds.Mainnet
                ? mainnetProtocolParams
                : preprodProtocolParams,
            ),
          );
        });

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$: chainId$ },
          },
          dependencies: {
            cardanoProvider: {
              getProtocolParameters,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('ab', {
              a: actions.cardanoContext.setProtocolParameters({
                protocolParameters: preprodProtocolParams,
                network: CardanoNetworkId(preprodChainId.networkMagic),
              }),
              b: actions.cardanoContext.setProtocolParameters({
                protocolParameters: mainnetProtocolParams,
                network: CardanoNetworkId(mainnetChainId.networkMagic),
              }),
            });
          },
        };
      });
    });
  });
});
