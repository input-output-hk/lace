import { Cardano, Serialization } from '@cardano-sdk/core';
import { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';

import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  createCustodyAccountRecord,
  custodyGrantAfterSpend,
  custodyGrantAssetId,
  deriveCustodyAccountIdentity,
  encodeCustodyAccountRedeemer,
  encodeCustodyAccountState,
  encodeCustodyGrant,
  encodeCustodyLogicRedeemer,
  encodeCustodyMintRedeemer,
  encodeCustodyStakeRedeemer,
  findCustodyLogic,
} from '../src';

import { NOW, OWNER_KEY } from './fixtures';

import type {
  CustodyAccountRedeemer,
  CustodyAccountState,
  CustodyGrant,
} from '../src';
import type { CustodyInspectionOptions } from '../src/analysis/inspect';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

export const PREPROD = Cardano.ChainIds.Preprod;

/** Preprod's slot configuration: slot 86400 started at its Shelley zero time. */
export const slotToPosixMs = (slot: Cardano.Slot): number =>
  1_655_769_600_000 + (slot - 86_400) * 1000;

export const posixMsToSlot = (posixMs: number): Cardano.Slot =>
  Cardano.Slot(Math.floor((posixMs - 1_655_769_600_000) / 1000) + 86_400);

const identityResult = deriveCustodyAccountIdentity({
  contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
  creatorKeyHash: OWNER_KEY,
  chainId: PREPROD,
});
if (!identityResult.ok) throw new Error('The fixture identity must derive');

export const identity = identityResult.value;
export const record = createCustodyAccountRecord(identity);
export const ACCOUNT_VALIDATOR_HASH =
  CURRENT_CUSTODY_CONTRACT_VERSION.accountValidatorHash;
export const account = {
  accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
  stakeScriptHash: identity.stakeScriptHash,
};
export const NFT = identity.stateNftAssetId;

const otherIdentityResult = deriveCustodyAccountIdentity({
  contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
  creatorKeyHash: 'ab'.repeat(28),
  chainId: PREPROD,
});
if (!otherIdentityResult.ok)
  throw new Error('The fixture identity must derive');

/** A second, unrelated custody account on the same network. */
export const otherIdentity = otherIdentityResult.value;
export const otherAccount = {
  accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
  stakeScriptHash: otherIdentity.stakeScriptHash,
};

export const SPONSOR_KEY = 'bb'.repeat(28);
export const POOL_ID = Cardano.PoolId.fromKeyHash(
  Ed25519KeyHashHex('cc'.repeat(28)),
);

const keyCredential = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as Hash28ByteBase16,
});

const scriptCredential = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: hash as Hash28ByteBase16,
});

export const enterpriseAddress = (
  credential: Cardano.Credential,
  networkId = Cardano.NetworkId.Testnet,
): Cardano.PaymentAddress =>
  Cardano.EnterpriseAddress.fromCredentials(networkId, credential)
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

export const baseAddress = (
  payment: Cardano.Credential,
  stake: Cardano.Credential,
  networkId = Cardano.NetworkId.Testnet,
): Cardano.PaymentAddress =>
  Cardano.BaseAddress.fromCredentials(networkId, payment, stake)
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

