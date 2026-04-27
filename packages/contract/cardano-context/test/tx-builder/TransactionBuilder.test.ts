import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { TransactionBuilder } from '../../src/tx-builder/TransactionBuilder';

const txIn = (txId: string, index: number): Cardano.TxIn => ({
  txId: txId as Cardano.TransactionId,
  index,
});

const mkUtxo = (
  idN: number,
  index: number,
  lovelace: bigint,
  addr: Cardano.PaymentAddress,
  // eslint-disable-next-line max-params
): Cardano.Utxo => [
  { ...txIn(`txid${idN}`, index), address: addr },
  { address: addr, value: { coins: lovelace } } as Cardano.TxOut,
];

const sumCoins = (outs: Cardano.TxOut[]): bigint =>
  outs.reduce((accumulator, o) => accumulator + (o.value.coins ?? 0n), 0n);

const protocolParameters = {
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  prices: { memory: 0.0577, steps: 0.0000721 },
  coinsPerUtxoByte: 4310,
  poolDeposit: 2_000_000,
  dRepDeposit: 500_000_000,
  maxTxSize: 16384,
  maxValueSize: 4096,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  minFeeRefScriptCostPerByte: '15',
} as unknown as Cardano.ProtocolParameters;

describe('TransactionBuilder', () => {
  it('builds and balances a simple ADA transfer', () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;

    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;

    const availableUtxos: Cardano.Utxo[] = [
      mkUtxo(1, 0, 3_000_000n, changeAddr),
      mkUtxo(2, 0, 4_500_000n, changeAddr),
      mkUtxo(3, 1, 9_000_000n, changeAddr),
    ];

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setNetwork(networkMagic)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(availableUtxos)
      .transferValue(recipientAddr, { coins: 5_000_000n });

    const tx = builder.build();

    const core = tx.toCore();
    const body = core.body;

    const utxoMap = new Map<string, bigint>();
    for (const [txIn, out] of availableUtxos) {
      utxoMap.set(`${txIn.txId}:${txIn.index}`, out.value.coins ?? 0n);
    }

    const inputSum = body.inputs.reduce((accumulator: bigint, index) => {
      const k = `${index.txId}:${index.index}`;
      const v = utxoMap.get(k);
      expect(v).toBeDefined();
      return accumulator + (v ?? 0n);
    }, 0n);

    const outputSum = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputSum).toBe(outputSum + fee);

    const hasRecipient = body.outputs.some(
      o => o.address === recipientAddr && (o.value.coins ?? 0n) === 5_000_000n,
    );
    expect(hasRecipient).toBe(true);

    const hasChange = body.outputs.some(o => o.address === changeAddr);
    expect(hasChange).toBe(true);
  });

  it('supports preselected input + additional selection and still balances', () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;
    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;

    const preSel = mkUtxo(10, 0, 1_000_000n, changeAddr);
    const rest: Cardano.Utxo[] = [
      mkUtxo(11, 0, 2_500_000n, changeAddr),
      mkUtxo(12, 0, 4_000_000n, changeAddr),
    ];
    const all = [preSel, ...rest];

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(all)
      .addInput(preSel)
      .transferValue(recipientAddr, { coins: 5_000_000n });

    const tx = builder.build();
    const core = tx.toCore();
    const body = core.body;

    expect(
      body.inputs.some(
        index =>
          index.txId === preSel[0].txId && index.index === preSel[0].index,
      ),
    ).toBe(true);

    const utxoMap = new Map<string, bigint>();
    for (const [txIn, out] of all) {
      utxoMap.set(`${txIn.txId}:${txIn.index}`, out.value.coins ?? 0n);
    }
    const inputSum = body.inputs.reduce(
      (accumulator: bigint, index) =>
        accumulator + (utxoMap.get(`${index.txId}:${index.index}`) ?? 0n),
      0n,
    );
    const outputSum = body.outputs.reduce(
      (accumulator, o) => accumulator + (o.value.coins ?? 0n),
      0n,
    );
    const fee = body.fee;

    expect(inputSum).toBe(outputSum + fee);

    const hasRecipient = body.outputs.some(
      (o: Cardano.TxOut) => o.address === recipientAddr,
    );
    const hasChange = body.outputs.some(
      (o: Cardano.TxOut) => o.address === changeAddr,
    );
    expect(hasRecipient).toBe(true);
    expect(hasChange).toBe(true);
  });

  it('sets memo and adds auxiliaryDataHash', () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;

    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;

    const availableUtxos: Cardano.Utxo[] = [
      mkUtxo(21, 0, 5_000_000n, changeAddr),
      mkUtxo(22, 0, 6_000_000n, changeAddr),
    ];

    const memo = 'hello from tests';

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(availableUtxos)
      .setMemo(memo)
      .transferValue(recipientAddr, { coins: 5_000_000n });

    const tx = builder.build();
    const core = tx.toCore();
    const body = core.body;

    expect(body.auxiliaryDataHash).toBeDefined();

    const coreAuxData: Cardano.AuxiliaryData = {
      blob: new Map([[674n, new Map([['msg', [memo]]])]]),
    };
    const expectedHash = Cardano.computeAuxiliaryDataHash(coreAuxData);
    expect(expectedHash).toBeDefined();
    expect(body.auxiliaryDataHash).toBe(expectedHash);

    const utxoMap = new Map<string, bigint>();
    for (const [index, out] of availableUtxos) {
      utxoMap.set(`${index.txId}:${index.index}`, out.value.coins ?? 0n);
    }
    const inputSum = body.inputs.reduce(
      (accumulator, index) =>
        accumulator + (utxoMap.get(`${index.txId}:${index.index}`) ?? 0n),
      0n,
    );
    const outputSum = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputSum).toBe(outputSum + fee);
  });

  it('balances with native assets (multi-asset output)', () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;

    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;

    const policyIdHex = 'a'.repeat(56);
    const assetNameHex = '54455354';
    const assetId = `${policyIdHex}${assetNameHex}` as Cardano.AssetId;

    const assetUtxo1: Cardano.Utxo = [
      { ...txIn('txidA1', 0), address: changeAddr },
      {
        address: changeAddr,
        value: { coins: 2_000_000n, assets: new Map([[assetId, 5n]]) },
      },
    ];
    const assetUtxo2: Cardano.Utxo = [
      { ...txIn('txidA2', 0), address: changeAddr },
      {
        address: changeAddr,
        value: { coins: 3_000_000n, assets: new Map([[assetId, 2n]]) },
      },
    ];
    const adaOnly: Cardano.Utxo = mkUtxo(33, 1, 4_000_000n, changeAddr);

    const availableUtxos: Cardano.Utxo[] = [assetUtxo1, assetUtxo2, adaOnly];

    const targetAssets = new Map<Cardano.AssetId, bigint>([[assetId, 6n]]);

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(availableUtxos)
      .transferValue(recipientAddr, {
        coins: 3_000_000n,
        assets: targetAssets,
      });

    const tx = builder.build();
    const core = tx.toCore();
    const body = core.body;

    const recipient = body.outputs.find(o => o.address === recipientAddr);
    expect(recipient).toBeDefined();
    const sentAssetsQty = recipient?.value.assets?.get(assetId) ?? 0n;
    expect(sentAssetsQty).toBeGreaterThanOrEqual(6n);

    const usedTxKeys = new Set(
      body.inputs.map(index => `${index.txId}:${index.index}`),
    );
    expect(usedTxKeys.has('txidA1:0')).toBe(true);
    expect(usedTxKeys.has('txidA2:0')).toBe(true);

    const utxoAdaMap = new Map<string, bigint>([
      [
        `${assetUtxo1[0].txId}:${assetUtxo1[0].index}`,
        assetUtxo1[1].value.coins ?? 0n,
      ],
      [
        `${assetUtxo2[0].txId}:${assetUtxo2[0].index}`,
        assetUtxo2[1].value.coins ?? 0n,
      ],
      [`${adaOnly[0].txId}:${adaOnly[0].index}`, adaOnly[1].value.coins ?? 0n],
    ]);

    const inputAda = body.inputs.reduce(
      (accumulator, index) =>
        accumulator + (utxoAdaMap.get(`${index.txId}:${index.index}`) ?? 0n),
      0n,
    );
    const outputAda = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputAda).toBe(outputAda + fee);
  });

  it('balances with rewards withdrawal', () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;

    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;
    const rewardAccount = Cardano.RewardAccount(
      'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
    );

    const adaOnly: Cardano.Utxo = mkUtxo(33, 1, 10_000_000n, changeAddr);
    const withdrawalAmount = 1_000_000n;
    const availableUtxos: Cardano.Utxo[] = [adaOnly];

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(availableUtxos)
      .addRewardsWithdrawal(rewardAccount, withdrawalAmount)
      .transferValue(recipientAddr, {
        coins: 3_000_000n,
      });

    const tx = builder.build();
    const core = tx.toCore();
    const body = core.body;

    const recipient = body.outputs.find(o => o.address === recipientAddr);
    expect(recipient).toBeDefined();

    const inputAda = availableUtxos[0][1].value.coins;
    const outputAda = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputAda + withdrawalAmount).toBe(outputAda + fee);
  });

  it('balancing does not require additional utxos if explicitly set enough via addInput AND does not require explicit outputs', () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;

    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const rewardAccount = Cardano.RewardAccount(
      'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
    );

    const adaOnly: Cardano.Utxo = mkUtxo(33, 1, 10_000_000n, changeAddr);
    const withdrawalAmount = 1_000_000n;
    const availableUtxos: Cardano.Utxo[] = [adaOnly];

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .addInput(adaOnly)
      .addRewardsWithdrawal(rewardAccount, withdrawalAmount);

    const tx = builder.build();
    const core = tx.toCore();
    const body = core.body;

    const inputAda = availableUtxos[0][1].value.coins;
    const outputAda = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputAda + withdrawalAmount).toBe(outputAda + fee);
  });
});
