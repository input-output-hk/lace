import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import { LargeFirstCoinSelector } from '../../src/input-selection/LargeFirstCoinSelector';
import {
  balanceTransaction,
  isTransactionBalanced,
} from '../../src/tx-builder/balancing';

import type { RequiredProtocolParameters } from '../../src';
import type {
  CoinSelector,
  CoinSelectorResult,
  CoinSelectorParams,
} from '../../src/input-selection/types';
import type { Cardano } from '@cardano-sdk/core';

const BALANCED_TX_CBOR = Serialization.TxCBOR(
  '84a300d9010282825820027b68d4c11e97d7e065cc2702912cb1a21b6d0e56c6a74dd605889a5561138500825820d3c887d17486d483a2b46b58b01cb9344745f15fdd8f8e70a57f854cdd88a633010182a2005839005cf6c91279a859a072601779fb33bb07c34e1d641d45df51ff63b967f15db05f56035465bf8900a09bdaa16c3d8b8244fea686524408dd8001821a00e4e1c0a1581c0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882a1474e46542d30303101a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a6454011a0d294e28021a00029eb9a0f5f6',
);
const UNBALANCED_TX_CBOR = Serialization.TxCBOR(
  '84a300d9010282825820027b68d4c11e97d7e065cc2702912cb1a21b6d0e56c6a74dd605889a5561138500825820d3c887d17486d483a2b46b58b01cb9344745f15fdd8f8e70a57f854cdd88a633010182a2005839005cf6c91279a859a072601779fb33bb07c34e1d641d45df51ff63b967f15db05f56035465bf8900a09bdaa16c3d8b8244fea686524408dd8001821a00e4e1c0a1581c0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882a1474e46542d30303101a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a6454011a0d294e28021a00000000a0f5f6',
);
const COMPLEX_TX_CBOR = Serialization.TxCBOR(
  '84b000818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5000181825839009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc820aa3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c411832581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e020a031903e8049182008200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d083078200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d00a83088200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d01483088200581cc37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f186482018200581cc37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f82008200581cc37b1b5dc0669f1d3c61a6fddb2e8fde96be87b881c60bce8e8d542f8a03581cd85087c646951407198c27b1b950fd2e99f28586c000ce39f6e6ef9258208dd154228946bd12967c12bedb1cb6038b78f8b84a1760b1a788fa72a4af3db01927101903e8d81e820105581de1cb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810f81581ccb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810f8383011913886b6578616d706c652e636f6d8400191770447f000001f682026b6578616d706c652e636f6d827368747470733a2f2f6578616d706c652e636f6d58200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d58304581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d01901f483028200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0581c1732c16e26f8efb749c7f67113ec507a97fb3b382b8c147538e92db784108200581cb276b4f7a706a81364de606d890343a76af570268d4bbfee2fc8fcab05f683118200581cb276b4f7a706a81364de606d890343a76af570268d4bbfee2fc8fcab0584108200581cb276b4f7a706a81364de606d890343a76af570268d4bbfee2fc8fcab05f683118200581cb276b4f7a706a81364de606d890343a76af570268d4bbfee2fc8fcab05840b8200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0581c1732c16e26f8efb749c7f67113ec507a97fb3b382b8c147538e92db70a840c8200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d08200581cb276b4f7a706a81364de606d890343a76af570268d4bbfee2fc8fcab0a850d8200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0581c1732c16e26f8efb749c7f67113ec507a97fb3b382b8c147538e92db78200581cb276b4f7a706a81364de606d890343a76af570268d4bbfee2fc8fcab0a82018200581c13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d005a1581de013cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d00a0758202ceb364d93225b4a0f004a0975a13eb50c3cc6348474b4fe9121f8dc72ca0cfa08186409a3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c411832581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e0b58206199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d38abc123de0d818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5010e81581c6199186adb51974690d7247d2646097d2c62763b16fb7ed3f9f55d3910825839009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc820aa3581c2a286ad895d091f2b3d168a6091ad2627d30a72761a5bc36eef00740a14014581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c411832581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a240182846504154415445181e11186412818258200f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5001481841864581de013cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d08106827468747470733a2f2f74657374696e672e7468697358203e33018e8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80da700818258206199186adb51974690d7247d2646097d2c62763b767b528816fb7ed3f9f55d395840bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c8918755bdea87fca1b4b4df8a9b8fb4183c0fab2f8261eb6c5e4bc42c800bb9c891875501868205186482041901f48200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f548201818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f548202818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f54830301818200581cb5ae663aaea8e500157bdf4baafd6f5ba0ce5759f7cd4101fc132f540281845820deeb8f82f2af5836ebbc1b450b6dbf0b03c93afe5696f10d49e8a8304ebfac01584064676273786767746f6768646a7074657476746b636f6376796669647171676775726a687268716169697370717275656c6876797071786565777072796676775820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b45041a003815820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b4500481187b0582840100d87a9f187bff82190bb8191b58840201d87a9f187bff821913881907d006815820b6dbf0b03c93afe5696f10d49e8a8304ebfac01deeb8f82f2af5836ebbc1b450f5a6011904d2026373747203821904d2637374720445627974657305a2667374726b6579187b81676c6973746b65796873747276616c75650626',
);
const CBOR_DIFFERENT_VAL1 = HexBlob(
  '82825820027b68d4c11e97d7e065cc2702912cb1a21b6d0e56c6a74dd605889a5561138500a200583900287a7e37219128cfb05322626daa8b19d1ad37c6779d21853f7b94177c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa801821a00118f32a1581c0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882a1474e46542d30303101',
);
const CBOR_DIFFERENT_VAL2 = HexBlob(
  '82825820d3c887d17486d483a2b46b58b01cb9344745f15fdd8f8e70a57f854cdd88a63301a200583900287a7e37219128cfb05322626daa8b19d1ad37c6779d21853f7b94177c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa8011a0dff3f6f',
);
const CBOR_DIFFERENT_VAL3 = HexBlob(
  '82825820bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e001a200583900287a7e37219128cfb05322626daa8b19d1ad37c6779d21853f7b94177c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa801821a026679b8a2581c1ec85dcee27f2d90ec1f9a1e4ce74a667dc9be8b184463223f9c9601a14350584c05581c659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82a14454534c420a',
);

