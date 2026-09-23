import { Cardano, Serialization } from '@cardano-sdk/core';
import { minFee } from '@cardano-sdk/tx-construction';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it, vi } from 'vitest';

import {
  InputSelectionError,
  InputSelectionFailure,
} from '../../src/input-selection/InputSelectionError';
import { LargeFirstCoinSelector } from '../../src/input-selection/LargeFirstCoinSelector';
import { RoundRobinRandomCoinSelector } from '../../src/input-selection/RoundRobinRandomCoinSelector';
import { getUniqueSignerKeyHashes } from '../../src/signing/getUniqueSigners';
import {
  InsufficientCollateralError,
  TransactionBuilder,
} from '../../src/tx-builder/TransactionBuilder';

import type * as Crypto from '@cardano-sdk/crypto';
import type { TxEvaluator } from '@cardano-sdk/tx-construction';

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
  stakeKeyDeposit: 2_000_000,
  dRepDeposit: 500_000_000,
  maxTxSize: 16384,
  maxValueSize: 4096,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  minFeeRefScriptCostPerByte: '15',
} as unknown as Cardano.ProtocolParameters;

/**
 * Prices `tx` **as signed**, measured rather than derived: dummy vkey witnesses
 * of the real width (32-byte key + 64-byte signature) are attached, then
 * `minFee` prices the serialized result.
 *
 * Deliberately avoids `computeVkWitnessesCost` — a test that priced witnesses
 * with the formula under test would pass however wrong that formula became.
 *
 * NOTE this is a *serializer-measured* (wire) figure, one byte over the
 * ledger's own fee-size: the ledger prices via `toCBORForSizeComputation`,
 * which drops the `isValid` byte the wire encoding carries. Mainnet tx
 * `fa0dc78af838de7c202b9a36bd10e47424a2ba6950aa3099ec16db954fdacd24` confirmed
 * exactly there (chain `tx_size` 4515 vs 4516 wire bytes; `fee` 519911 = the
 * minimum for 4515). Callers therefore pin the one-byte delta rather than
 * assert an inequality.
 *
 * @returns The signer count (so callers can pin it) and the measured fee.
 */
const measureSignedMinFee = (
  tx: Serialization.Transaction,
  resolvedInputs: Cardano.Utxo[],
): { requiredFee: bigint; signerCount: number } => {
  const core = tx.toCore();
  const signerCount = getUniqueSignerKeyHashes(core, resolvedInputs).size;
  const signatures: Cardano.Signatures = new Map();
  for (let index = 0; index < signerCount; index++) {
    signatures.set(
      index.toString(16).padStart(64, '0') as Crypto.Ed25519PublicKeyHex,
      'f'.repeat(128) as Crypto.Ed25519SignatureHex,
    );
  }
  return {
    requiredFee: minFee(
      { ...core, witness: { ...core.witness, signatures } },
      resolvedInputs,
      protocolParameters,
    ),
    signerCount,
  };
};

