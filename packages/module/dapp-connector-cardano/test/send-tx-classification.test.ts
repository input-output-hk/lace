/**
 * Integration test for the inspector pipeline using real CBOR data.
 *
 * Regression guard for the "send shows as receive" bug: when the wallet's
 * UTxO is available to the input resolver the pipeline must classify this
 * as an outgoing transaction (from=wallet, to=foreign).
 *
 * This test intentionally does NOT mock @cardano-sdk/core — every inspector
 * runs with real SDK logic so the output mirrors what the app would produce.
 */
import {
  Cardano,
  Milliseconds,
  Serialization,
  createTxInspector,
  tokenTransferInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import { computeNetFlows } from '../src/common/hooks/useDappTxInspection';
import { createDappAssetProvider } from '../src/common/utils/create-dapp-asset-provider';
import { createDappInputResolver } from '../src/common/utils/create-dapp-input-resolver';

// ─── Fixture data (from the bug report) ──────────────────────────────────────

const TX_CBOR =
  '84a400d90102818258202eef2bc7f813a72ea8a7fc9f60a861a74eac35fae24d1d12f3ce95847186dbe9000182a200583900e342ea26d4bf871a69dfbb13ebd76f7b91459d7aedb586af1b81576a6218a1160708ce5e96b773199e8c943db48c14c3329b7298983f63ad011a05f5e100a20058390075ff1648a76f01d924184702e7bdcd9e87ad288eeabfcdecb6c0a2ece89845e72e04c048bb55738a727a241777b33fff5ae34b936899e55c011b000000024df24636021a00029309031a0738e6bca0f5f6';

const WALLET_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qp6l79jg5ahsrkfyrprs9eaaek0g0tfg3m4tln0vkmq29m8gnpz7wtsycpytk4tn3fe85fqhw7enll66ud9ex6yeu4wqtc5sdg',
);

const WALLET_UTXO: Cardano.Utxo = [
  {
    address: WALLET_ADDRESS,
    txId: Cardano.TransactionId(
      '2eef2bc7f813a72ea8a7fc9f60a861a74eac35fae24d1d12f3ce95847186dbe9',
    ),
    index: 0,
  },
  {
    address: WALLET_ADDRESS,
    value: { coins: 9_997_826_623n },
  },
];

const PROTOCOL_PARAMETERS = {
  poolDeposit: 500_000_000,
  stakeKeyDeposit: 2_000_000,
};

const TIMEOUT = Milliseconds(6_000);

// ─── Helper ───────────────────────────────────────────────────────────────────

const runPipeline = async (localUtxos: Cardano.Utxo[]) => {
  const coreTx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(TX_CBOR),
  ).toCore();

  const inputResolver = createDappInputResolver(localUtxos, []);
  const assetProvider = createDappAssetProvider({
    tokensMetadata: {},
    tx: coreTx,
    dispatchLoadTokenMetadata: () => undefined,
    logger: dummyLogger,
  });

  const inspector = createTxInspector({
    tokenTransfer: tokenTransferInspector({
      inputResolver,
      fromAddressAssetProvider: assetProvider,
      toAddressAssetProvider: assetProvider,
      timeout: TIMEOUT,
      logger: dummyLogger,
    }),
    summary: transactionSummaryInspector({
      addresses: [WALLET_ADDRESS],
      rewardAccounts: [],
      inputResolver,
      protocolParameters: PROTOCOL_PARAMETERS,
      assetProvider,
      timeout: TIMEOUT,
      logger: dummyLogger,
    }),
  });

  const { tokenTransfer, summary } = await inspector(coreTx);

  const { from, to } = computeNetFlows(
    tokenTransfer.fromAddress,
    tokenTransfer.toAddress,
    [WALLET_ADDRESS],
  );

  return { from, to, summary, tokenTransfer };
};

describe('send tx classification — real inspector pipeline', () => {
  it('classifies as send: from=wallet, to=foreign when wallet UTxO is provided', async () => {
    const { from, to } = await runPipeline([WALLET_UTXO]);

    // Wallet is the sender
    expect(from.size).toBe(1);
    expect(from.has(WALLET_ADDRESS)).toBe(true);

    // Foreign address is the only recipient (change is netted away)
    expect(to.size).toBe(1);
    const [foreignAddress] = to.keys();
    expect(foreignAddress).not.toBe(WALLET_ADDRESS);
  });
});