export const SPONSOR_ADDRESS = enterpriseAddress(keyCredential(SPONSOR_KEY));
export const STRANGER_ADDRESS = enterpriseAddress(
  keyCredential('ff'.repeat(28)),
);
export const DEVICE_ADDRESS = enterpriseAddress(keyCredential(OWNER_KEY));
/** The account validator with no stake part: nothing can ever spend it. */
export const BARE_VALIDATOR_ADDRESS = enterpriseAddress(
  scriptCredential(ACCOUNT_VALIDATOR_HASH),
);
export const VALIDATOR_WITH_KEY_STAKE_ADDRESS = baseAddress(
  scriptCredential(ACCOUNT_VALIDATOR_HASH),
  keyCredential(SPONSOR_KEY),
);
export const VALIDATOR_POINTER_ADDRESS = new Cardano.Address({
  type: Cardano.AddressType.PointerScript,
  networkId: Cardano.NetworkId.Testnet,
  paymentPart: scriptCredential(ACCOUNT_VALIDATOR_HASH),
  pointer: {
    slot: 1n,
    txIndex: Cardano.TxIndex(2),
    certIndex: Cardano.CertIndex(3),
  },
}).toBech32() as Cardano.PaymentAddress;
export const MAINNET_ACCOUNT_ADDRESS = baseAddress(
  scriptCredential(ACCOUNT_VALIDATOR_HASH),
  scriptCredential(identity.stakeScriptHash),
  Cardano.NetworkId.Mainnet,
);
export const STAKE_CREDENTIAL = scriptCredential(identity.stakeScriptHash);

const logicResult = findCustodyLogic(
  CURRENT_CUSTODY_CONTRACT_VERSION,
  CURRENT_CUSTODY_CONTRACT_VERSION.currentLogicHash,
);
if (!logicResult.ok) throw new Error('The current logic must be catalogued');

/** The logic every fixture account runs: logic version 1. */
export const LOGIC = logicResult.value;
export const LOGIC_REWARD_ACCOUNT = Cardano.RewardAccount.fromCredential(
  scriptCredential(LOGIC.hash),
  Cardano.NetworkId.Testnet,
);

/**
 * The second logic of upstream's upgrade proof, applied to the proxy: a
 * script Lace has not reviewed. Upstream offchain/test/logic.test.ts pins
 * it as `SECOND_APPLIED_HASH`.
 */
export const UNKNOWN_LOGIC = HexBlob(
  '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
);

/** The withdrawal that runs the fixture logic, drawing `quantity`. */
export const logicRun = (quantity = 0n): Cardano.Withdrawal => ({
  stakeAddress: LOGIC_REWARD_ACCOUNT,
  quantity,
});

const scriptOfHash = (hash: string): Cardano.Script => {
  const scripts = [
    CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator,
    LOGIC.script,
  ];
  const script = scripts.find(
    candidate => Serialization.Script.fromCore(candidate).hash() === hash,
  );
  if (!script) throw new Error(`No fixture script hashes to ${hash}`);
  return script;
};

/** The UTxOs that park the proxy and the logic on Preprod, resolved as the chain holds them. */
export const [PARKED_PROXY, PARKED_LOGIC] = (
  CURRENT_CUSTODY_CONTRACT_VERSION.referenceScripts[
    Cardano.NetworkMagics.Preprod
  ] ?? []
).map(
  ({ txIn, address, coins, scriptHash }): Cardano.Utxo => [
    { ...txIn, address },
    { address, value: { coins }, scriptReference: scriptOfHash(scriptHash) },
  ],
);
export const PARKED_SCRIPTS: readonly Cardano.Utxo[] = [
  PARKED_PROXY,
  PARKED_LOGIC,
];

/** An upper bound well before every fixture grant expires. */
export const VALID_UNTIL = posixMsToSlot(NOW + 7_200_000);

export const txIdOf = (seed: number): Cardano.TransactionId =>
  Cardano.TransactionId(seed.toString(16).padStart(64, '0'));

export const utxo = (
  seed: number,
  txOut: Cardano.TxOut,
  index = 0,
): Cardano.Utxo => [
  { txId: txIdOf(seed), index, address: txOut.address },
  txOut,
];

export const controlOutput = (
  state: CustodyAccountState,
  lovelace = 2_000_000n,
): Cardano.TxOut => ({
  address: identity.address,
  value: { coins: lovelace, assets: new Map([[NFT, 1n]]) },
  datum: encodeCustodyAccountState(state),
});

/** The account's grant token for `slot`. */
export const grantToken = (slot: bigint): Cardano.AssetId =>
  custodyGrantAssetId(account, slot);

