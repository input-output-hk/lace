/** @vitest-environment jsdom */
import { Buffer } from 'node:buffer';

import { Cardano, Serialization } from '@cardano-sdk/core';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { useDappTxInspection } from '../src/common/hooks/useDappTxInspection';
import { useTransactionSummaryData } from '../src/common/hooks/useTransactionSummaryData';

import client from './fixtures/lw15790-redemption.json';

import type { TokenTransferValue } from '@lace-contract/cardano-context';
import type { StoredTokenMetadata, TokenId } from '@lace-contract/tokens';

const store = vi.hoisted(() => ({
  selectors: {} as Record<string, unknown>,
  loadMetadata: () => undefined,
}));
vi.mock('../src/common/hooks/storeHooks', () => ({
  useLaceSelector: (key: string) => store.selectors[key],
  useDispatchLaceAction: () => store.loadMetadata,
}));

// SDK byte checks require Node Buffers and jsdom to share Uint8Array identity.
beforeAll(() => vi.stubGlobal('Uint8Array', Object.getPrototypeOf(Buffer)));
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

const original = Cardano.PaymentAddress(client.addresses.original);
const current = Cardano.PaymentAddress(client.addresses.current);
const script = Cardano.PaymentAddress(client.addresses.script);
const night = Cardano.AssetId(client.nightAssetId);
const metadata = (
  assetId: Cardano.AssetId,
  ticker: string,
  { decimals = 0, isNft = false } = {},
): StoredTokenMetadata => ({
  tokenId: `${assetId.slice(0, 56)}.${assetId.slice(56)}` as TokenId,
  name: ticker,
  ticker,
  decimals,
  isNft,
  blockchainSpecific: {},
});

const inspect = async ({
  txHex,
  ownAddresses,
  localUtxos,
  foreignUtxos,
  metadatas,
}: {
  txHex: string;
  ownAddresses: Cardano.PaymentAddress[];
  localUtxos: Cardano.Utxo[];
  foreignUtxos: Cardano.Utxo[];
  metadatas: StoredTokenMetadata[];
}) => {
  const tokensMetadata = Object.fromEntries(
    metadatas.map(value => [value.tokenId, value]),
  );
  store.selectors = {
    'cardanoContext.selectAccountUtxos': { account: localUtxos },
    'cardanoContext.selectProtocolParameters': {
      poolDeposit: 500_000_000,
      stakeKeyDeposit: 2_000_000,
    },
    'cardanoDappConnector.selectResolvedTransactionInputs': {
      isResolving: false,
      foreignResolvedInputs: foreignUtxos.map(([txIn, txOut]) => ({
        txIn,
        txOutCbor: Serialization.TransactionOutput.fromCore(txOut).toCbor(),
      })),
    },
    'addresses.selectActiveNetworkAccountAddresses': ownAddresses.map(
      address => ({ address }),
    ),
    'tokens.selectTokensMetadata': tokensMetadata,
  };
  const { result } = renderHook(() => {
    const inspection = useDappTxInspection({ txHex });
    const summary = useTransactionSummaryData({
      fromAddresses: inspection.fromAddresses,
      toAddresses: inspection.toAddresses,
      ownAddresses,
      tokensMetadata,
      coinSymbol: 'ADA',
    });
    return { inspection, summary };
  });
  await waitFor(() => {
    expect(result.current.inspection.isLoading).toBe(false);
  });
  expect(result.current.inspection.error).toBeNull();
  return result.current;
};

const value = (
  coins: bigint,
  assets: [Cardano.AssetId, bigint][] = [],
): TokenTransferValue => ({ coins, assets: new Map(assets) });

const clientInputs = (): Cardano.Utxo[] =>
  client.inputs.map(input => [
    {
      txId: Cardano.TransactionId(input.txId),
      index: input.index,
      address: Cardano.PaymentAddress(input.address),
    },
    {
      address: Cardano.PaymentAddress(input.address),
      value: value(
        BigInt(input.coins),
        input.assets.map(([id, quantity]) => [
          Cardano.AssetId(id),
          BigInt(quantity),
        ]),
      ),
    },
  ]);