const txFromCborHex = (hex: Serialization.TxCBOR): Cardano.Tx =>
  Serialization.Transaction.fromCbor(hex).toCore();

const utxoFromCborHex = (hex: HexBlob): Cardano.Utxo => {
  const reader = new Serialization.CborReader(hex);
  reader.readStartArray();
  const txIn = Serialization.TransactionInput.fromCbor(
    HexBlob.fromBytes(reader.readEncodedValue()),
  ).toCore() as unknown as Cardano.HydratedTxIn;
  const txOut = Serialization.TransactionOutput.fromCbor(
    HexBlob.fromBytes(reader.readEncodedValue()),
  ).toCore();
  reader.readEndArray();
  return [txIn, txOut];
};

// Build the protocol parameters used by the tests.
const initProtocolParameters = (): RequiredProtocolParameters => ({
  // Fee params
  minFeeCoefficient: 44, // "A"
  minFeeConstant: 155381, // "B"
  // UTxO min ada calc
  coinsPerUtxoByte: 4310,
  // Deposits (used via computeImplicitCoin)
  stakeKeyDeposit: 2_000_000,
  poolDeposit: 2_000_000,
  dRepDeposit: 500_000_000,
  // The rest can be provided as sensible defaults
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  desiredNumberOfPools: 500,
  monetaryExpansion: '0.003',
  poolInfluence: '0.5',
  maxTxSize: 16384,
  maxValueSize: 5000,

  prices: {
    memory: 0.0577,
    steps: 0.0000721,
  },
  minFeeRefScriptCostPerByte: '15',
});

const newDefaultUtxoList = (donation = 0n): Cardano.Utxo[] => {
  const u1 = utxoFromCborHex(CBOR_DIFFERENT_VAL1);
  const u2 = utxoFromCborHex(CBOR_DIFFERENT_VAL2);
  const u3 = utxoFromCborHex(CBOR_DIFFERENT_VAL3);

  if (donation > 0n) {
    const v = u1[1].value;
    u1[1] = {
      ...u1[1],
      value: {
        coins: (v.coins ?? 0n) + donation,
        assets: v.assets,
      },
    };
  }

  return [u2, u1, u3];
};