describe('TransactionBuilder', () => {
  it('builds and balances a simple ADA transfer', async () => {
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

    const tx = await builder.build();

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

  // Guards `computeVkWitnessesCost` against drifting from the serializer. Every
  // other fee test prices with the same formula the builder uses, so a wrong
  // formula keeps them all green; this one measures instead.
  it('prices the signed tx within one byte of a serializer-measured minimum', async () => {
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

    const tx = await new TransactionBuilder(networkMagic, protocolParameters)
      .setNetwork(networkMagic)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(availableUtxos)
      .transferValue(recipientAddr, { coins: 5_000_000n })
      .build();

    const { requiredFee, signerCount } = measureSignedMinFee(
      tx,
      availableUtxos,
    );
    // All inputs sit at one address, so one witness. Pinned because an
    // under-counted signer would hide an under-funded fee.
    expect(signerCount).toBe(1);
    // The estimate sits exactly one byte under the measured figure: the formula
    // omits the witness-set map key, and the ledger's fee-size omits `isValid`
    // (see measureSignedMinFee) — two per-tx off-by-ones that cancel, landing
    // the estimate on the ledger minimum at any signer count. Any change to the
    // witness framing, the formula, or the encoder moves this delta and fails
    // here — which is the drift this test exists to catch.
    expect(requiredFee - tx.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  it('supports preselected input + additional selection and still balances', async () => {
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

    const tx = await builder.build();
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

  it('sets memo and adds auxiliaryDataHash', async () => {
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

    const tx = await builder.build();
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

  it('balances with native assets (multi-asset output)', async () => {
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

    const tx = await builder.build();
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

  it('balances with rewards withdrawal', async () => {
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

    const tx = await builder.build();
    const core = tx.toCore();
    const body = core.body;

    const recipient = body.outputs.find(o => o.address === recipientAddr);
    expect(recipient).toBeDefined();

    const inputAda = availableUtxos[0][1].value.coins;
    const outputAda = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputAda + withdrawalAmount).toBe(outputAda + fee);
  });

  it('includes vote delegation certificate in built transaction', async () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;

    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const rewardAccount = Cardano.RewardAccount(
      'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
    );
    const stakeCredential: Cardano.Credential = {
      type: Cardano.CredentialType.KeyHash,
      hash: Cardano.RewardAccount.toHash(rewardAccount),
    };
    const dRep: Cardano.DelegateRepresentative = {
      __typename: 'AlwaysAbstain',
    };

    const adaOnly: Cardano.Utxo = mkUtxo(40, 0, 10_000_000n, changeAddr);

    const paramsWithDeposits = {
      ...protocolParameters,
      stakeKeyDeposit: 2_000_000,
    } as unknown as Cardano.ProtocolParameters;

    const builder = new TransactionBuilder(networkMagic, paramsWithDeposits)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([adaOnly])
      .addVoteDelegationCertificate(stakeCredential, dRep);

    const tx = await builder.build();
    const core = tx.toCore();
    const body = core.body;

    expect(body.certificates).toBeDefined();
    expect(body.certificates).toHaveLength(1);

    const cert = body.certificates![0] as Cardano.VoteDelegationCertificate;
    expect(cert.__typename).toBe(Cardano.CertificateType.VoteDelegation);
    expect(cert.stakeCredential).toEqual(stakeCredential);
    expect(cert.dRep).toEqual(dRep);

    // Transaction still balances
    const utxoMap = new Map<string, bigint>();
    for (const [txIn, out] of [adaOnly]) {
      utxoMap.set(`${txIn.txId}:${txIn.index}`, out.value.coins ?? 0n);
    }
    const inputSum = body.inputs.reduce(
      (accumulator: bigint, index) =>
        accumulator + (utxoMap.get(`${index.txId}:${index.index}`) ?? 0n),
      0n,
    );
    const outputSum = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputSum).toBe(outputSum + fee);
  });

  it('adds VoteRegistrationDelegation certificate with deposit', async () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;
    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const stakeCredential: Cardano.Credential = {
      type: Cardano.CredentialType.KeyHash,
      hash: 'df3c57e80cb3d2e09a2fdde4e0dec9e21b6baf0f87f9c47a1b91c4e' as unknown as Cardano.Credential['hash'],
    };
    const dRep: Cardano.DelegateRepresentative = {
      __typename: 'AlwaysNoConfidence',
    };
    const deposit = 2_000_000n;

    const availableUtxos: Cardano.Utxo[] = [
      mkUtxo(42, 0, 15_000_000n, changeAddr),
    ];

    const tx = await new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(availableUtxos)
      .addVoteRegistrationDelegationCertificate(dRep, stakeCredential, deposit)
      .build();
    const core = tx.toCore();

    expect(core.body.certificates).toHaveLength(1);
    const cert = core.body.certificates![0];
    expect(cert.__typename).toBe(
      Cardano.CertificateType.VoteRegistrationDelegation,
    );
    if (
      cert.__typename === Cardano.CertificateType.VoteRegistrationDelegation
    ) {
      expect(cert.dRep).toEqual({ __typename: 'AlwaysNoConfidence' });
      expect(cert.stakeCredential).toBe(stakeCredential);
      expect(cert.deposit).toBe(deposit);
    }
  });

  it('balancing does not require additional utxos if explicitly set enough via addInput AND does not require explicit outputs', async () => {
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

    const tx = await builder.build();
    const core = tx.toCore();
    const body = core.body;

    const inputAda = availableUtxos[0][1].value.coins;
    const outputAda = sumCoins(body.outputs);
    const fee: bigint = body.fee;

    expect(inputAda + withdrawalAmount).toBe(outputAda + fee);
  });

  it('merges setMetadata entries with setMemo and overwrites same-label entries', async () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;
    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;
    const availableUtxos: Cardano.Utxo[] = [
      mkUtxo(31, 0, 5_000_000n, changeAddr),
      mkUtxo(32, 0, 6_000_000n, changeAddr),
    ];
    const memo = 'memo content';

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(availableUtxos)
      .setMetadata(123n, 'overwritten')
      .setMetadata(123n, 'final')
      .setMetadata(456n, 42n)
      .setMemo(memo)
      .transferValue(recipientAddr, { coins: 5_000_000n });

    const tx = await builder.build();
    const body = tx.toCore().body;

    expect(body.auxiliaryDataHash).toBeDefined();
    const expectedHash = Cardano.computeAuxiliaryDataHash({
      blob: new Map<bigint, Cardano.Metadatum>([
        [123n, 'final'],
        [456n, 42n],
        [674n, new Map([['msg', [memo]]])],
      ]),
    });
    expect(body.auxiliaryDataHash).toBe(expectedHash);
  });

  it('builds identical transactions across runs with a fixed-seed RoundRobinRandomCoinSelector', async () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;
    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;

    const buildOnce = async () => {
      const tx = await new TransactionBuilder(networkMagic, protocolParameters)
        .setChangeAddress(changeAddr)
        .setUnspentOutputs([
          mkUtxo(1, 0, 3_000_000n, changeAddr),
          mkUtxo(2, 0, 4_500_000n, changeAddr),
          mkUtxo(3, 1, 9_000_000n, changeAddr),
        ])
        .useCoinSelector(new RoundRobinRandomCoinSelector({ seed: 7n }))
        .transferValue(recipientAddr, { coins: 5_000_000n })
        .build();
      return tx.toCbor();
    };

    expect(await buildOnce()).toEqual(await buildOnce());
  });

  it('annotates the error as a fallback failure when the default selectors cannot cover the target', async () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;
    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([mkUtxo(50, 0, 1_000_000n, changeAddr)])
      .transferValue(recipientAddr, { coins: 5_000_000n });

    const caught: unknown = await builder
      .build()
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(InputSelectionError);
    expect((caught as InputSelectionError).failure).toBe(
      InputSelectionFailure.BalanceInsufficient,
    );
    expect((caught as Error).message).toMatch(/fallback coin selector/);
  });

  it('skips the fallback retry when Large-First is supplied as the primary selector', async () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;
    const changeAddr =
      'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
    const recipientAddr =
      'addr_test1xrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shs4p04xh' as Cardano.PaymentAddress;

    const selector = new LargeFirstCoinSelector();
    const selectSpy = vi.spyOn(selector, 'select');

    const builder = new TransactionBuilder(networkMagic, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([mkUtxo(51, 0, 1_000_000n, changeAddr)])
      .useCoinSelector(selector)
      .transferValue(recipientAddr, { coins: 5_000_000n });

    const caught: unknown = await builder
      .build()
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(InputSelectionError);
    expect((caught as Error).message).not.toMatch(/fallback/);
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });
});

describe('TransactionBuilder Plutus support', () => {
  const changeAddr =
    'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
  const otherKeyAddr =
    'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95' as Cardano.PaymentAddress;

  const dummyScript = {
    __type: Cardano.ScriptType.Plutus,
    version: Cardano.PlutusLanguageVersion.V3,
    bytes: 'deadbeef',
  } as unknown as Cardano.Script;

  const unitDatum: Cardano.PlutusData = Serialization.PlutusData.fromCbor(
    HexBlob('d87980'),
  ).toCore();

  const costModels: Cardano.CostModels = new Map([
    [Cardano.PlutusLanguageVersion.V3, Array.from({ length: 251 }, () => 0)],
  ]);

  const scriptInputUtxo: Cardano.Utxo = mkUtxo(0, 0, 20_000_000n, changeAddr);
  const collateralUtxo: Cardano.Utxo = mkUtxo(200, 0, 10_000_000n, changeAddr);
  const collateralUtxoOtherAddr: Cardano.Utxo = mkUtxo(
    200,
    0,
    10_000_000n,
    otherKeyAddr,
  );

  // The builder's collateral coverage target, recomputed from the params
  // (maxSizeFee + maxScriptFee priced over the per-tx-max seed ex-units) so the
  // knife-edge cases below track the params instead of a magic number.
  const SEED_MEMORY = 14_000_000;
  const SEED_STEPS = 10_000_000_000;
  const coverageTarget =
    ((BigInt(protocolParameters.minFeeConstant) +
      BigInt(protocolParameters.minFeeCoefficient) *
        BigInt(protocolParameters.maxTxSize) +
      BigInt(
        Math.ceil(
          protocolParameters.prices.memory * SEED_MEMORY +
            protocolParameters.prices.steps * SEED_STEPS,
        ),
      )) *
      BigInt(protocolParameters.collateralPercentage) +
      99n) /
    100n;

  // Sized from the checked-in mainnet dust-mapping validator (its blob is 3207
  // bytes CBOR-wrapped; production attaches the 3204 unwrapped bytes into this
  // same field). `dummyScript` is 4 bytes, which keeps a tx well under the
  // ~1691-byte cliff where the first pricing pass' collateral remainder drops
  // below a return's min-ADA.
  const realSizedScript = {
    __type: Cardano.ScriptType.Plutus,
    version: Cardano.PlutusLanguageVersion.V3,
    bytes: 'ab'.repeat(3207),
  } as unknown as Cardano.Script;

  const makeEvaluator = (budget: Cardano.ExUnits): TxEvaluator => ({
    evaluate: async tx =>
      (tx.witness.redeemers ?? []).map(r => ({
        purpose: r.purpose,
        index: r.index,
        budget,
      })),
  });

  const makeResolver = (...utxos: Cardano.Utxo[]): Cardano.InputResolver => ({
    resolveInput: async input => {
      const u = utxos.find(
        u => u[0].txId === input.txId && u[0].index === input.index,
      );
      return u?.[1] ?? null;
    },
  });

  const buildPlutusScriptTx = async (
    collateral: Cardano.Utxo,
    returnAddr: Cardano.PaymentAddress,
    budget: Cardano.ExUnits = { memory: 100, steps: 100_000 },
  ) =>
    new TransactionBuilder(Cardano.NetworkMagics.Preprod, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInputUtxo, { redeemer: unitDatum })
      .attachScript(dummyScript)
      .setCollateralUtxos([collateral])
      .setCollateralChangeAddress(returnAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator(budget),
        inputResolver: makeResolver(scriptInputUtxo),
      })
      .build();

  // The designation fee path. `correctFeeAfterEvaluation` walks the fee down to
  // exact equality with its own computed minimum, so there is no headroom to
  // absorb an estimate that drifts from the serializer. Measured, not derived.
  it('prices the signed tx within one byte of a serializer-measured minimum after fee correction', async () => {
    const tx = await buildPlutusScriptTx(collateralUtxo, changeAddr);

    const { requiredFee, signerCount } = measureSignedMinFee(tx, [
      scriptInputUtxo,
      collateralUtxo,
    ]);
    // Script input + collateral share one address → one witness.
    expect(signerCount).toBe(1);
    expect(requiredFee - tx.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  it('keeps the one-byte gap fixed when collateral adds a second signer', async () => {
    const tx = await buildPlutusScriptTx(collateralUtxoOtherAddr, changeAddr);

    const { requiredFee, signerCount } = measureSignedMinFee(tx, [
      scriptInputUtxo,
      collateralUtxoOtherAddr,
    ]);
    // A distinct collateral address means a second witness. The gap stays ONE
    // byte rather than doubling, which locates it in the witness-set framing
    // (emitted once) and not in the per-witness 101-byte term.
    expect(signerCount).toBe(2);
    expect(requiredFee - tx.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  it('sets totalCollateral and collateralReturn proportional to fee', async () => {
    const tx = await buildPlutusScriptTx(collateralUtxo, changeAddr);
    const body = tx.toCore().body;
    const fee = body.fee;
    const expectedCollateral = (fee * 150n + 99n) / 100n;

    expect(body.collaterals).toHaveLength(1);
    expect(body.collaterals![0].txId).toBe(collateralUtxo[0].txId);
    expect(body.totalCollateral).toBe(expectedCollateral);
    expect(body.collateralReturn).toBeDefined();
    expect(body.collateralReturn!.value.coins).toBe(
      collateralUtxo[1].value.coins - expectedCollateral,
    );
  });

  it('throws InsufficientCollateralError when the pool cannot fund collateral', async () => {
    const tinyCollateral = mkUtxo(201, 0, 100_000n, changeAddr);
    await expect(
      buildPlutusScriptTx(tinyCollateral, changeAddr),
    ).rejects.toThrow(InsufficientCollateralError);
  });

  it('combines multiple collateral UTxOs largest-first to cover the required amount', async () => {
    const part1 = mkUtxo(202, 0, 3_000_000n, changeAddr);
    const part2 = mkUtxo(203, 0, 3_000_000n, changeAddr);

    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInputUtxo, { redeemer: unitDatum })
      .attachScript(dummyScript)
      .setCollateralUtxos([part1, part2])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(scriptInputUtxo),
      })
      .build();
    const body = tx.toCore().body;
    const expectedCollateral = (body.fee * 150n + 99n) / 100n;

    expect(body.collaterals).toHaveLength(2);
    expect(body.totalCollateral).toBe(expectedCollateral);
    expect(body.collateralReturn!.value.coins).toBe(
      6_000_000n - expectedCollateral,
    );
  });

  it('sizes collateral selection to the fee-derived requirement, not the fallback', async () => {
    // Fees high enough that ceil(fee * collateralPercentage / 100) exceeds the
    // 5 ADA fallback, so a selection seeded at the fallback would reserve too
    // few of the fragmented 4 ADA UTxOs and fail on the larger requirement.
    const highFeeParams = {
      ...protocolParameters,
      minFeeConstant: 5_000_000,
    } as unknown as Cardano.ProtocolParameters;
    const bigScriptInput = mkUtxo(300, 0, 40_000_000n, changeAddr);
    const collateralParts = [
      mkUtxo(301, 0, 4_000_000n, changeAddr),
      mkUtxo(302, 0, 4_000_000n, changeAddr),
      mkUtxo(303, 0, 4_000_000n, changeAddr),
    ];

    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      highFeeParams,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(bigScriptInput, { redeemer: unitDatum })
      .attachScript(dummyScript)
      .setCollateralUtxos(collateralParts)
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(bigScriptInput),
      })
      .build();

    const body = tx.toCore().body;
    const requiredCollateral = (body.fee * 150n + 99n) / 100n;

    expect(requiredCollateral).toBeGreaterThan(5_000_000n);
    expect(body.collaterals).toHaveLength(3);
    expect(body.totalCollateral).toBe(requiredCollateral);
    expect(body.collateralReturn!.value.coins).toBe(
      12_000_000n - requiredCollateral,
    );
  });

  it('corrects fee downward when evaluated ex-units are less than seed', async () => {
    const seedBudget: Cardano.ExUnits = {
      memory: 14_000_000,
      steps: 10_000_000_000,
    };
    const smallBudget: Cardano.ExUnits = { memory: 100, steps: 100_000 };

    const txSeed = await buildPlutusScriptTx(
      collateralUtxo,
      changeAddr,
      seedBudget,
    );
    const txSmall = await buildPlutusScriptTx(
      collateralUtxo,
      changeAddr,
      smallBudget,
    );

    expect(txSmall.toCore().body.fee).toBeLessThan(txSeed.toCore().body.fee);
  });

  // Regression (LW-15113): collateral summing to exactly the coverage target
  // seeds NO collateral-return (returnCoin === 0), so the balancer prices a
  // body without one; but the smaller fee-derived collateral emits a return at
  // finalisation. Pricing the fee over the stale seed body left the shipped tx
  // ~66 bytes (one minFeeCoefficient per byte) under-priced → Conway rejected
  // it with FeeTooSmallUTxO. The fee must instead be priced over the return it
  // ships, so it must equal a build whose seed already carried the return.
  it('does not under-price the fee when finalisation adds a collateral-return the seed omitted', async () => {
    // Collateral == the coverage target → seed reserves it whole
    // (returnCoin === 0, no seed return).
    const knifeEdgeCollateral = mkUtxo(210, 0, coverageTarget, changeAddr);
    const txKnifeEdge = await buildPlutusScriptTx(
      knifeEdgeCollateral,
      changeAddr,
    );
    // 10 ADA > coverage target → seed already carries a collateral-return.
    const txWithSeedReturn = await buildPlutusScriptTx(
      collateralUtxo,
      changeAddr,
    );

    const knifeEdgeBody = txKnifeEdge.toCore().body;
    // The shipped tx carries the fee-derived collateral-return...
    expect(knifeEdgeBody.collateralReturn).toBeDefined();
    // ...and its fee matches the build whose seed already priced one (same body
    // size). Under the stale-body pricing this was short by one coefficient×66.
    expect(knifeEdgeBody.fee).toBe(txWithSeedReturn.toCore().body.fee);
  });

  // A 1-lovelace shortfall must be rejected by selection, not silently rounded
  // into a pick the ledger under-funds. Turns the one direction the knife-edge
  // case above could drift in (a coverage target that creeps up) into a loud
  // failure instead of a quietly-passing test.
  it('rejects collateral one lovelace short of the coverage target', async () => {
    const shortCollateral = mkUtxo(213, 0, coverageTarget - 1n, changeAddr);
    await expect(
      buildPlutusScriptTx(shortCollateral, changeAddr),
    ).rejects.toThrow(InsufficientCollateralError);
  });

  // Regression (LW-15113): the knife-edge case above only survives because a
  // 4-byte script keeps the tx tiny. The binding failure is at the FIRST
  // pricing pass, whose fee still carries the max seed ex-units — so its
  // collateral remainder is only
  // `minFeeCoefficient * collateralPercentage% * (maxTxSize - txSize)`
  // (66 lovelace/byte here). Past a ~1691-byte tx that falls under a return
  // output's min-ADA, and a real validator's inline bytes put every designation
  // tx (~3.5 KB) well past it — so once the exact-cover branch is entered it
  // ALWAYS failed. Over-declaring is legal (the ledger only checks
  // `totalCollateral == inputs - return`), so the dust is absorbed instead.
  it('absorbs a sub-min-ADA collateral remainder into totalCollateral with a real-sized script', async () => {
    const knifeEdgeCollateral = mkUtxo(214, 0, coverageTarget, changeAddr);
    const scriptInput = mkUtxo(215, 0, 20_000_000n, changeAddr);

    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInput, { redeemer: unitDatum })
      .attachScript(realSizedScript)
      .setCollateralUtxos([knifeEdgeCollateral])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(scriptInput),
      })
      .build();

    const body = tx.toCore().body;

    // Past the cliff, so the case is the one the fix targets.
    expect(tx.toCbor().length / 2).toBeGreaterThan(1691);
    expect(body.collaterals).toHaveLength(1);
    // No return at all — the only shape a dust remainder can legally take.
    expect(body.collateralReturn).toBeUndefined();
    expect(body.totalCollateral).toBe(coverageTarget);
    // Over-declared, but never under the ledger's ceil(fee * pct / 100).
    expect(body.totalCollateral!).toBeGreaterThanOrEqual(
      (body.fee * BigInt(protocolParameters.collateralPercentage) + 99n) / 100n,
    );
  });

  // Regression (LW-15113): the collateral coverage target is the true max fee
  // (size + script), not a blunt 5-ADA floor. A ~5-ADA UTxO covers the target
  // with a valid return, so ONLY it is reserved and the second candidate is
  // left alone. The old floor rejected the larger UTxO's tiny over-floor
  // remainder (below a return's min-ADA) and grabbed BOTH, starving funding on
  // tight cNIGHT accounts (designate/stop "UTxO pool exhausted").
  // Pins sizing only: the funding pool is empty here, so the reserved-UTxO
  // exclusion from funding (LW-15307) is not exercised by this case.
  it('reserves only the one collateral UTxO that covers the fee-derived target, not both candidates', async () => {
    const big = mkUtxo(220, 0, 5_015_476n, changeAddr);
    const small = mkUtxo(221, 0, 3_400_000n, changeAddr);
    const scriptInput = mkUtxo(222, 0, 20_000_000n, changeAddr);

    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInput, { redeemer: unitDatum })
      .attachScript(dummyScript)
      .setCollateralUtxos([big, small])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(scriptInput),
      })
      .build();

    const body = tx.toCore().body;
    // Only the larger UTxO is reserved (old 5-ADA floor would grab both).
    expect(body.collaterals).toHaveLength(1);
    expect(body.collaterals?.[0].txId).toBe(big[0].txId);
  });

  // Regression (LW-15113): two script inputs => two spend redeemers. Under the
  // old per-redeemer seeding (each at the full per-tx max) the balancer priced
  // the fee for 2x the impossible maximum ex-units (~+1.5 ADA), over-reserving
  // inputs so a pool sized for a real (1x-max-bounded) fee failed to balance —
  // the cNIGHT update/deregister failure on tight accounts. Capping the total
  // seed at the per-tx max keeps the 2-redeemer tx affordable here. Inputs
  // (3 ADA) cover the capped ~1.75-ADA seed fee but NOT the old ~3.27-ADA one,
  // and the empty spend pool cannot top up, so the old seeding threw.
  it('caps total seed ex-units at the per-tx max so a multi-redeemer tx is affordable on a tight pool', async () => {
    const scriptInputA = mkUtxo(210, 0, 1_500_000n, changeAddr);
    const scriptInputB = mkUtxo(211, 0, 1_500_000n, changeAddr);
    const collateral = mkUtxo(212, 0, 10_000_000n, changeAddr);

    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInputA, { redeemer: unitDatum })
      .addInput(scriptInputB, { redeemer: unitDatum })
      .attachScript(dummyScript)
      .setCollateralUtxos([collateral])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(scriptInputA, scriptInputB),
      })
      .build();

    const spendRedeemers = (tx.toCore().witness.redeemers ?? []).filter(
      redeemer => redeemer.purpose === Cardano.RedeemerPurpose.spend,
    );
    expect(spendRedeemers).toHaveLength(2);
  });

  it('accounts for collateral signer when collateral is at a distinct address', async () => {
    const txSameAddr = await buildPlutusScriptTx(collateralUtxo, changeAddr);
    const txOtherAddr = await buildPlutusScriptTx(
      collateralUtxoOtherAddr,
      changeAddr,
    );

    expect(txOtherAddr.toCore().body.fee).toBeGreaterThan(
      txSameAddr.toCore().body.fee,
    );
  });
});