/** A grant UTxO of the fixture account holding the grant's token and datum. */
export const grantOutput = (
  grant: CustodyGrant,
  lovelace = 2_000_000n,
): Cardano.TxOut => ({
  address: identity.address,
  value: { coins: lovelace, assets: new Map([[grantToken(grant.slot), 1n]]) },
  datum: encodeCustodyGrant(grant),
});

/** The reserve datum Lace writes: constructor 0 with no fields, `d87980`. */
export const RESERVE_DATUM: Cardano.PlutusData = {
  constructor: 0n,
  fields: { items: [] },
};

/** An owner-only reserve of the fixture account, in the format Lace writes. */
export const reserveOutput = (lovelace: bigint): Cardano.TxOut => ({
  address: identity.address,
  value: { coins: lovelace },
  datum: RESERVE_DATUM,
});

export const fundOutput = (
  lovelace: bigint,
  assets?: Cardano.TokenMap,
): Cardano.TxOut => ({
  address: identity.address,
  value: assets ? { coins: lovelace, assets } : { coins: lovelace },
});

export const payout = (
  lovelace: bigint,
  address: Cardano.PaymentAddress = STRANGER_ADDRESS,
): Cardano.TxOut => ({ address, value: { coins: lovelace } });

export const sponsorFee = utxo(0xf0, payout(5_000_000n, SPONSOR_ADDRESS));
export const sponsorCollateral = utxo(
  0xf1,
  payout(5_000_000n, SPONSOR_ADDRESS),
);

/** One spend redeemer, on the input it spends. */
export interface SpendRedeemer {
  readonly utxo: Cardano.Utxo;
  readonly data: Cardano.PlutusData;
}

export const device = (spent: Cardano.Utxo): SpendRedeemer => ({
  utxo: spent,
  data: encodeCustodyAccountRedeemer({ kind: 'device' }),
});

export const fund = (spent: Cardano.Utxo): SpendRedeemer => ({
  utxo: spent,
  data: encodeCustodyAccountRedeemer({ kind: 'fund' }),
});

export const spendWithGrant = (spent: Cardano.Utxo): SpendRedeemer => ({
  utxo: spent,
  data: encodeCustodyAccountRedeemer({ kind: 'spendWithGrant' }),
});

export const sweepGrant = (spent: Cardano.Utxo): SpendRedeemer => ({
  utxo: spent,
  data: encodeCustodyAccountRedeemer({ kind: 'sweepGrant' }),
});

export const withRedeemer = (
  spent: Cardano.Utxo,
  redeemer: CustodyAccountRedeemer,
): SpendRedeemer => ({
  utxo: spent,
  data: encodeCustodyAccountRedeemer(redeemer),
});

/** The parts of a custody transaction a test spells out. */
export interface TransactionShape {
  readonly inputs: readonly Cardano.Utxo[];
  readonly spendRedeemers?: readonly SpendRedeemer[];
  readonly outputs: readonly Cardano.TxOut[];
  readonly referenceInputs?: readonly Cardano.Utxo[];
  readonly collaterals?: readonly Cardano.Utxo[];
  readonly collateralReturn?: Cardano.TxOut;
  readonly mint?: Cardano.TokenMap;
  readonly mintRedeemer?: Cardano.PlutusData;
  readonly certificates?: readonly Cardano.Certificate[];
  readonly withdrawals?: readonly Cardano.Withdrawal[];
  /** Withdrawals that run a logic, each under the `Run` redeemer; listed beside `withdrawals`. */
  readonly logicRuns?: readonly Cardano.Withdrawal[];
  readonly requiredSigners?: readonly string[];
  readonly invalidHereafter?: Cardano.Slot;
  readonly invalidBefore?: Cardano.Slot;
  readonly scripts?: readonly Cardano.Script[];
  /** Carried as auxiliary data, with its hash in the body unless `body` overrides it. */
  readonly auxiliaryData?: Cardano.AuxiliaryData;
  readonly body?: Partial<Cardano.TxBody>;
  readonly fee?: bigint;
}

const outpointKey = ({ txId, index }: Cardano.TxIn) => `${txId}#${index}`;