const newTransactionWithoutInputs = (
  cborHex: Serialization.TxCBOR,
  targetCoin: bigint,
): Cardano.Tx => {
  const tx = txFromCborHex(cborHex);
  const outputs = tx.body.outputs;
  if (outputs.length === 0) throw new Error('tx has no outputs');

  const first = outputs[0];
  const newFirst: Cardano.TxOut = {
    ...first,
    value: {
      coins: targetCoin,
      assets: first.value.assets,
    },
  };

  return {
    ...tx,
    body: {
      ...tx.body,
      inputs: [],
      outputs: [newFirst],
    },
  };
};

const newTransactionWithoutInputsNoAssets = (
  cborHex: Serialization.TxCBOR,
  targetCoin: bigint,
): Cardano.Tx => {
  const tx = txFromCborHex(cborHex);
  const outputs = tx.body.outputs;
  if (outputs.length === 0) throw new Error('tx has no outputs');

  const newFirst: Cardano.TxOut = {
    ...outputs[0],
    value: {
      coins: targetCoin,
      assets: new Map<Cardano.AssetId, bigint>(),
    },
  };

  return {
    ...tx,
    body: {
      ...tx.body,
      inputs: [],
      outputs: [newFirst],
      fee: 0n,
    },
  };
};

const createAddress = (bech32: string): Cardano.PaymentAddress =>
  bech32 as unknown as Cardano.PaymentAddress;

describe('balanceTransaction', () => {
  const changeAddr =
    'addr_test1qqnqfr70emn3kyywffxja44znvdw0y4aeyh0vdc3s3rky48vlp50u6nrq5s7k6h89uqrjnmr538y6e50crvz6jdv3vqqxah5fk';

  it('can balance a transaction', () => {
    const tx = newTransactionWithoutInputs(BALANCED_TX_CBOR, 15_000_000n);
    const protocol = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList();
    const coinSelector = new LargeFirstCoinSelector();

    const balanced = balanceTransaction({
      unbalancedTx: tx,
      availableUtxo: resolvedInputs,
      preSelectedUtxo: undefined,
      protocolParameters: protocol,
      coinSelector,
      changeAddress: createAddress(changeAddr),
    });

    const isBalanced = isTransactionBalanced({
      transaction: balanced,
      resolvedInputs,
      protocolParameters: protocol,
    });

    expect(isBalanced).toBe(true);
  });

  it('can balance a transaction 2', () => {
    const tx = newTransactionWithoutInputsNoAssets(
      BALANCED_TX_CBOR,
      234_827_000n,
    );
    const protocol = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList();
    const coinSelector = new LargeFirstCoinSelector();

    const balanced = balanceTransaction({
      unbalancedTx: tx,
      availableUtxo: resolvedInputs,
      preSelectedUtxo: undefined,
      protocolParameters: protocol,
      coinSelector,
      changeAddress: createAddress(changeAddr),
    });

    const isBalanced = isTransactionBalanced({
      transaction: balanced,
      resolvedInputs,
      protocolParameters: protocol,
    });

    expect(isBalanced).toBe(true);
  });

  it('can balance a transaction with donations', () => {
    const tx = newTransactionWithoutInputsNoAssets(
      BALANCED_TX_CBOR,
      234_827_000n,
    );
    const protocol = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList(123_456n);
    const coinSelector = new LargeFirstCoinSelector();

    const body = { ...tx.body, donation: 123_456n };
    const txWithDonation: Cardano.Tx = { ...tx, body };

    const balanced = balanceTransaction({
      unbalancedTx: txWithDonation,
      availableUtxo: resolvedInputs,
      preSelectedUtxo: undefined,
      protocolParameters: protocol,
      coinSelector,
      changeAddress: createAddress(changeAddr),
    });

    const isBalanced = isTransactionBalanced({
      transaction: balanced,
      resolvedInputs,
      protocolParameters: protocol,
    });

    expect(isBalanced).toBe(true);
  });

  it('use suggested fee if given and enough', () => {
    // Start from a tx and override fee to a high value the algorithm should accept if sufficient
    const base = newTransactionWithoutInputs(BALANCED_TX_CBOR, 15_000_000n);
    const tx: Cardano.Tx = { ...base, body: { ...base.body, fee: 5_000_000n } };

    const protocol = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList();
    const coinSelector = new LargeFirstCoinSelector();

    const balanced = balanceTransaction({
      unbalancedTx: tx,
      availableUtxo: resolvedInputs,
      preSelectedUtxo: undefined,
      protocolParameters: protocol,
      coinSelector,
      changeAddress: createAddress(changeAddr),
    });

    const isBalanced = isTransactionBalanced({
      transaction: balanced,
      resolvedInputs,
      protocolParameters: protocol,
    });
    expect(isBalanced).toBe(true);
  });

  it('can balanceTx with scripts (complex CBOR)', () => {
    const tx = newTransactionWithoutInputs(COMPLEX_TX_CBOR, 15_000_000n);
    const protocol = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList();
    const coinSelector = new LargeFirstCoinSelector();

    const balanced = balanceTransaction({
      unbalancedTx: tx,
      availableUtxo: resolvedInputs,
      preSelectedUtxo: undefined,
      protocolParameters: protocol,
      coinSelector,
      changeAddress: createAddress(changeAddr),
    });

    const isBalanced = isTransactionBalanced({
      transaction: balanced,
      resolvedInputs,
      protocolParameters: protocol,
    });
    expect(isBalanced).toBe(true);
  });
});

