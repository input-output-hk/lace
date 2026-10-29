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
import { EvaluatedFeeShortfallError } from '../../src/tx-builder/balancing';
import { computeConwayScriptDataHash } from '../../src/tx-builder/script-data-hash';
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

  // Regression (LW-15307): pre-fix this threw InputSelectionError — "Failed to
  // balance transaction with fallback coin selector: UTxO pool exhausted while
  // funding the minimum UTxO value of the change outputs".
  it('funds the tx from a UTxO that also backs collateral instead of starving the pool', async () => {
    const forcedInput = mkUtxo(210, 0, 2_000_000n, changeAddr);
    const soleCover = mkUtxo(211, 0, 242_000_000n, changeAddr);

    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([soleCover])
      .setCollateralUtxos([soleCover])
      .setCollateralChangeAddress(changeAddr)
      .addInput(forcedInput, { redeemer: unitDatum })
      .attachScript(dummyScript)
      .transferValue(otherKeyAddr, { coins: 1_500_000n })
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(forcedInput, soleCover),
      })
      .build();

    const body = tx.toCore().body;

    const isSoleCover = (ref: Cardano.TxIn): boolean =>
      ref.txId === soleCover[0].txId && ref.index === soleCover[0].index;
    expect(body.inputs.some(isSoleCover)).toBe(true);
    expect(body.collaterals!.some(isSoleCover)).toBe(true);

    const resolved = new Map<string, bigint>(
      [forcedInput, soleCover].map(([ref, out]) => [
        `${ref.txId}:${ref.index}`,
        out.value.coins ?? 0n,
      ]),
    );
    const inputSum = body.inputs.reduce(
      (total, ref) => total + (resolved.get(`${ref.txId}:${ref.index}`) ?? 0n),
      0n,
    );
    expect(inputSum).toBe(sumCoins(body.outputs) + body.fee);

    // Asserted independently of the input checks above: the collateral fields
    // must still describe the phase-2 branch even though the UTxO is an input.
    expect(body.totalCollateral).toBe((body.fee * 150n + 99n) / 100n);
    expect(body.collateralReturn!.value.coins).toBe(
      (soleCover[1].value.coins ?? 0n) - body.totalCollateral!,
    );
  });

  it.each([true, false])(
    'spends dedicated collateral only when also offered for funding: %s',
    async overlap => {
      const dedicated: Cardano.Utxo = [
        {
          txId: Cardano.TransactionId('fc'.repeat(32)),
          index: 0,
          address: otherKeyAddr,
        },
        { address: otherKeyAddr, value: { coins: 100_000_000n } },
      ];
      const ordinary: Cardano.Utxo = [
        {
          txId: Cardano.TransactionId('fd'.repeat(32)),
          index: 0,
          address: changeAddr,
        },
        { address: changeAddr, value: { coins: 50_000_000n } },
      ];
      const forced: Cardano.Utxo = [
        {
          txId: Cardano.TransactionId('fe'.repeat(32)),
          index: 0,
          address: changeAddr,
        },
        { address: changeAddr, value: { coins: 2_000_000n } },
      ];

      const tx = await new TransactionBuilder(
        Cardano.NetworkMagics.Preprod,
        protocolParameters,
      )
        .setChangeAddress(changeAddr)
        .useCoinSelector(new LargeFirstCoinSelector())
        .setUnspentOutputs(overlap ? [dedicated, ordinary] : [ordinary])
        .addInput(forced, { redeemer: unitDatum })
        .attachScript(dummyScript)
        .transferValue(otherKeyAddr, { coins: 5_000_000n })
        .setCollateralUtxos([dedicated])
        .setCollateralChangeAddress(otherKeyAddr)
        .setPlutusContext({
          costModels,
          inputResolver: makeResolver(dedicated, ordinary, forced),
          txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        })
        .build();
      const body = tx.toCore().body;

      expect(body.inputs.some(input => input.txId === dedicated[0].txId)).toBe(
        overlap,
      );
      expect(body.inputs.some(input => input.txId === ordinary[0].txId)).toBe(
        !overlap,
      );
      expect(body.collaterals).toEqual([{ txId: dedicated[0].txId, index: 0 }]);
      expect(sumCoins(body.outputs) + body.fee).toBe(
        forced[1].value.coins + (overlap ? dedicated : ordinary)[1].value.coins,
      );
    },
  );

  // The min-ADA return must be sized against the fee-derived amount actually
  // declared, not the coverage target — that target is only an upper bound, so
  // sizing against it refuses a ~1 ADA band of pools that build fine. Keyed to
  // collateralPercentage 0 so the target is the stable 5 ADA constant rather
  // than a param-derived figure.
  it('accepts an ADA-only collateral pool whose remainder cannot fund a return', async () => {
    const justOverTarget = mkUtxo(230, 0, 5_000_001n, changeAddr);

    const tx = await new TransactionBuilder(Cardano.NetworkMagics.Preprod, {
      ...protocolParameters,
      collateralPercentage: 0,
    } as unknown as Cardano.ProtocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInputUtxo, { redeemer: unitDatum })
      .attachScript(dummyScript)
      .setCollateralUtxos([justOverTarget])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(scriptInputUtxo),
      })
      .build();

    const body = tx.toCore().body;
    // The dust lovelace is absorbed rather than shipped as its own output:
    // totalCollateral declares the whole reservation and there is no return.
    expect(body.totalCollateral).toBe(5_000_001n);
    expect(body.collateralReturn).toBeUndefined();
  });

  // The other half of the same rule, kept: native assets can leave the
  // collateral inputs ONLY through the return output, so an asset-carrying
  // pick whose remainder cannot meet min-ADA has no escape and must throw.
  it('still refuses an asset-carrying collateral pool whose return cannot meet min-ADA', async () => {
    const assetId = Cardano.AssetId(`${'ab'.repeat(28)}746f6b`);
    const withAssets: Cardano.Utxo = [
      { ...mkUtxo(231, 0, 5_000_001n, changeAddr)[0] },
      {
        address: changeAddr,
        value: { coins: 5_000_001n, assets: new Map([[assetId, 1n]]) },
      } as Cardano.TxOut,
    ];

    await expect(
      new TransactionBuilder(Cardano.NetworkMagics.Preprod, {
        ...protocolParameters,
        collateralPercentage: 0,
      } as unknown as Cardano.ProtocolParameters)
        .setChangeAddress(changeAddr)
        .setUnspentOutputs([])
        .addInput(scriptInputUtxo, { redeemer: unitDatum })
        .attachScript(dummyScript)
        .setCollateralUtxos([withAssets])
        .setCollateralChangeAddress(changeAddr)
        .setPlutusContext({
          costModels,
          txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
          inputResolver: makeResolver(scriptInputUtxo),
        })
        .build(),
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

  // A real validator's inline bytes are what carry the tx past the ~1691-byte
  // point where the seed pass' leftover falls under min-ADA; a 4-byte script
  // never reaches the absorb branch. Declaring the whole reservation instead of
  // the corrected shape would hand the extra to a phase-2 failure.
  it('ships the fee-derived collateral shape when the seed pass had to absorb the remainder', async () => {
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
    const required =
      (body.fee * BigInt(protocolParameters.collateralPercentage) + 99n) / 100n;

    // Past the cliff, so the seed pass really did take the absorb branch.
    expect(tx.toCbor().length / 2).toBeGreaterThan(1691);
    expect(body.collaterals).toHaveLength(1);
    expect(body.totalCollateral).toBe(required);
    expect(body.collateralReturn?.value.coins).toBe(coverageTarget - required);
  });

  // At `collateralPercentage: 0` the amount is pinned to the flat 5 ADA fallback,
  // so no lower fee can grow the remainder into a returnable one.
  it('still absorbs a sub-min-ADA remainder when the collateral amount is fee-invariant', async () => {
    const collateral = mkUtxo(218, 0, 5_100_000n, changeAddr);
    const scriptInput = mkUtxo(219, 0, 20_000_000n, changeAddr);

    const tx = await new TransactionBuilder(Cardano.NetworkMagics.Preprod, {
      ...protocolParameters,
      collateralPercentage: 0,
    })
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInput, { redeemer: unitDatum })
      .attachScript(realSizedScript)
      .setCollateralUtxos([collateral])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(scriptInput),
      })
      .build();

    const body = tx.toCore().body;

    expect(body.collateralReturn).toBeUndefined();
    expect(body.totalCollateral).toBe(5_100_000n);
  });

  // The shape cannot imply the fee: reading the flip as non-convergence still
  // ships a valid body, just one priced with the per-tx-max seed ex-units —
  // ~1.5 ADA of script budget the evaluated tx never spends.
  it('corrects the fee to its own body minimum when the collateral shape flips mid-correction', async () => {
    const flipCollateral = mkUtxo(216, 0, coverageTarget, changeAddr);
    const scriptInput = mkUtxo(217, 0, 20_000_000n, changeAddr);

    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .addInput(scriptInput, { redeemer: unitDatum })
      .attachScript(realSizedScript)
      .setCollateralUtxos([flipCollateral])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(scriptInput),
      })
      .build();

    const { requiredFee, signerCount } = measureSignedMinFee(tx, [
      scriptInput,
      flipCollateral,
    ]);

    expect(signerCount).toBe(1);
    expect(requiredFee - tx.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  // Collateral never goes through the resolver: the builder pairs the reserved
  // UTxOs it selected with the resolved inputs itself.
  const buildRealSizedTx = async (
    collateral: Cardano.Utxo[],
    scriptInputs: Cardano.Utxo[],
  ) => {
    const builder = new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([])
      .attachScript(realSizedScript)
      .setCollateralUtxos(collateral)
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: makeEvaluator({ memory: 100, steps: 100_000 }),
        inputResolver: makeResolver(...scriptInputs),
      });
    for (const input of scriptInputs) {
      builder.addInput(input, { redeemer: unitDatum });
    }
    return builder.build();
  };

  // The seed pass ships no return while its own leftover stays under a return's
  // min-ADA — a span above the target, not a single point, so the cases walk it
  // rather than pinning one reservation inside it.
  it.each([
    ['exactly the coverage target', 0n],
    ['mid-way through the absorb span', 59_000n],
    ['above the absorb span', 118_020n],
  ])(
    'prices the fee to its own body minimum with collateral %s',
    async (_label, excess) => {
      const collateral = mkUtxo(230, 0, coverageTarget + excess, changeAddr);
      const scriptInput = mkUtxo(231, 0, 20_000_000n, changeAddr);

      const tx = await buildRealSizedTx([collateral], [scriptInput]);
      const { requiredFee } = measureSignedMinFee(tx, [
        scriptInput,
        collateral,
      ]);

      expect(requiredFee - tx.toCore().body.fee).toBe(
        BigInt(protocolParameters.minFeeCoefficient),
      );
    },
  );

  // `update` and `deregister` are the two-redeemer flows. The per-tx seed budget
  // is split across redeemers rather than added up, so a second one changes the
  // body without changing the saving.
  it('corrects the fee over a body carrying two redeemers', async () => {
    const collateral = mkUtxo(232, 0, coverageTarget, changeAddr);
    const first = mkUtxo(233, 0, 20_000_000n, changeAddr);
    const second = mkUtxo(234, 0, 20_000_000n, changeAddr);

    const tx = await buildRealSizedTx([collateral], [first, second]);
    const { requiredFee } = measureSignedMinFee(tx, [
      first,
      second,
      collateral,
    ]);

    expect(tx.toCore().witness.redeemers).toHaveLength(2);
    expect(requiredFee - tx.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  // No collateral involvement here: refunding the saving carries the change coin
  // over a CBOR width boundary instead. Pins the correction at the cause rather
  // than at one of its triggers.
  it('corrects the fee when the refunded saving widens the change coin encoding', async () => {
    const scriptInput = mkUtxo(235, 0, 4_295_967_295n, changeAddr);

    const tx = await buildRealSizedTx([collateralUtxo], [scriptInput]);
    const { requiredFee } = measureSignedMinFee(tx, [
      scriptInput,
      collateralUtxo,
    ]);

    expect(sumCoins(tx.toCore().body.outputs)).toBeGreaterThan(0xff_ff_ff_ff);
    expect(requiredFee - tx.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
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

  describe('with a reference input', () => {
    // 30,000 script bytes are 30,005 bytes of tagged CBOR, past the first
    // 25,600-byte tier: 25,600 bytes at 15 lovelace plus 4,405 at 18.
    const referenceScript = {
      __type: Cardano.ScriptType.Plutus,
      version: Cardano.PlutusLanguageVersion.V3,
      bytes: 'cd'.repeat(30_000),
    } as unknown as Cardano.Script;
    const referenceScriptFee = 25_600n * 15n + 4_405n * 18n;
    // At another key address, so a witness it wrongly added would show.
    const referenceUtxo: Cardano.Utxo = [
      {
        txId: Cardano.TransactionId('cd'.repeat(32)),
        index: 1,
        address: otherKeyAddr,
      },
      {
        address: otherKeyAddr,
        value: { coins: 50_000_000n },
        scriptReference: referenceScript,
      },
    ];
    const coverageWithReference =
      ((BigInt(protocolParameters.minFeeConstant) +
        BigInt(protocolParameters.minFeeCoefficient) *
          BigInt(protocolParameters.maxTxSize) +
        BigInt(
          Math.ceil(
            protocolParameters.prices.memory * SEED_MEMORY +
              protocolParameters.prices.steps * SEED_STEPS,
          ),
        ) +
        referenceScriptFee) *
        BigInt(protocolParameters.collateralPercentage) +
        99n) /
      100n;

    const buildReferencingTx = async (
      collateral: Cardano.Utxo,
      txEvaluator: TxEvaluator = makeEvaluator({ memory: 100, steps: 100_000 }),
    ) =>
      new TransactionBuilder(Cardano.NetworkMagics.Preprod, protocolParameters)
        .setChangeAddress(changeAddr)
        .setUnspentOutputs([])
        .addInput(scriptInputUtxo, { redeemer: unitDatum })
        .addReferenceInput(referenceUtxo)
        .attachScript(dummyScript)
        .setCollateralUtxos([collateral])
        .setCollateralChangeAddress(changeAddr)
        .setPlutusContext({
          costModels,
          txEvaluator,
          // Knows only the spent input: the builder resolves the reference.
          inputResolver: makeResolver(scriptInputUtxo),
        })
        .build();

    it('gives the evaluator the reference input and prices its script in the signed fee', async () => {
      const evaluate = vi.fn(
        makeEvaluator({ memory: 100, steps: 100_000 }).evaluate,
      );

      const tx = await buildReferencingTx(collateralUtxo, { evaluate });

      expect(tx.toCore().body.referenceInputs).toEqual([
        { txId: referenceUtxo[0].txId, index: 1 },
      ]);
      expect(evaluate.mock.calls[0][1]).toEqual([
        scriptInputUtxo,
        referenceUtxo,
      ]);
      const { requiredFee, signerCount } = measureSignedMinFee(tx, [
        scriptInputUtxo,
        collateralUtxo,
        referenceUtxo,
      ]);
      expect(signerCount).toBe(1);
      expect(requiredFee - tx.toCore().body.fee).toBe(
        BigInt(protocolParameters.minFeeCoefficient),
      );
    });

    it('reserves collateral that covers the reference script fee', async () => {
      const tx = await buildReferencingTx(
        mkUtxo(230, 0, coverageWithReference, changeAddr),
      );
      expect(tx.toCore().body.collaterals).toHaveLength(1);

      await expect(
        buildReferencingTx(
          mkUtxo(231, 0, coverageWithReference - 1n, changeAddr),
        ),
      ).rejects.toThrow(InsufficientCollateralError);
    });
  });

  describe('with an execution-units estimate', () => {
    const estimate: Cardano.ExUnits = { memory: 1_000_000, steps: 500_000_000 };
    const coverageAtEstimate =
      ((BigInt(protocolParameters.minFeeConstant) +
        BigInt(protocolParameters.minFeeCoefficient) *
          BigInt(protocolParameters.maxTxSize) +
        BigInt(
          Math.ceil(
            protocolParameters.prices.memory * estimate.memory +
              protocolParameters.prices.steps * estimate.steps,
          ),
        )) *
        BigInt(protocolParameters.collateralPercentage) +
        99n) /
      100n;

    const buildEstimatedTx = async ({
      inputs = [scriptInputUtxo],
      collateral = collateralUtxo,
      collateralUtxos = [collateral],
      budget = { memory: 100, steps: 100_000 },
      executionUnitsEstimate = estimate,
    }: {
      inputs?: Cardano.Utxo[];
      collateral?: Cardano.Utxo;
      collateralUtxos?: Cardano.Utxo[];
      budget?: Cardano.ExUnits;
      executionUnitsEstimate?: Cardano.ExUnits;
    } = {}) => {
      const builder = new TransactionBuilder(
        Cardano.NetworkMagics.Preprod,
        protocolParameters,
      )
        .setChangeAddress(changeAddr)
        .setUnspentOutputs([]);
      for (const input of inputs) {
        builder.addInput(input, { redeemer: unitDatum });
      }
      return builder
        .attachScript(dummyScript)
        .setCollateralUtxos(collateralUtxos)
        .setCollateralChangeAddress(changeAddr)
        .setPlutusContext({
          costModels,
          txEvaluator: makeEvaluator(budget),
          inputResolver: makeResolver(...inputs),
          executionUnitsEstimate,
        })
        .build();
    };

    it('rejects estimated collateral whose seeded remainder cannot fund a return', async () => {
      const collateral: Cardano.Utxo = [
        {
          txId: Cardano.TransactionId('fa'.repeat(32)),
          index: 0,
          address: changeAddr,
        },
        { address: changeAddr, value: { coins: coverageAtEstimate + 59_000n } },
      ];

      await expect(
        buildEstimatedTx({ collateral, budget: estimate }),
      ).rejects.toThrow(InsufficientCollateralError);
    });

    it('adds collateral to price the return when evaluation matches the estimate', async () => {
      const collateralUtxos: Cardano.Utxo[] = [
        [
          {
            txId: Cardano.TransactionId('fa'.repeat(32)),
            index: 0,
            address: changeAddr,
          },
          {
            address: changeAddr,
            value: { coins: coverageAtEstimate + 59_000n },
          },
        ],
        [
          {
            txId: Cardano.TransactionId('fb'.repeat(32)),
            index: 0,
            address: changeAddr,
          },
          { address: changeAddr, value: { coins: 1_100_000n } },
        ],
      ];
      const input: Cardano.Utxo = [
        {
          txId: Cardano.TransactionId('fc'.repeat(32)),
          index: 0,
          address: changeAddr,
        },
        { address: changeAddr, value: { coins: 20_000_000n } },
      ];

      const tx = await buildEstimatedTx({
        inputs: [input],
        collateralUtxos,
        budget: estimate,
      });
      const body = tx.toCore().body;

      expect(body.collaterals).toHaveLength(2);
      expect(body.collateralReturn).toBeDefined();
      expect(sumCoins(body.outputs) + body.fee).toBe(input[1].value.coins);
      expect(
        measureSignedMinFee(tx, [input, ...collateralUtxos]).requiredFee -
          body.fee,
      ).toBe(BigInt(protocolParameters.minFeeCoefficient));
    });

    it('ships the same transaction as a build priced at the per-transaction maximum', async () => {
      const estimated = await buildEstimatedTx();
      const unestimated = await buildPlutusScriptTx(collateralUtxo, changeAddr);
      expect(estimated.toCbor()).toBe(unestimated.toCbor());
    });

    it('balances inputs that cannot pay the fee the per-transaction maximum prices', async () => {
      const smallInput = mkUtxo(240, 0, 2_000_000n, changeAddr);
      await expect(
        buildEstimatedTx({
          inputs: [smallInput],
          executionUnitsEstimate: { memory: SEED_MEMORY, steps: SEED_STEPS },
        }),
      ).rejects.toThrow(InputSelectionError);

      const tx = await buildEstimatedTx({ inputs: [smallInput] });
      const { outputs, fee } = tx.toCore().body;
      expect(sumCoins(outputs) + fee).toBe(2_000_000n);
    });

    it('reserves collateral for the fee the estimate prices', async () => {
      const tx = await buildEstimatedTx({
        collateral: mkUtxo(241, 0, coverageAtEstimate, changeAddr),
      });
      expect(tx.toCore().body.collaterals).toHaveLength(1);

      await expect(
        buildEstimatedTx({
          collateral: mkUtxo(242, 0, coverageAtEstimate - 1n, changeAddr),
        }),
      ).rejects.toThrow(InsufficientCollateralError);
    });

    it('prices the estimate as the total of every redeemer, and refuses an evaluation that needs more fee', async () => {
      const inputs = [
        mkUtxo(243, 0, 10_000_000n, changeAddr),
        mkUtxo(244, 0, 10_000_000n, changeAddr),
      ];
      const share = { memory: estimate.memory / 2, steps: estimate.steps / 2 };
      const tx = await buildEstimatedTx({ inputs, budget: share });
      expect(
        tx
          .toCore()
          .witness.redeemers?.map(({ executionUnits }) => executionUnits),
      ).toEqual([share, share]);

      const above = { ...share, memory: share.memory + 100_000 };
      const failure = await buildEstimatedTx({ inputs, budget: above }).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(EvaluatedFeeShortfallError);
      const shortfall = failure as EvaluatedFeeShortfallError;
      expect(shortfall.requiredFee).toBeGreaterThan(shortfall.balancedFee);
      expect(
        shortfall.evaluatedRedeemers.map(
          ({ executionUnits }) => executionUnits,
        ),
      ).toEqual([above, above]);
    });
  });
});

describe('TransactionBuilder reference inputs', () => {
  const changeAddr =
    'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
  const otherKeyAddr =
    'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95' as Cardano.PaymentAddress;
  const referenceTxId = Cardano.TransactionId('cd'.repeat(32));
  const v3Script = (bytes: string): Cardano.Script =>
    ({
      __type: Cardano.ScriptType.Plutus,
      version: Cardano.PlutusLanguageVersion.V3,
      bytes,
    } as unknown as Cardano.Script);
  const referenceAt = (
    address: Cardano.PaymentAddress,
    scriptReference?: Cardano.Script,
  ): Cardano.Utxo => [
    { txId: referenceTxId, index: 1, address },
    {
      address,
      value: { coins: 30_000_000n },
      ...(scriptReference && { scriptReference }),
    },
  ];
  const funding = mkUtxo(500, 0, 10_000_000n, changeAddr);

  const transferReferencing = async (
    reference: Cardano.Utxo,
    available: Cardano.Utxo[] = [funding],
  ) =>
    new TransactionBuilder(Cardano.NetworkMagics.Preprod, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs(available)
      .useCoinSelector(new LargeFirstCoinSelector())
      .addReferenceInput(reference)
      .transferValue(otherKeyAddr, { coins: 2_000_000n })
      .build();

  it('lists the reference input in the body, apart from the spent inputs, and prices the signed tx exactly', async () => {
    const reference = referenceAt(otherKeyAddr);

    const tx = await transferReferencing(reference);

    const { body } = tx.toCore();
    expect(body.referenceInputs).toEqual([{ txId: referenceTxId, index: 1 }]);
    expect(body.inputs).toEqual([{ txId: funding[0].txId, index: 0 }]);
    const { requiredFee, signerCount } = measureSignedMinFee(tx, [
      funding,
      reference,
    ]);
    // A reference input needs no witness, even at another key address.
    expect(signerCount).toBe(1);
    expect(requiredFee - body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  it('never selects a referenced UTxO to fund the transaction', async () => {
    // Large-First would pick the larger referenced UTxO first.
    const reference = referenceAt(changeAddr);

    const tx = await transferReferencing(reference, [reference, funding]);

    expect(tx.toCore().body.inputs).toEqual([
      { txId: funding[0].txId, index: 0 },
    ]);
  });

  it('prices a reference script it carries at minFeeRefScriptCostPerByte', async () => {
    // 1,000 script bytes are 1,005 bytes of tagged CBOR.
    const reference = referenceAt(otherKeyAddr, v3Script('ab'.repeat(1000)));

    const withScript = await transferReferencing(reference);
    const withoutScript = await transferReferencing(referenceAt(otherKeyAddr));

    expect(withScript.toCore().body.fee - withoutScript.toCore().body.fee).toBe(
      1005n * 15n,
    );
    const { requiredFee } = measureSignedMinFee(withScript, [
      funding,
      reference,
    ]);
    expect(requiredFee - withScript.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  it('refuses to reference an input twice, to reference a spent input, or to spend a referenced one', () => {
    const reference = referenceAt(changeAddr);
    const builder = () =>
      new TransactionBuilder(Cardano.NetworkMagics.Preprod, protocolParameters);

    expect(() =>
      builder().addReferenceInput(reference).addReferenceInput(reference),
    ).toThrow(`Cannot add duplicate reference input: ${referenceTxId}#1`);
    expect(() =>
      builder().addInput(reference).addReferenceInput(reference),
    ).toThrow(
      `Cannot reference an input the transaction spends: ${referenceTxId}#1`,
    );
    expect(() =>
      builder().addReferenceInput(reference).addInput(reference),
    ).toThrow(
      `Cannot spend an input the transaction references: ${referenceTxId}#1`,
    );
  });

  it('refuses to build when a reference input carries a script the witness set attaches', async () => {
    const script = v3Script('deadbeef');

    await expect(
      new TransactionBuilder(Cardano.NetworkMagics.Preprod, protocolParameters)
        .setChangeAddress(changeAddr)
        .setUnspentOutputs([funding])
        .addReferenceInput(referenceAt(otherKeyAddr, script))
        .attachScript(script)
        .setPlutusContext({
          costModels: new Map(),
          txEvaluator: { evaluate: async () => [] },
          inputResolver: { resolveInput: async () => null },
        })
        .build(),
    ).rejects.toThrow(
      `Reference input ${referenceTxId}#1 carries attached script ${Serialization.Script.fromCore(
        script,
      ).hash()}`,
    );
  });
});

describe('TransactionBuilder certificate redeemers', () => {
  const changeAddr =
    'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
  const poolId = Cardano.PoolId(
    'pool1ev8vy6fyj7693ergzty2t0azjvw35tvkt2vcjwpgajqs7z6u2vn',
  );
  const keyCredential: Cardano.Credential = {
    type: Cardano.CredentialType.KeyHash,
    hash: Cardano.RewardAccount.toHash(
      Cardano.RewardAccount(
        'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
      ),
    ),
  };
  const stakeScript = {
    __type: Cardano.ScriptType.Plutus,
    version: Cardano.PlutusLanguageVersion.V3,
    bytes: 'deadbeef',
  } as unknown as Cardano.Script;
  const stakeScriptHash = Serialization.Script.fromCore(stakeScript).hash();
  const scriptCredential: Cardano.Credential = {
    type: Cardano.CredentialType.ScriptHash,
    hash: stakeScriptHash,
  };
  const scriptRewardAccount = Cardano.RewardAccount.fromCredential(
    scriptCredential,
    Cardano.NetworkId.Testnet,
  );
  const unitRedeemer = Serialization.PlutusData.fromCbor(
    HexBlob('d87980'),
  ).toCore();
  const operateRedeemer = Serialization.PlutusData.fromCbor(
    HexBlob('d87a80'),
  ).toCore();
  const costModels: Cardano.CostModels = new Map([
    [Cardano.PlutusLanguageVersion.V3, Array.from({ length: 251 }, () => 0)],
  ]);
  const deposit = BigInt(protocolParameters.stakeKeyDeposit);

  const fundingUtxo = mkUtxo(400, 0, 20_000_000n, changeAddr);
  const scriptInputUtxo = mkUtxo(401, 0, 5_000_000n, changeAddr);
  const collateralUtxo = mkUtxo(402, 0, 10_000_000n, changeAddr);

  // Distinct per purpose and index, so a budget handed to the wrong redeemer
  // shows up as a mismatch.
  const budgetFor = (
    purpose: Cardano.RedeemerPurpose,
    index: number,
  ): Cardano.ExUnits => {
    const purposeCode = Object.values(Cardano.RedeemerPurpose).indexOf(purpose);
    return {
      memory: 10_000 * (purposeCode + 1) + index,
      steps: 1_000_000 * (purposeCode + 1) + index,
    };
  };

  const evaluator: TxEvaluator = {
    evaluate: async tx =>
      (tx.witness.redeemers ?? []).map(({ purpose, index }) => ({
        purpose,
        index,
        budget: budgetFor(purpose, index),
      })),
  };

  const resolver: Cardano.InputResolver = {
    resolveInput: async input =>
      [fundingUtxo, scriptInputUtxo, collateralUtxo].find(
        ([txIn]) => txIn.txId === input.txId && txIn.index === input.index,
      )?.[1] ?? null,
  };

  const scriptBuilder = (txEvaluator: TxEvaluator = evaluator) =>
    new TransactionBuilder(Cardano.NetworkMagics.Preprod, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([fundingUtxo])
      .useCoinSelector(new LargeFirstCoinSelector())
      .attachScript(stakeScript)
      .setCollateralUtxos([collateralUtxo])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({ costModels, txEvaluator, inputResolver: resolver });

  const redeemersOf = (
    tx: Serialization.Transaction,
    purpose: Cardano.RedeemerPurpose,
  ): Cardano.Redeemer[] =>
    (tx.toCore().witness.redeemers ?? []).filter(
      redeemer => redeemer.purpose === purpose,
    );

  it('indexes certificate redeemers by position among all certificates, key certificates included', async () => {
    const tx = await scriptBuilder()
      .addNewStakeAddressCertificate(keyCredential, deposit)
      .addStakeDelegationCertificate(poolId, keyCredential)
      .addNewStakeAddressCertificate(scriptCredential, deposit, {
        redeemer: operateRedeemer,
      })
      .addStakeDelegationCertificate(poolId, scriptCredential, {
        redeemer: unitRedeemer,
      })
      .build();

    const { body } = tx.toCore();
    expect(body.certificates?.map(({ __typename }) => __typename)).toEqual([
      Cardano.CertificateType.Registration,
      Cardano.CertificateType.StakeDelegation,
      Cardano.CertificateType.Registration,
      Cardano.CertificateType.StakeDelegation,
    ]);
    expect(body.certificates?.[2]).toEqual({
      __typename: Cardano.CertificateType.Registration,
      stakeCredential: scriptCredential,
      deposit,
    });
    expect(redeemersOf(tx, Cardano.RedeemerPurpose.certificate)).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.certificate,
        index: 2,
        data: operateRedeemer,
        executionUnits: budgetFor(Cardano.RedeemerPurpose.certificate, 2),
      },
      {
        purpose: Cardano.RedeemerPurpose.certificate,
        index: 3,
        data: unitRedeemer,
        executionUnits: budgetFor(Cardano.RedeemerPurpose.certificate, 3),
      },
    ]);

    // Both registration deposits leave the inputs.
    const inputCoins = body.inputs.reduce(
      (total, input) =>
        total +
        ([fundingUtxo].find(([txIn]) => txIn.txId === input.txId)?.[1].value
          .coins ?? 0n),
      0n,
    );
    expect(inputCoins).toBe(sumCoins(body.outputs) + body.fee + 2n * deposit);
  });

  it('indexes certificate redeemers alongside spend, mint and withdrawal redeemers and hashes them all', async () => {
    const mintedAsset = Cardano.AssetId(`${stakeScriptHash}0a`);
    const evaluate = vi.fn(evaluator.evaluate);

    const tx = await scriptBuilder({ evaluate })
      .addInput(scriptInputUtxo, { redeemer: unitRedeemer })
      .mintAssets(new Map([[mintedAsset, 1n]]), unitRedeemer)
      .addStakeDelegationCertificate(poolId, keyCredential)
      .addStakeDelegationCertificate(poolId, scriptCredential, {
        redeemer: operateRedeemer,
      })
      .addScriptWithdrawal(scriptRewardAccount, 0n, unitRedeemer)
      .build();

    const core = tx.toCore();
    const sortedInputs = [...core.body.inputs].sort((a, b) =>
      a.txId === b.txId ? a.index - b.index : a.txId < b.txId ? -1 : 1,
    );
    const spendIndex = sortedInputs.findIndex(
      ({ txId }) => txId === scriptInputUtxo[0].txId,
    );
    const redeemerKeys = (core.witness.redeemers ?? []).map(
      ({ purpose, index, executionUnits }) => ({
        purpose,
        index,
        executionUnits,
      }),
    );
    expect(redeemerKeys).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.spend,
        index: spendIndex,
        executionUnits: budgetFor(Cardano.RedeemerPurpose.spend, spendIndex),
      },
      {
        purpose: Cardano.RedeemerPurpose.mint,
        index: 0,
        executionUnits: budgetFor(Cardano.RedeemerPurpose.mint, 0),
      },
      {
        purpose: Cardano.RedeemerPurpose.certificate,
        index: 1,
        executionUnits: budgetFor(Cardano.RedeemerPurpose.certificate, 1),
      },
      {
        purpose: Cardano.RedeemerPurpose.withdrawal,
        index: 0,
        executionUnits: budgetFor(Cardano.RedeemerPurpose.withdrawal, 0),
      },
    ]);
    expect(
      evaluate.mock.calls[0][0].witness.redeemers?.find(
        ({ purpose }) => purpose === Cardano.RedeemerPurpose.certificate,
      )?.index,
    ).toBe(1);
    expect(core.body.scriptIntegrityHash).toBe(
      computeConwayScriptDataHash({
        costModels,
        usedLanguages: [Cardano.PlutusLanguageVersion.V3],
        redeemers: core.witness.redeemers ?? [],
        datums: undefined,
      }),
    );
  });

  it('adds no vkey signer for a script stake credential and prices the signed tx exactly', async () => {
    const tx = await scriptBuilder()
      .addNewStakeAddressCertificate(scriptCredential, deposit, {
        redeemer: operateRedeemer,
      })
      .addStakeDelegationCertificate(poolId, scriptCredential, {
        redeemer: operateRedeemer,
      })
      .build();

    const resolvedInputs = [fundingUtxo, collateralUtxo];
    expect([...getUniqueSignerKeyHashes(tx.toCore(), resolvedInputs)]).toEqual([
      Cardano.Address.fromBech32(changeAddr).asBase()!.getPaymentCredential()
        .hash,
    ]);
    const { requiredFee, signerCount } = measureSignedMinFee(
      tx,
      resolvedInputs,
    );
    expect(signerCount).toBe(1);
    expect(requiredFee - tx.toCore().body.fee).toBe(
      BigInt(protocolParameters.minFeeCoefficient),
    );
  });

  it('fails the build when the evaluator returns no budget for a certificate redeemer', async () => {
    const skipsCertificates: TxEvaluator = {
      evaluate: async (tx, resolvedInputs) =>
        (await evaluator.evaluate(tx, resolvedInputs)).filter(
          ({ purpose }) => purpose !== Cardano.RedeemerPurpose.certificate,
        ),
    };

    await expect(
      scriptBuilder(skipsCertificates)
        .addStakeDelegationCertificate(poolId, keyCredential)
        .addStakeDelegationCertificate(poolId, scriptCredential, {
          redeemer: operateRedeemer,
        })
        .build(),
    ).rejects.toThrow('No ex-units evaluation for redeemer certificate#1');
  });

  it('refuses a certificate redeemer for a key-hash stake credential', () => {
    const builder = scriptBuilder();

    expect(() =>
      builder.addNewStakeAddressCertificate(keyCredential, deposit, {
        redeemer: operateRedeemer,
      }),
    ).toThrow(/script-hash stake credential/);
    expect(() =>
      builder.addStakeDelegationCertificate(poolId, keyCredential, {
        redeemer: operateRedeemer,
      }),
    ).toThrow(/script-hash stake credential/);
  });

  it('refuses to build a certificate redeemer without a Plutus script attached or referenced', async () => {
    const withoutScript = new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([fundingUtxo])
      .useCoinSelector(new LargeFirstCoinSelector())
      .setCollateralUtxos([collateralUtxo])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: evaluator,
        inputResolver: resolver,
      });

    await expect(
      withoutScript
        .addStakeDelegationCertificate(poolId, keyCredential)
        .addStakeDelegationCertificate(poolId, scriptCredential, {
          redeemer: operateRedeemer,
        })
        .build(),
    ).rejects.toThrow('Certificate redeemer requires a Plutus script');
  });

  // Pinned bytes: any builder change that alters transactions built without
  // certificate redeemers fails here.
  it('builds byte-identical transactions when no certificate carries a redeemer', async () => {
    const utxoAt = (n: number, coins: bigint): Cardano.Utxo => [
      {
        txId: Cardano.TransactionId(n.toString(16).padStart(64, '0')),
        index: 0,
        address: changeAddr,
      },
      { address: changeAddr, value: { coins } },
    ];

    const keyTx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([utxoAt(1, 10_000_000n), utxoAt(2, 7_000_000n)])
      .useCoinSelector(new LargeFirstCoinSelector())
      .addNewStakeAddressCertificate(keyCredential, deposit)
      .addStakeDelegationCertificate(poolId, keyCredential)
      .build();
    expect(keyTx.toCbor()).toBe(
      '84a400d9010281825820000000000000000000000000000000000000000000000000000000000000000100018182583900537ba48a023f0a3c65e54977ffc2d78c143fb418ef6db058e006d78a7c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa81a0077689f021a0002a96104d901028283078200581c7c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa81a001e848083028200581c7c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa8581ccb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810fa0f5f6',
    );

    const scriptInput = utxoAt(3, 20_000_000n);
    const collateral = utxoAt(4, 10_000_000n);
    const funding = utxoAt(5, 9_000_000n);
    const plutusTx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([funding])
      .useCoinSelector(new LargeFirstCoinSelector())
      .addInput(scriptInput, { redeemer: unitRedeemer })
      .attachScript(stakeScript)
      .mintAssets(
        new Map([[Cardano.AssetId(`${stakeScriptHash}0a`), 1n]]),
        unitRedeemer,
      )
      .addScriptWithdrawal(scriptRewardAccount, 0n, unitRedeemer)
      .addStakeDelegationCertificate(poolId, keyCredential)
      .setCollateralUtxos([collateral])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator: {
          evaluate: async tx =>
            (tx.witness.redeemers ?? []).map(({ purpose, index }) => ({
              purpose,
              index,
              budget: { memory: 1000 + index, steps: 100_000 + index },
            })),
        },
        inputResolver: {
          resolveInput: async input =>
            [scriptInput, collateral, funding].find(
              ([txIn]) =>
                txIn.txId === input.txId && txIn.index === input.index,
            )?.[1] ?? null,
        },
      })
      .build();
    expect(plutusTx.toCbor()).toBe(
      '84aa00d9010281825820000000000000000000000000000000000000000000000000000000000000000300018182583900537ba48a023f0a3c65e54977ffc2d78c143fb418ef6db058e006d78a7c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa8821a012e5398a1581c2c492f3f2c90a40274051772c1008e60d9cde2ef84a8a37dbbddf8a9a1410a01021a0002d96804d901028183028200581c7c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa8581ccb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810f05a1581df02c492f3f2c90a40274051772c1008e60d9cde2ef84a8a37dbbddf8a90009a1581c2c492f3f2c90a40274051772c1008e60d9cde2ef84a8a37dbbddf8a9a1410a010b58209fee82565b1376e5038cc63cb1df524797659b03dbf9537d51cd0f6cdba8a2060dd90102818258200000000000000000000000000000000000000000000000000000000000000004001082583900537ba48a023f0a3c65e54977ffc2d78c143fb418ef6db058e006d78a7c16240714ea0e12b41a914f2945784ac494bb19573f0ca61a08afa81a00945064111a0004461ca205a382000082d87980821903e81a000186a082010082d87980821903e81a000186a082030082d87980821903e81a000186a007d901028144deadbeeff5f6',
    );
  });
});

describe('TransactionBuilder scripts read from reference inputs', () => {
  const changeAddr =
    'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
  const otherKeyAddr =
    'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95' as Cardano.PaymentAddress;
  const plutusScript = (
    version: Cardano.PlutusLanguageVersion,
    bytes: string,
  ): Cardano.Script =>
    ({
      __type: Cardano.ScriptType.Plutus,
      version,
      bytes,
    } as unknown as Cardano.Script);
  const runScript = plutusScript(Cardano.PlutusLanguageVersion.V3, 'deadbeef');
  const runScriptHash = Serialization.Script.fromCore(runScript).hash();
  const idleScript = plutusScript(Cardano.PlutusLanguageVersion.V2, 'cafe');
  const costModels: Cardano.CostModels = new Map([
    [Cardano.PlutusLanguageVersion.V2, Array.from({ length: 175 }, () => 0)],
    [Cardano.PlutusLanguageVersion.V3, Array.from({ length: 251 }, () => 0)],
  ]);
  const unitRedeemer = Serialization.PlutusData.fromCbor(
    HexBlob('d87980'),
  ).toCore();
  const rewardAccount = Cardano.RewardAccount.fromCredential(
    { type: Cardano.CredentialType.ScriptHash, hash: runScriptHash },
    Cardano.NetworkId.Testnet,
  );
  const scriptAddress = Cardano.EnterpriseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    { type: Cardano.CredentialType.ScriptHash, hash: runScriptHash },
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;
  const parked = (script: Cardano.Script, index: number): Cardano.Utxo => [
    {
      txId: Cardano.TransactionId('ef'.repeat(32)),
      index,
      address: otherKeyAddr,
    },
    {
      address: otherKeyAddr,
      value: { coins: 20_000_000n },
      scriptReference: script,
    },
  ];
  const funding = mkUtxo(600, 0, 20_000_000n, changeAddr);
  const collateral = mkUtxo(601, 0, 10_000_000n, changeAddr);
  const scriptInput = mkUtxo(602, 0, 5_000_000n, scriptAddress);
  const budget = { memory: 1000, steps: 100_000 };
  const evaluator: TxEvaluator = {
    evaluate: async tx =>
      (tx.witness.redeemers ?? []).map(({ purpose, index }) => ({
        purpose,
        index,
        budget,
      })),
  };

  const builder = (txEvaluator: TxEvaluator = evaluator) =>
    new TransactionBuilder(Cardano.NetworkMagics.Preprod, protocolParameters)
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([funding])
      .useCoinSelector(new LargeFirstCoinSelector())
      .setCollateralUtxos([collateral])
      .setCollateralChangeAddress(changeAddr)
      .setPlutusContext({
        costModels,
        txEvaluator,
        inputResolver: {
          resolveInput: async input =>
            [funding, collateral, scriptInput].find(
              ([txIn]) =>
                txIn.txId === input.txId && txIn.index === input.index,
            )?.[1] ?? null,
        },
      });

  const hashOver = (
    tx: Serialization.Transaction,
    usedLanguages: Cardano.PlutusLanguageVersion[],
  ) =>
    computeConwayScriptDataHash({
      costModels,
      usedLanguages,
      redeemers: tx.toCore().witness.redeemers ?? [],
      datums: undefined,
    });

  it('runs a withdrawal on a script a reference input carries, attaching none', async () => {
    const evaluate = vi.fn(evaluator.evaluate);

    const tx = await builder({ evaluate })
      .addReferenceInput(parked(runScript, 0))
      .addScriptWithdrawal(rewardAccount, 0n, unitRedeemer)
      .build();

    const core = tx.toCore();
    expect(core.witness.scripts).toBeUndefined();
    expect(core.witness.redeemers).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.withdrawal,
        index: 0,
        data: unitRedeemer,
        executionUnits: budget,
      },
    ]);
    expect(evaluate.mock.calls[0][1]).toEqual(
      expect.arrayContaining([parked(runScript, 0)]),
    );
    expect(core.body.scriptIntegrityHash).toBe(
      hashOver(tx, [Cardano.PlutusLanguageVersion.V3]),
    );
    expect(core.body.collaterals).toEqual([
      { txId: collateral[0].txId, index: collateral[0].index },
    ]);
  });

  it('spends an input at a script address with the script a reference input carries', async () => {
    const tx = await builder()
      .addInput(scriptInput, { redeemer: unitRedeemer })
      .addReferenceInput(parked(runScript, 0))
      .build();

    const core = tx.toCore();
    expect(core.witness.scripts).toBeUndefined();
    expect(core.witness.redeemers?.map(({ purpose }) => purpose)).toEqual([
      Cardano.RedeemerPurpose.spend,
    ]);
    expect(core.body.scriptIntegrityHash).toBe(
      hashOver(tx, [Cardano.PlutusLanguageVersion.V3]),
    );
  });

  it('leaves out of the script data hash the language of a referenced script no redeemer runs', async () => {
    const tx = await builder()
      .addReferenceInput(parked(runScript, 0))
      .addReferenceInput(parked(idleScript, 1))
      .addScriptWithdrawal(rewardAccount, 0n, unitRedeemer)
      .build();

    const { scriptIntegrityHash } = tx.toCore().body;
    expect(scriptIntegrityHash).toBe(
      hashOver(tx, [Cardano.PlutusLanguageVersion.V3]),
    );
    expect(scriptIntegrityHash).not.toBe(
      hashOver(tx, [
        Cardano.PlutusLanguageVersion.V2,
        Cardano.PlutusLanguageVersion.V3,
      ]),
    );
  });

  it('needs no Plutus context for a referenced script that no redeemer runs', async () => {
    const tx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(changeAddr)
      .setUnspentOutputs([funding])
      .useCoinSelector(new LargeFirstCoinSelector())
      .addReferenceInput(parked(runScript, 0))
      .transferValue(otherKeyAddr, { coins: 2_000_000n })
      .build();

    expect(tx.toCore().body.scriptIntegrityHash).toBeUndefined();
    expect(tx.toCore().witness.redeemers).toBeUndefined();
  });
});
