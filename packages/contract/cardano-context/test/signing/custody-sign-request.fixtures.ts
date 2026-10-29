import { Cardano, Serialization } from '@cardano-sdk/core';
import { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import {
  createCustodyAccountRecord,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  custodyGrantAssetId,
  deriveCustodyAccountIdentity,
  encodeCustodyAccountRedeemer,
  encodeCustodyAccountState,
  encodeCustodyGrant,
  encodeCustodyLogicRedeemer,
  encodeCustodyMintRedeemer,
  encodeCustodyStakeRedeemer,
  findCustodyLogic,
  serializeCustodyRequestedGrantScope,
} from '@lace-lib/cardano-custody';

import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type {
  CustodyAccountRedeemer,
  CustodyAccountState,
  CustodyGrant,
  CustodyMintRedeemer,
} from '@lace-lib/cardano-custody';

/**
 * Custody transactions for the words of `sign-with-words.fixtures`, in the
 * shapes the SDK builds: creation in the sponsor's fee mode, and owner
 * operations in its collateral mode, paid from the account's fund UTxOs.
 * Each runs the account's logic through a withdrawal from its reward
 * account and references the account proxy and the logic parked on
 * Preprod.
 */

export const PREPROD = Cardano.ChainIds.Preprod;

/**
 * The CIP-1854 testnet account m/1854'/1815'/1' of the fixture words and the
 * hashes of its device keys 0/0 and 0/1, derived independently with
 * @emurgo/cardano-serialization-lib-nodejs.
 */
export const TESTNET_CUSTODY_XPUB = Bip32PublicKeyHex(
  '5daf833bb597b987983984cbf950f81fc274a038574e4bf52d00433dbc11efd183ab5e43da8fd700e7c32e17b25f30e904e30da92501456943d5f8f041d769a4',
);
export const DEVICE_0 = Ed25519KeyHashHex(
  'c673124ca3922223ff8e522559f25e2236f5294b0a486a55833d55dc',
);
export const DEVICE_1 = Ed25519KeyHashHex(
  'aa90eee1400baca5d0a5037a190e959b07020ba861a988e37b1787b5',
);
export const AGENT_KEY = HexBlob('cc'.repeat(28));
const SPONSOR_KEY = 'bb'.repeat(28);

/** 2026-10-07T00:00:00Z, the clock the handler tests run at. */
export const NOW = 1_791_331_200_000;
/** 2030-01-01T00:00:00Z. */
export const EXPIRY = 1_893_456_000_000n;

/** Preprod's slot configuration: slot 86400 started at its Shelley zero time. */
export const posixMsToSlot = (posixMs: number): Cardano.Slot =>
  Cardano.Slot(Math.floor((posixMs - 1_655_769_600_000) / 1000) + 86_400);

export const VALID_UNTIL = posixMsToSlot(NOW + 3_600_000);

const identityOf = (creatorKeyHash: string) => {
  const result = deriveCustodyAccountIdentity({
    contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
    creatorKeyHash,
    chainId: PREPROD,
  });
  if (!result.ok) throw new Error('The fixture identity must derive');
  return result.value;
};

export const identity = identityOf(DEVICE_0);
export const record = createCustodyAccountRecord(identity);

const keyAddress = (hash: string): Cardano.PaymentAddress =>
  Cardano.EnterpriseAddress.fromCredentials(Cardano.NetworkId.Testnet, {
    type: Cardano.CredentialType.KeyHash,
    hash: hash as Hash28ByteBase16,
  })
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

export const SPONSOR_ADDRESS = keyAddress(SPONSOR_KEY);
export const STRANGER_ADDRESS = keyAddress('ff'.repeat(28));

export const txIdOf = (seed: number): Cardano.TransactionId =>
  Cardano.TransactionId(seed.toString(16).padStart(64, '0'));

export const utxo = (seed: number, txOut: Cardano.TxOut): Cardano.Utxo => [
  { txId: txIdOf(seed), index: 0, address: txOut.address },
  txOut,
];

export const controlOutput = (
  state: CustodyAccountState,
  lovelace = 2_000_000n,
): Cardano.TxOut => ({
  address: identity.address,
  value: { coins: lovelace, assets: new Map([[identity.stateNftAssetId, 1n]]) },
  datum: encodeCustodyAccountState(state),
});

export const payout = (
  lovelace: bigint,
  address: Cardano.PaymentAddress,
): Cardano.TxOut => ({ address, value: { coins: lovelace } });

const version = CURRENT_CUSTODY_CONTRACT_VERSION;

/** The reward account of the logic new accounts run, on testnets. */
export const LOGIC_REWARD_ACCOUNT = Cardano.RewardAccount.fromCredential(
  { type: Cardano.CredentialType.ScriptHash, hash: version.currentLogicHash },
  Cardano.NetworkId.Testnet,
);

const parkedScriptOf = (hash: string): Cardano.Script => {
  if (hash === version.accountValidatorHash) return version.accountValidator;
  const logic = findCustodyLogic(version, hash);
  if (!logic.ok) throw new Error(`No fixture script for ${hash}`);
  return logic.value.script;
};

/** The Preprod UTxOs that hold the account proxy and the logic as reference scripts. */
export const PARKED_SCRIPTS: readonly Cardano.Utxo[] = (
  version.referenceScripts[Cardano.NetworkMagics.Preprod] ?? []
).map(({ scriptHash, txIn, address, coins }) => [
  { ...txIn, address },
  { address, value: { coins }, scriptReference: parkedScriptOf(scriptHash) },
]);

/** A withdrawal, with the redeemer of the script it runs when it runs one. */
export type CustodyWithdrawal = Cardano.Withdrawal & {
  redeemer?: Cardano.PlutusData;
};

/** The withdrawal that runs the account's logic, drawing `quantity`. */
export const logicRun = (quantity = 0n): CustodyWithdrawal => ({
  stakeAddress: LOGIC_REWARD_ACCOUNT,
  quantity,
  redeemer: encodeCustodyLogicRedeemer(),
});

export const sponsorFee = utxo(0xf0, payout(5_000_000n, SPONSOR_ADDRESS));
export const sponsorCollateral = utxo(
  0xf1,
  payout(5_000_000n, SPONSOR_ADDRESS),
);

export const initialState: CustodyAccountState = {
  logic: HexBlob(CURRENT_CUSTODY_CONTRACT_VERSION.currentLogicHash),
  devices: [HexBlob(DEVICE_0)],
  grantGeneration: 0n,
  nextSlot: 0n,
  revoked: [],
  outstanding: 0n,
};

/** The state once the first grant is issued. */
export const grantedState: CustodyAccountState = {
  ...initialState,
  nextSlot: 1n,
  outstanding: 1n,
};

export const agentGrant: CustodyGrant = {
  slot: 0n,
  grantee: AGENT_KEY,
  generation: 0n,
  scope: {
    asset: { policyId: HexBlob(''), assetName: HexBlob('') },
    perCallCap: 10_000_000n,
    cap: 15_000_000n,
    lovelacePerCallCap: 0n,
    lovelaceCap: 0n,
    expiresAt: EXPIRY,
    recipients: [],
  },
};

/** Lovelace a fixture grant UTxO holds. */
export const GRANT_LOVELACE = 2_000_000n;

/** A grant UTxO of the fixture account: its grant token and its grant inline. */
export const grantOutput = (
  grant: CustodyGrant,
  lovelace = GRANT_LOVELACE,
): Cardano.TxOut => ({
  address: identity.address,
  value: {
    coins: lovelace,
    assets: new Map([[custodyGrantAssetId(record, grant.slot), 1n]]),
  },
  datum: encodeCustodyGrant(grant),
});

/** The grant UTxO of a grant, at an outpoint its slot names. */
export const grantUtxo = (grant: CustodyGrant): Cardano.Utxo =>
  utxo(0x30 + Number(grant.slot), grantOutput(grant));

/** The parts of a custody transaction a test spells out. */
export type CustodyTransactionShape = {
  inputs: readonly Cardano.Utxo[];
  spendRedeemers?: readonly {
    spent: Cardano.Utxo;
    redeemer: CustodyAccountRedeemer;
  }[];
  referenceInputs?: readonly Cardano.Utxo[];
  outputs: readonly Cardano.TxOut[];
  collaterals?: readonly Cardano.Utxo[];
  collateralReturn?: Cardano.TxOut;
  totalCollateral?: bigint;
  mint?: Cardano.TokenMap;
  /** The mint's redeemer; a creation's when omitted. */
  mintRedeemer?: CustodyMintRedeemer;
  certificates?: readonly Cardano.Certificate[];
  withdrawals?: readonly CustodyWithdrawal[];
  requiredSigners?: readonly string[];
  scripts?: readonly Cardano.Script[];
  /** Carried as auxiliary data, with its hash in the body unless `body` overrides it. */
  auxiliaryData?: Cardano.AuxiliaryData;
  body?: Partial<Cardano.TxBody>;
};

const EXECUTION_UNITS = { memory: 1_000_000, steps: 500_000_000 };

const outpointKey = ({ txId, index }: Cardano.TxIn) => `${txId}#${index}`;

const credentialHashOf = (rewardAccount: Cardano.RewardAccount) =>
  Cardano.RewardAccount.toHash(rewardAccount);

/**
 * The reward redeemers of the withdrawals that run a script, each at the
 * position of its reward account among them sorted by credential hash, as
 * Lace's transaction builder indexes them.
 */
const withdrawalRedeemersOf = (
  withdrawals: readonly CustodyWithdrawal[],
): Cardano.Redeemer[] => {
  const scripted = withdrawals.filter(({ redeemer }) => redeemer);
  const order = scripted
    .map(({ stakeAddress }) => credentialHashOf(stakeAddress))
    .sort();
  return scripted.map(({ stakeAddress, redeemer }) => ({
    purpose: Cardano.RedeemerPurpose.withdrawal,
    index: order.indexOf(credentialHashOf(stakeAddress)),
    data: redeemer!,
    executionUnits: EXECUTION_UNITS,
  }));
};

/** The transaction a shape describes, as the CBOR a dApp sends. */
export const serializeCustodyTransaction = (
  shape: CustodyTransactionShape,
): string => {
  const sortedInputs = shape.inputs.map(([input]) => outpointKey(input)).sort();
  const redeemers: Cardano.Redeemer[] = [
    ...(shape.spendRedeemers ?? []).map(({ spent: [input], redeemer }) => ({
      purpose: Cardano.RedeemerPurpose.spend,
      index: sortedInputs.indexOf(outpointKey(input)),
      data: encodeCustodyAccountRedeemer(redeemer),
      executionUnits: EXECUTION_UNITS,
    })),
    ...(shape.mint
      ? [
          {
            purpose: Cardano.RedeemerPurpose.mint,
            index: 0,
            data: encodeCustodyMintRedeemer(
              shape.mintRedeemer ?? { kind: 'createAccount' },
            ),
            executionUnits: EXECUTION_UNITS,
          },
        ]
      : []),
    ...(shape.certificates ?? []).map((_, index) => ({
      purpose: Cardano.RedeemerPurpose.certificate,
      index,
      data: encodeCustodyStakeRedeemer(),
      executionUnits: EXECUTION_UNITS,
    })),
    ...withdrawalRedeemersOf(shape.withdrawals ?? []),
  ];
  return Serialization.Transaction.fromCore({
    id: txIdOf(0),
    body: {
      inputs: shape.inputs.map(([{ txId, index }]) => ({ txId, index })),
      outputs: [...shape.outputs],
      fee: 250_000n,
      validityInterval: { invalidHereafter: VALID_UNTIL },
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
      ...(shape.totalCollateral === undefined
        ? {}
        : { totalCollateral: shape.totalCollateral }),
      ...(shape.mint ? { mint: shape.mint } : {}),
      ...(shape.certificates ? { certificates: [...shape.certificates] } : {}),
      ...(shape.withdrawals
        ? {
            withdrawals: shape.withdrawals.map(
              ({ stakeAddress, quantity }) => ({ stakeAddress, quantity }),
            ),
          }
        : {}),
      ...(shape.requiredSigners
        ? {
            requiredExtraSignatures: shape.requiredSigners.map(signer =>
              Ed25519KeyHashHex(signer),
            ),
          }
        : {}),
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
  }).toCbor();
};

/** A resolution as the protocol carries it: CIP-30 unspent output CBOR. */
export const serializeResolvedInput = ([input, output]: Cardano.Utxo): string =>
  Serialization.TransactionUnspentOutput.fromCore([
    { txId: input.txId, index: input.index },
    output,
  ]).toCbor();

const collateralMode = {
  collaterals: [sponsorCollateral],
  collateralReturn: payout(4_625_000n, SPONSOR_ADDRESS),
  totalCollateral: 375_000n,
};

/** The sponsor's fee mode: its leased UTxO pays the fee, deposit and control output. */
export const creation = (): CustodyTransactionShape => ({
  inputs: [sponsorFee],
  outputs: [
    controlOutput(initialState, 1_500_000n),
    payout(1_250_000n, SPONSOR_ADDRESS),
  ],
  mint: new Map([[identity.stateNftAssetId, 1n]]),
  certificates: [
    {
      __typename: Cardano.CertificateType.Registration,
      stakeCredential: {
        type: Cardano.CredentialType.ScriptHash,
        hash: identity.stakeScriptHash,
      },
      deposit: 2_000_000n,
    },
  ],
  referenceInputs: PARKED_SCRIPTS,
  withdrawals: [logicRun()],
  ...collateralMode,
  requiredSigners: [DEVICE_0],
  scripts: [identity.stakeScript],
});

export const control = utxo(0x10, controlOutput(initialState));
export const fundUtxo = utxo(0x11, payout(10_000_000n, identity.address));

/**
 * The sponsor's collateral mode: a fund UTxO pays the fee and the account
 * keeps the change. The control UTxO holds `before`, the initial state by
 * default.
 */
export const deviceRewrite = (
  after: CustodyAccountState,
  {
    before = initialState,
    signers = [DEVICE_0],
  }: { before?: CustodyAccountState; signers?: readonly string[] } = {},
): CustodyTransactionShape => {
  const spentControl = utxo(0x10, controlOutput(before));
  return {
    inputs: [spentControl, fundUtxo],
    spendRedeemers: [
      { spent: spentControl, redeemer: { kind: 'device' } },
      { spent: fundUtxo, redeemer: { kind: 'fund' } },
    ],
    outputs: [controlOutput(after), payout(9_750_000n, identity.address)],
    referenceInputs: PARKED_SCRIPTS,
    withdrawals: [logicRun()],
    ...collateralMode,
    requiredSigners: signers,
  };
};

/**
 * A device rewrite that issues `grant` into its own grant UTxO, paid from
 * the fund UTxO: by default the first grant, `agentGrant`. `after` moves
 * the counters as the validator requires unless a test says otherwise.
 */
export const issueGrant = ({
  grant = agentGrant,
  before = initialState,
  after = {
    ...before,
    nextSlot: before.nextSlot + 1n,
    outstanding: before.outstanding + 1n,
  },
}: {
  grant?: CustodyGrant;
  before?: CustodyAccountState;
  after?: CustodyAccountState;
} = {}): CustodyTransactionShape => ({
  ...deviceRewrite(after, { before }),
  outputs: [
    controlOutput(after),
    grantOutput(grant),
    payout(9_750_000n - GRANT_LOVELACE, identity.address),
  ],
  mint: new Map([[custodyGrantAssetId(record, grant.slot), 1n]]),
  mintRedeemer: { kind: 'issueGrants' },
});

/** The state once `agentGrant` is revoked. */
export const revokedState: CustodyAccountState = {
  ...grantedState,
  revoked: [0n],
};

/** A device rewrite that revokes `agentGrant`. */
export const revokeGrant = (): CustodyTransactionShape =>
  deviceRewrite(revokedState, { before: grantedState });

/** The grant that replaces `agentGrant`: a higher cap, in the next slot. */
export const successorGrant: CustodyGrant = {
  ...agentGrant,
  slot: 1n,
  scope: { ...agentGrant.scope, cap: 25_000_000n },
};

/** A device rewrite that revokes `agentGrant` and issues `successorGrant`. */
export const replaceGrant = (): CustodyTransactionShape =>
  issueGrant({
    grant: successorGrant,
    before: grantedState,
    after: { ...grantedState, revoked: [0n], nextSlot: 2n, outstanding: 2n },
  });

/**
 * A device rewrite that sweeps dead grants: their grant UTxOs spent with
 * `SweepGrant`, their tokens burned and their lovelace kept in the control
 * output. `after` prunes their slots from the revoked list unless a test
 * says otherwise.
 */
export const sweepGrants = ({
  grants = [agentGrant],
  before = revokedState,
  after = {
    ...before,
    revoked: before.revoked.filter(
      slot => !grants.some(grant => grant.slot === slot),
    ),
    outstanding: before.outstanding - BigInt(grants.length),
  },
}: {
  grants?: readonly CustodyGrant[];
  before?: CustodyAccountState;
  after?: CustodyAccountState;
} = {}): CustodyTransactionShape => {
  const rewrite = deviceRewrite(after, { before });
  const [spentControl, ...others] = rewrite.inputs;
  const swept = grants.map(grantUtxo);
  return {
    ...rewrite,
    inputs: [spentControl, ...swept, ...others],
    spendRedeemers: [
      ...(rewrite.spendRedeemers ?? []),
      ...swept.map(spent => ({
        spent,
        redeemer: { kind: 'sweepGrant' } as const,
      })),
    ],
    outputs: [
      controlOutput(after, 2_000_000n + GRANT_LOVELACE * BigInt(grants.length)),
      ...rewrite.outputs.slice(1),
    ],
    mint: new Map(
      grants.map(({ slot }) => [custodyGrantAssetId(record, slot), -1n]),
    ),
    mintRedeemer: { kind: 'burnGrants' },
  };
};

/** A sign request payload for a shape, signed by the fixture device at `index`. */
export const custodyPayload = (
  shape: CustodyTransactionShape,
  overrides: Record<string, unknown> = {},
) => ({
  serializedTx: serializeCustodyTransaction(shape),
  chainId: PREPROD,
  device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 0 },
  resolvedInputs: [
    ...shape.inputs,
    ...(shape.referenceInputs ?? []),
    ...(shape.collaterals ?? []),
  ].map(serializeResolvedInput),
  accountRecord: record,
  ...overrides,
});

export const requestedScopeOf = (grant: CustodyGrant) =>
  serializeCustodyRequestedGrantScope({
    slot: grant.slot,
    grantee: grant.grantee,
    asset: grant.scope.asset,
    perCallCap: grant.scope.perCallCap,
    cap: grant.scope.cap,
    lovelacePerCallCap: grant.scope.lovelacePerCallCap,
    lovelaceCap: grant.scope.lovelaceCap,
    expiresAt: grant.scope.expiresAt,
    recipients: [],
  });

/** The origin of the site that asks for a custody data signature. */
export const DAPP_ORIGIN = 'https://city.example';

/** `Sign in to city.example, nonce 42` in UTF-8. */
export const CHALLENGE = HexBlob(
  Buffer.from('Sign in to city.example, nonce 42').toString('hex'),
);

/**
 * A `sign-cardano-custody-data` payload for the fixture account, whose
 * control UTxO lists the fixture device 0.
 */
export const custodyDataPayload = (
  overrides: Record<string, unknown> = {},
) => ({
  chainId: PREPROD,
  device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 0 },
  accountRecord: record,
  controlUtxo: serializeResolvedInput(control),
  payload: CHALLENGE,
  purpose: 'sign-in',
  ...overrides,
});