describe('isTransactionBalanced', () => {
  it('returns true if the transaction is balanced', () => {
    const tx = txFromCborHex(BALANCED_TX_CBOR);
    const protocolParameters = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList();

    const isBalanced = isTransactionBalanced({
      transaction: tx,
      resolvedInputs,
      protocolParameters,
    });
    expect(isBalanced).toBe(true);
  });

  it('returns true if the transaction is balanced and has deposit', () => {
    const tx0 = txFromCborHex(BALANCED_TX_CBOR);
    const tx: Cardano.Tx = {
      ...tx0,
      body: { ...tx0.body, donation: 2_000_000n },
    };

    const protocol = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList(2_000_000n);

    const isBalanced = isTransactionBalanced({
      transaction: tx,
      resolvedInputs,
      protocolParameters: protocol,
    });
    expect(isBalanced).toBe(true);
  });

  it('returns false if the transaction is not balanced', () => {
    const tx = txFromCborHex(UNBALANCED_TX_CBOR);
    const protocol = initProtocolParameters();
    const resolvedInputs = newDefaultUtxoList();

    const isBalanced = isTransactionBalanced({
      transaction: tx,
      resolvedInputs,
      protocolParameters: protocol,
    });
    expect(isBalanced).toBe(false);
  });
});

describe('empty selection fallback', () => {
  const changeAddr =
    'addr_test1qqnqfr70emn3kyywffxja44znvdw0y4aeyh0vdc3s3rky48vlp50u6nrq5s7k6h89uqrjnmr538y6e50crvz6jdv3vqqxah5fk';

  // Mock coin selector that always returns empty selection to trigger fallback
  class EmptySelectionCoinSelector implements CoinSelector {
    public select(params: CoinSelectorParams): CoinSelectorResult {
      return {
        selection: [],
        remaining: params.availableUtxo,
      };
    }
  }

  // Helper to create a UTxO with only ADA (no native assets)
  const createAdaOnlyUtxo = (
    txId: string,
    index: number,
    coins: bigint,
  ): Cardano.Utxo => {
    const address =
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;
    const txIn: Cardano.HydratedTxIn = {
      txId: txId as unknown as Cardano.TransactionId,
      index,
      address,
    };
    const txOut: Cardano.TxOut = {
      address,
      value: {
        coins,
        assets: new Map<Cardano.AssetId, bigint>(),
      },
    };
    return [txIn, txOut];
  };

  // Helper to create a UTxO with native assets
  // AssetId format: policyId (56 hex chars) + assetName (hex encoded)
  const createUtxoWithAssets = (params: {
    txId: string;
    index: number;
    coins: bigint;
    policyId: string;
    assetNameHex: string;
    assetAmount: bigint;
  }): Cardano.Utxo => {
    const address =
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;
    const txIn: Cardano.HydratedTxIn = {
      txId: params.txId as unknown as Cardano.TransactionId,
      index: params.index,
      address,
    };
    const assets = new Map<Cardano.AssetId, bigint>();
    const assetId =
      `${params.policyId}${params.assetNameHex}` as Cardano.AssetId;
    assets.set(assetId, params.assetAmount);
    const txOut: Cardano.TxOut = {
      address,
      value: {
        coins: params.coins,
        assets,
      },
    };
    return [txIn, txOut];
  };

  it('prefers ADA-only UTxO when coin selector returns empty', () => {
    // Create UTxOs: first with assets, second ADA-only
    // Policy ID: 0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882
    // Asset name "NFT-001" in hex: 4e46542d303031
    const utxoWithAssets = createUtxoWithAssets({
      txId: '027b68d4c11e97d7e065cc2702912cb1a21b6d0e56c6a74dd605889a55611385',
      index: 0,
      coins: 50_000_000n,
      policyId: '0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882',
      assetNameHex: '4e46542d303031',
      assetAmount: 1n,
    });
    const adaOnlyUtxo = createAdaOnlyUtxo(
      'd3c887d17486d483a2b46b58b01cb9344745f15fdd8f8e70a57f854cdd88a633',
      1,
      100_000_000n,
    );

    // Put the one with assets first to verify we skip it and find the ADA-only one
    const availableUtxo = [utxoWithAssets, adaOnlyUtxo];

    const tx = newTransactionWithoutInputsNoAssets(
      BALANCED_TX_CBOR,
      1_000_000n,
    );
    const protocol = initProtocolParameters();
    const coinSelector = new EmptySelectionCoinSelector();

    const balanced = balanceTransaction({
      unbalancedTx: tx,
      availableUtxo,
      preSelectedUtxo: undefined,
      protocolParameters: protocol,
      coinSelector,
      changeAddress: createAddress(changeAddr),
    });

    // Verify the ADA-only UTxO was selected (should be the second one)
    expect(balanced.body.inputs).toHaveLength(1);
    expect(balanced.body.inputs[0].txId).toBe(adaOnlyUtxo[0].txId);
    expect(balanced.body.inputs[0].index).toBe(adaOnlyUtxo[0].index);

    // Also verify the transaction is balanced
    const isBalancedResult = isTransactionBalanced({
      transaction: balanced,
      resolvedInputs: availableUtxo,
      protocolParameters: protocol,
    });
    expect(isBalancedResult).toBe(true);
  });

  it('falls back to first UTxO when no ADA-only UTxO exists', () => {
    // Create UTxOs: all with native assets
    // Policy ID: 0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882
    // Asset name "NFT-001" in hex: 4e46542d303031
    const utxoWithAssets1 = createUtxoWithAssets({
      txId: '027b68d4c11e97d7e065cc2702912cb1a21b6d0e56c6a74dd605889a55611385',
      index: 0,
      coins: 50_000_000n,
      policyId: '0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882',
      assetNameHex: '4e46542d303031',
      assetAmount: 1n,
    });
    // Policy ID: 659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82
    // Asset name "TSLB" in hex: 54534c42
    const utxoWithAssets2 = createUtxoWithAssets({
      txId: 'd3c887d17486d483a2b46b58b01cb9344745f15fdd8f8e70a57f854cdd88a633',
      index: 1,
      coins: 100_000_000n,
      policyId: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82',
      assetNameHex: '54534c42',
      assetAmount: 50n,
    });

    const availableUtxo = [utxoWithAssets1, utxoWithAssets2];

    const tx = newTransactionWithoutInputsNoAssets(
      BALANCED_TX_CBOR,
      1_000_000n,
    );
    const protocol = initProtocolParameters();
    const coinSelector = new EmptySelectionCoinSelector();

    const balanced = balanceTransaction({
      unbalancedTx: tx,
      availableUtxo,
      preSelectedUtxo: undefined,
      protocolParameters: protocol,
      coinSelector,
      changeAddress: createAddress(changeAddr),
    });

    // Verify the first UTxO was selected as fallback
    expect(balanced.body.inputs).toHaveLength(1);
    expect(balanced.body.inputs[0].txId).toBe(utxoWithAssets1[0].txId);
    expect(balanced.body.inputs[0].index).toBe(utxoWithAssets1[0].index);

    // Also verify the transaction is balanced
    const isBalancedResult = isTransactionBalanced({
      transaction: balanced,
      resolvedInputs: availableUtxo,
      protocolParameters: protocol,
    });
    expect(isBalancedResult).toBe(true);
  });
});