const compareOutpoints = (a: Cardano.TxIn, b: Cardano.TxIn): number =>
  a.txId === b.txId ? a.index - b.index : a.txId < b.txId ? -1 : 1;

const EXECUTION_UNITS = { memory: 1_000_000, steps: 500_000_000 };

const rewardAccountBytes = (rewardAccount: Cardano.RewardAccount): string =>
  Cardano.Address.fromBech32(rewardAccount).toBytes();

/**
 * The transaction a shape describes, decoded from its CBOR the way the
 * hosted signer decodes a request, with every spent, referenced and
 * collateral input resolved.
 */
export const buildTransaction = (
  shape: TransactionShape,
): {
  transaction: Serialization.Transaction;
  resolvedInputs: Cardano.Utxo[];
} => {
  const sortedInputs = shape.inputs
    .map(([input]) => input)
    .sort(compareOutpoints);
  const spendRedeemers = (shape.spendRedeemers ?? []).map(
    ({ utxo: [input], data }): Cardano.Redeemer => ({
      purpose: Cardano.RedeemerPurpose.spend,
      index: sortedInputs.findIndex(
        candidate => outpointKey(candidate) === outpointKey(input),
      ),
      data,
      executionUnits: EXECUTION_UNITS,
    }),
  );
  const mintRedeemers: Cardano.Redeemer[] =
    shape.mintRedeemer === undefined
      ? []
      : [
          {
            purpose: Cardano.RedeemerPurpose.mint,
            index: 0,
            data: shape.mintRedeemer,
            executionUnits: EXECUTION_UNITS,
          },
        ];
  const certificateRedeemers = (shape.certificates ?? []).flatMap(
    (certificate, index): Cardano.Redeemer[] =>
      'stakeCredential' in certificate &&
      certificate.stakeCredential?.type === Cardano.CredentialType.ScriptHash
        ? [
            {
              purpose: Cardano.RedeemerPurpose.certificate,
              index,
              data: encodeCustodyStakeRedeemer(),
              executionUnits: EXECUTION_UNITS,
            },
          ]
        : [],
  );
  const withdrawals = [
    ...(shape.withdrawals ?? []),
    ...(shape.logicRuns ?? []),
  ];
  // The body lists withdrawals by reward account bytes, and a reward
  // redeemer points into that order.
  const withdrawalOrder = withdrawals
    .map(({ stakeAddress }) => rewardAccountBytes(stakeAddress))
    .sort();
  const logicRedeemers = (shape.logicRuns ?? []).map(
    ({ stakeAddress }): Cardano.Redeemer => ({
      purpose: Cardano.RedeemerPurpose.withdrawal,
      index: withdrawalOrder.indexOf(rewardAccountBytes(stakeAddress)),
      data: encodeCustodyLogicRedeemer(),
      executionUnits: EXECUTION_UNITS,
    }),
  );
  const redeemers = [
    ...spendRedeemers,
    ...mintRedeemers,
    ...certificateRedeemers,
    ...logicRedeemers,
  ];
  const tx: Cardano.Tx = {
    id: txIdOf(0),
    body: {
      inputs: shape.inputs.map(([{ txId, index }]) => ({ txId, index })),
      outputs: [...shape.outputs],
      fee: shape.fee ?? 200_000n,
      ...(shape.referenceInputs
        ? {
            referenceInputs: shape.referenceInputs.map(([{ txId, index }]) => ({
              txId,
              index,
            })),
          }
        : {}),
      ...(shape.collaterals
        ? {
            collaterals: shape.collaterals.map(([{ txId, index }]) => ({
              txId,
              index,
            })),
          }
        : {}),
      ...(shape.collateralReturn
        ? { collateralReturn: shape.collateralReturn }
        : {}),
      ...(shape.mint ? { mint: shape.mint } : {}),
      ...(shape.certificates ? { certificates: [...shape.certificates] } : {}),
      ...(withdrawals.length > 0 ? { withdrawals } : {}),
      ...(shape.requiredSigners
        ? {
            requiredExtraSignatures: shape.requiredSigners.map(signer =>
              Ed25519KeyHashHex(signer),
            ),
          }
        : {}),
      validityInterval: {
        invalidBefore: shape.invalidBefore,
        invalidHereafter: shape.invalidHereafter,
      },
      ...(shape.auxiliaryData
        ? {
            auxiliaryDataHash: Cardano.computeAuxiliaryDataHash(
              shape.auxiliaryData,
            ),
          }
        : {}),
      ...shape.body,
    },
    witness: {
      signatures: new Map(),
      ...(redeemers.length > 0 ? { redeemers } : {}),
      ...(shape.scripts ? { scripts: [...shape.scripts] } : {}),
    },
    ...(shape.auxiliaryData ? { auxiliaryData: shape.auxiliaryData } : {}),
  };
  const cbor = Serialization.Transaction.fromCore(tx).toCbor();
  return {
    transaction: Serialization.Transaction.fromCbor(cbor),
    resolvedInputs: [
      ...shape.inputs,
      ...(shape.referenceInputs ?? []),
      ...(shape.collaterals ?? []),
    ],
  };
};

