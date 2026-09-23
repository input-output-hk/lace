import { Cardano, Serialization } from '@cardano-sdk/core';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeBuild } from '../../src/store/side-effects';
import { realfiStakingActions } from '../../src/store/slice';

import type {
  RealFiBuildRequest,
  RealFiProviderError,
} from '../../src/provider-types';
import type { RealFiReview } from '../../src/store/types';
import type { Percent } from '@cardano-sdk/util';
import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type { Milliseconds } from '@lace-lib/util';

const accountId = AccountId('acct-1');
const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const changeAddr = Cardano.PaymentAddress(
  // cSpell:disable-next-line
  'addr_test1qrtdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yqjjnenn',
);

const utxo: Cardano.Utxo = [
  {
    txId: Cardano.TransactionId('0'.repeat(64)),
    index: 0,
    address: changeAddr,
  },
  { address: changeAddr, value: { coins: 10_000_000n } },
];

const protocolParameters = {
  coinsPerUtxoByte: 4310,
  maxTxSize: 16_384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155_381,
} as unknown as RequiredProtocolParameters;

const review: RealFiReview = {
  quote: {
    quoteId: 'q1',
    kind: 'stake',
    inputAmount: '1000000',
    estimatedOutput: '999999',
    route: [],
    priceImpact: 0.01 as Percent,
    exchangeRate: 1,
    networkFee: '170000',
    serviceFee: '0',
    serviceFeeTokenId: 'lovelace',
    quoteExpiresAt: 9_999_999 as Milliseconds,
  },
  estimatedOutput: '999999',
  route: [],
  priceImpact: 0.01 as Percent,
  networkFee: '170000',
  serviceFee: '0',
  serviceFeeTokenId: 'lovelace',
  quoteExpiresAt: 9_999_999 as Milliseconds,
};

const signingState = {
  status: 'SigningTransaction' as const,
  kind: 'stake' as const,
  accountId,
  inputAmount: '1000000',
  inputTokenId: 'lovelace',
  outputTokenId: 'lovelace',
  review,
  unsignedTxCbor: '',
};

const testWallet = {
  walletId: WalletId('wallet-1'),
  accounts: [{ accountId, blockchainName: 'Cardano' }],
} as unknown as AnyWallet;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const baseStateObservables = {
  wallets: { selectAll$: of([testWallet]) },
  addresses: {
    selectByAccountId$: of(() => [{ address: changeAddr }] as never),
  },
  network: {
    selectActiveNetworkId$: of(() => previewNetworkId),
  },
  features: {
    selectLoadedFeatures$: of({ featureFlags: [realfiFlag], modules: [] }),
  },
};

describe('makeBuild', () => {
  it('passes serialized available UTxOs and protocol parameters to buildBundledTx', () => {
    const buildBundledTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'cbor' })));
    const provider = { buildBundledTx } as never;

    testSideEffect(makeBuild, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: signingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: {
        actions: realfiStakingActions,
        realfiProviders: [provider],
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(buildBundledTx).toHaveBeenCalledTimes(1);
        const request = buildBundledTx.mock.calls[0][0] as RealFiBuildRequest;
        expect(request.protocolParameters).toEqual(protocolParameters);
        expect(request.utxos).toEqual([
          Serialization.TransactionUnspentOutput.fromCore(utxo).toCbor(),
        ]);
        expect(emissions).toContainEqual(
          realfiStakingActions.realfiFlow.submissionStarted({
            serializedTx: 'cbor',
          }),
        );
      },
    }));
  });

  it('fails the flow when no wallet owns the account — never signs with an arbitrary wallet', () => {
    const buildBundledTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'cbor' })));
    const provider = { buildBundledTx } as never;
    const strangerWallet = {
      walletId: WalletId('wallet-other'),
      accounts: [
        { accountId: AccountId('acct-other'), blockchainName: 'Cardano' },
      ],
    } as unknown as AnyWallet;

    testSideEffect(makeBuild, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        wallets: { selectAll$: of([strangerWallet]) },
        realfiFlow: {
          selectFlowState$: hot('-a', { a: signingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: {
        actions: realfiStakingActions,
        realfiProviders: [provider],
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(buildBundledTx).not.toHaveBeenCalled();
        expect(emissions).toContainEqual(
          realfiStakingActions.realfiFlow.submissionFailed({
            errorMessage: 'realfi.error.title',
          }),
        );
      },
    }));
  });

  it('fails the flow when protocol parameters are missing', () => {
    const buildBundledTx = vi
      .fn()
      .mockReturnValue(of(Ok({ unsignedTxCbor: 'cbor' })));
    const provider = { buildBundledTx } as never;

    testSideEffect(makeBuild, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: signingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(undefined),
        },
      },
      dependencies: {
        actions: realfiStakingActions,
        realfiProviders: [provider],
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(buildBundledTx).not.toHaveBeenCalled();
        expect(emissions).toContainEqual(
          realfiStakingActions.realfiFlow.submissionFailed({
            errorMessage: 'realfi.error.title',
          }),
        );
      },
    }));
  });

  it('fails the flow when the build returns an error result', () => {
    const buildBundledTx = vi
      .fn()
      .mockReturnValue(
        of(Err<RealFiProviderError>({ code: 'VALIDATION', message: 'nope' })),
      );
    const provider = { buildBundledTx } as never;

    testSideEffect(makeBuild, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: signingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: {
        actions: realfiStakingActions,
        realfiProviders: [provider],
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(emissions).toEqual([
          realfiStakingActions.realfiFlow.submissionFailed({
            errorMessage: 'realfi.error.title',
            errorDetail: 'nope',
            errorCode: 'VALIDATION',
          }),
        ]);
      },
    }));
  });

  it('fails the flow when the build pipeline throws', () => {
    const buildBundledTx = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('boom')));
    const provider = { buildBundledTx } as never;

    testSideEffect(makeBuild, ({ hot, flush }) => ({
      stateObservables: {
        ...baseStateObservables,
        realfiFlow: {
          selectFlowState$: hot('-a', { a: signingState }),
        },
        cardanoContext: {
          selectAvailableAccountUtxos$: of({ [accountId]: [utxo] }),
          selectProtocolParameters$: of(protocolParameters),
        },
      },
      dependencies: {
        actions: realfiStakingActions,
        realfiProviders: [provider],
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(emissions).toEqual([
          realfiStakingActions.realfiFlow.submissionFailed({
            errorMessage: 'realfi.error.title',
            errorDetail: 'boom',
          }),
        ]);
      },
    }));
  });
});