describe('signing address movements through real inspection', () => {
  it.each([true, false])(
    'keeps the redemption destination and wallet totals (destination known=%s)',
    async destinationKnown => {
      const [scriptInput, currentInput] = clientInputs();
      const { inspection, summary } = await inspect({
        txHex: client.txHex,
        ownAddresses: destinationKnown ? [current, original] : [current],
        localUtxos: [currentInput],
        foreignUtxos: [scriptInput],
        metadatas: [metadata(night, 'NIGHT', { decimals: 6 })],
      });

      expect(inspection.fromAddresses).toEqual(
        new Map([
          [script, value(0n, [[night, -57_335_683n]])],
          [current, value(-1_558_888n)],
        ]),
      );
      expect(inspection.toAddresses).toEqual(
        new Map([[original, value(1_159_390n, [[night, 57_335_683n]])]]),
      );
      expect(summary.formattedNetCoinBalance).toBe(
        destinationKnown ? '-0.399498' : '-1.558888',
      );
      expect(
        summary.assetList.map(({ symbol, formattedAmount, isPositive }) => [
          symbol,
          formattedAmount,
          isPositive,
        ]),
      ).toEqual(destinationKnown ? [['NIGHT', '57.335683', true]] : []);
      expect(inspection.summary?.collateral).toBe(599_247n);
    },
  );

  it('preserves opposite asset directions and cancels transfers between own addresses', async () => {
    const token = Cardano.AssetId(`${'11'.repeat(28)}54`);
    const received = Cardano.AssetId(`${'22'.repeat(28)}55`);
    const nft = Cardano.AssetId(`${'33'.repeat(28)}4e4654`);
    const inputValues: [Cardano.PaymentAddress, TokenTransferValue][] = [
      [
        original,
        value(12_000_000n, [
          [token, 10n],
          [nft, 1n],
        ]),
      ],
      [current, value(3_000_000n)],
      [script, value(20_000_000n, [[received, 50n]])],
    ];
    const inputs: Cardano.Utxo[] = inputValues.map(
      ([address, inputValue], index) => [
        {
          txId: Cardano.TransactionId('44'.repeat(32)),
          index,
          address,
        },
        {
          address,
          value: inputValue,
        },
      ],
    );
    const txHex = Serialization.Transaction.fromCore({
      id: Cardano.TransactionId('55'.repeat(32)),
      witness: { signatures: new Map() },
      body: {
        inputs: inputs.map(([input]) => input),
        outputs: [
          { address: original, value: value(1_000_000n, [[token, 2n]]) },
          {
            address: original,
            value: value(2_000_000n, [
              [token, 2n],
              [received, 5n],
            ]),
          },
          {
            address: current,
            value: value(4_000_000n, [
              [token, 6n],
              [nft, 1n],
            ]),
          },
          { address: script, value: value(27_800_000n, [[received, 45n]]) },
        ],
        fee: 200_000n,
      },
    }).toCbor();
    const { inspection, summary } = await inspect({
      txHex,
      ownAddresses: [original, current],
      localUtxos: inputs.slice(0, 2),
      foreignUtxos: inputs.slice(2),
      metadatas: [
        metadata(token, 'T'),
        metadata(received, 'U'),
        metadata(nft, 'NFT', { isNft: true }),
      ],
    });

    expect(inspection.fromAddresses).toEqual(
      new Map([
        [
          original,
          value(-9_000_000n, [
            [token, -6n],
            [nft, -1n],
          ]),
        ],
        [script, value(0n, [[received, -5n]])],
      ]),
    );
    expect(inspection.toAddresses).toEqual(
      new Map([
        [original, value(0n, [[received, 5n]])],
        [
          current,
          value(1_000_000n, [
            [token, 6n],
            [nft, 1n],
          ]),
        ],
        [script, value(7_800_000n)],
      ]),
    );
    expect(summary.formattedNetCoinBalance).toBe('-8.00');
    expect(
      summary.assetList.map(({ symbol, formattedAmount, isPositive }) => [
        symbol,
        formattedAmount,
        isPositive,
      ]),
    ).toEqual([['U', '5', true]]);
  });
});