export const inspectionOptions = (
  overrides: Partial<CustodyInspectionOptions> = {},
): CustodyInspectionOptions => ({
  chainId: PREPROD,
  now: NOW,
  slotToPosixMs,
  accountRecord: record,
  deviceKeyHash: OWNER_KEY,
  ...overrides,
});

/**
 * A sponsored device rewrite of the control UTxO from one state to another,
 * running the logic with the proxy and the logic referenced from their
 * parked UTxOs, as Lace builds it on Preprod.
 */
export const deviceRewrite = (
  before: CustodyAccountState,
  after: CustodyAccountState,
): TransactionShape => {
  const control = utxo(0x10, controlOutput(before));
  return {
    inputs: [control, sponsorFee],
    spendRedeemers: [device(control)],
    outputs: [controlOutput(after), payout(4_700_000n, SPONSOR_ADDRESS)],
    referenceInputs: PARKED_SCRIPTS,
    collaterals: [sponsorCollateral],
    collateralReturn: payout(4_500_000n, SPONSOR_ADDRESS),
    logicRuns: [logicRun()],
    requiredSigners: [OWNER_KEY],
    invalidHereafter: VALID_UNTIL,
  };
};

/** A shape with the proxy and the logic attached as witnesses instead of referenced. */
export const embedded = (shape: TransactionShape): TransactionShape => ({
  ...shape,
  referenceInputs: (shape.referenceInputs ?? []).filter(
    reference => !PARKED_SCRIPTS.includes(reference),
  ),
  scripts: [
    ...(shape.scripts ?? []),
    CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator,
    LOGIC.script,
  ],
});

/**
 * A sponsored creation of the fixture account with the creator-only state,
 * attaching the stake script, which has no parked copy, and referencing
 * the parked proxy and logic.
 */
export const creation = (
  initial: CustodyAccountState,
  overrides: Partial<TransactionShape> = {},
): TransactionShape => ({
  inputs: [sponsorFee],
  outputs: [
    controlOutput(initial, 2_100_000n),
    payout(700_000n, SPONSOR_ADDRESS),
  ],
  mint: new Map([[NFT, 1n]]),
  mintRedeemer: encodeCustodyMintRedeemer({ kind: 'createAccount' }),
  certificates: [
    {
      __typename: Cardano.CertificateType.Registration,
      stakeCredential: STAKE_CREDENTIAL,
      deposit: 2_000_000n,
    },
  ],
  referenceInputs: PARKED_SCRIPTS,
  collaterals: [sponsorCollateral],
  collateralReturn: payout(4_500_000n, SPONSOR_ADDRESS),
  logicRuns: [logicRun()],
  requiredSigners: [OWNER_KEY],
  invalidHereafter: VALID_UNTIL,
  scripts: [identity.stakeScript],
  ...overrides,
});

