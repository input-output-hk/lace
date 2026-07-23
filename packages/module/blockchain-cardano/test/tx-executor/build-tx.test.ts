import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { makeBuildTx } from '../../src/tx-executor-implementation/build-tx';

import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  TxExecutorImplementation,
  TokenTransfer,
} from '@lace-contract/tx-executor';

type BuildTxParamsShape = Parameters<TxExecutorImplementation['buildTx']>[0];

const testAccountId = AccountId('test-account');
const testAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';

const previousTxId = Cardano.TransactionId(
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
);

const makeUtxo = (
  txId: Cardano.TransactionId,
  index: number,
  coins: bigint,
): Cardano.Utxo => [
  { txId, index, address: Cardano.PaymentAddress(testAddress) },
  { address: Cardano.PaymentAddress(testAddress), value: { coins } },
];

const mockProtocolParameters: RequiredProtocolParameters = {
  desiredNumberOfPools: 500,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  monetaryExpansion: '0.003',
  poolInfluence: '0.5',
  dRepDeposit: 500000000,
  minFeeRefScriptCostPerByte: '15',
  coinsPerUtxoByte: 4310,
  maxTxSize: 16384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  poolDeposit: 500_000_000,
  stakeKeyDeposit: 2_000_000,
  prices: {
    memory: 0.0577,
    steps: 0.0000721,
  },
};

const mockAddress = {
  accountId: testAccountId,
  address: testAddress,
  blockchainName: 'Cardano' as const,
};

describe('makeBuildTx reads from the injected cardanoAvailableAccountUtxos$', () => {
  const makeDeps = (): SideEffectDependencies =>
    ({
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAddresses$: of([mockAddress]),
      },
    } as unknown as SideEffectDependencies);

  const toAvailableAccountUtxos$ = (utxos: Cardano.Utxo[]) =>
    of({ [testAccountId]: utxos });

  const tokenTransfer = {
    normalizedAmount: BigNumber(1_000_000n),
    token: {
      accountId: testAccountId,
      blockchainName: 'Cardano',
      tokenId: 'lovelace',
    },
  } as unknown as TokenTransfer;

  const buildParams = {
    accountId: testAccountId,
    blockchainName: 'Cardano',
    serializedTx: '',
    blockchainSpecificSendFlowData: {},
    txParams: [
      {
        address: testAddress,
        tokenTransfers: [tokenTransfer],
      },
    ],
  } as unknown as BuildTxParamsShape;

  it('builds successfully when the available UTxO set covers the outputs', async () => {
    const buildTx = makeBuildTx(
      makeDeps(),
      toAvailableAccountUtxos$([
        makeUtxo(previousTxId, 0, 10_000_000n),
        makeUtxo(previousTxId, 1, 5_000_000n),
      ]),
    );
    const result = await firstValueFrom(buildTx(buildParams));
    expect(result.success).toBe(true);
  });

  it('returns a buildTx error when the available UTxO set is empty', async () => {
    const buildTx = makeBuildTx(makeDeps(), toAvailableAccountUtxos$([]));
    const result = await firstValueFrom(buildTx(buildParams));
    expect(result.success).toBe(false);
  });
});