/**
 * A sponsored device rewrite that issues grants, each into its own grant
 * UTxO, moving the counters as the validator requires unless `after` says
 * otherwise.
 */
export const grantIssue = (
  before: CustodyAccountState,
  grants: readonly CustodyGrant[],
  after: CustodyAccountState = {
    ...before,
    nextSlot: before.nextSlot + BigInt(grants.length),
    outstanding: before.outstanding + BigInt(grants.length),
  },
): TransactionShape => {
  const rewrite = deviceRewrite(before, after);
  return {
    ...rewrite,
    outputs: [
      rewrite.outputs[0],
      ...grants.map(grant => grantOutput(grant)),
      ...rewrite.outputs.slice(1),
    ],
    mint: new Map(grants.map(({ slot }) => [grantToken(slot), 1n])),
    mintRedeemer: encodeCustodyMintRedeemer({ kind: 'issueGrants' }),
  };
};

/** The grant UTxOs a sweep spends, one per grant, in the order given. */
export const sweptUtxosOf = (grants: readonly CustodyGrant[]): Cardano.Utxo[] =>
  grants.map((grant, index) => utxo(0x30 + index, grantOutput(grant)));

/**
 * A sponsored device rewrite that sweeps dead grants: their UTxOs spent with
 * `SweepGrant`, their tokens burned, their lovelace returned to the control
 * output, and their slots pruned from the revoked list unless `after` says
 * otherwise.
 */
export const grantSweep = (
  before: CustodyAccountState,
  grants: readonly CustodyGrant[],
  after: CustodyAccountState = {
    ...before,
    outstanding: before.outstanding - BigInt(grants.length),
    revoked: before.revoked.filter(
      slot => !grants.some(grant => grant.slot === slot),
    ),
  },
): TransactionShape => {
  const rewrite = deviceRewrite(before, after);
  const [control, ...others] = rewrite.inputs;
  const swept = sweptUtxosOf(grants);
  return {
    ...rewrite,
    inputs: [control, ...swept, ...others],
    spendRedeemers: [device(control), ...swept.map(sweepGrant)],
    outputs: [
      controlOutput(after, 2_000_000n + 2_000_000n * BigInt(grants.length)),
      ...rewrite.outputs.slice(1),
    ],
    mint: new Map(grants.map(({ slot }) => [grantToken(slot), -1n])),
    mintRedeemer: encodeCustodyMintRedeemer({ kind: 'burnGrants' }),
  };
};

/**
 * An agent's spend of a lovelace grant: the control UTxO and the parked
 * scripts referenced, the grant UTxO and a 20 tADA fund UTxO spent,
 * `payment` paid to the stranger and the fee paid from the account, the
 * grant recreated with its cap lowered by exactly the outflow.
 */
export const grantSpend = (
  state: CustodyAccountState,
  grant: CustodyGrant,
  payment = 2_000_000n,
): TransactionShape => {
  const fee = 200_000n;
  const outflow = payment + fee;
  const control = utxo(0x10, controlOutput(state));
  const spent = utxo(0x13, grantOutput(grant));
  const funds = utxo(0x11, fundOutput(20_000_000n));
  return {
    inputs: [spent, funds],
    referenceInputs: [control, ...PARKED_SCRIPTS],
    spendRedeemers: [spendWithGrant(spent), fund(funds)],
    outputs: [
      grantOutput(
        custodyGrantAfterSpend(grant, {
          lovelace: outflow,
          assets: new Map(),
        }),
      ),
      payout(payment),
      fundOutput(20_000_000n - outflow),
    ],
    collaterals: [sponsorCollateral],
    collateralReturn: payout(4_500_000n, SPONSOR_ADDRESS),
    logicRuns: [logicRun()],
    requiredSigners: [grant.grantee],
    invalidHereafter: VALID_UNTIL,
    fee,
  };
};

export const hexOf = (text: string): HexBlob =>
  HexBlob(Buffer.from(text, 'utf8').toString('hex'));
