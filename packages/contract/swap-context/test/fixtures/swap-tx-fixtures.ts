/**
 * Swap transaction fixtures, built with `Serialization` rather than captured.
 *
 * No malicious aggregator response exists to record, so the attack cases have
 * to be constructed anyway; building the honest ones the same way keeps the set
 * deterministic. Shared with lace-next's parity test, which runs both
 * implementations of the intent rule over these same bytes.
 */
import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBytes } from '@lace-lib/util';

export const OWN_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
);
export const PARTNER_ADDRESS = Cardano.PaymentAddress(
  'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq',
);
export const ORDER_SCRIPT_ADDRESS = new Cardano.Address({
  networkId: Cardano.NetworkId.Testnet,
  paymentPart: {
    hash: 'f'.repeat(56) as Cardano.Credential['hash'],
    type: Cardano.CredentialType.ScriptHash,
  },
  type: Cardano.AddressType.EnterpriseScript,
}).toBech32() as Cardano.PaymentAddress;

/** The account's own payment credential, as an order datum would carry it. */
export const OWN_PAYMENT_HASH = Cardano.Address.fromString(OWN_ADDRESS)
  ?.getProps()
  .paymentPart?.hash.toString() as string;

/**
 * The account's STAKE credential. Public, and shared by every address of the
 * account — so a datum naming it says nothing about who gets paid.
 */
export const OWN_STAKE_HASH = Cardano.Address.fromString(OWN_ADDRESS)
  ?.getProps()
  .delegationPart?.hash.toString() as string;

export const REWARD_ACCOUNT = new Cardano.Address({
  networkId: Cardano.NetworkId.Testnet,
  paymentPart: {
    hash: 'c'.repeat(56) as Cardano.Credential['hash'],
    type: Cardano.CredentialType.KeyHash,
  },
  type: Cardano.AddressType.RewardKey,
}).toBech32() as Cardano.RewardAccount;

/**
 * A DRep vote a swap has no business carrying. The wallet signs one of these
 * when the voter credential is its own: `getVotingProcedureKeyPaths` in
 * `@cardano-sdk/key-management` derives the DRep key for exactly this shape.
 */
export const DREP_VOTE: Cardano.VotingProcedures = [
  {
    voter: {
      __typename: Cardano.VoterType.dRepKeyHash,
      credential: {
        hash: 'b'.repeat(56) as Cardano.Credential['hash'],
        type: Cardano.CredentialType.KeyHash,
      },
    },
    votes: [
      {
        actionId: {
          actionIndex: 0,
          id: Cardano.TransactionId('1'.repeat(64)),
        },
        votingProcedure: { anchor: null, vote: Cardano.Vote.yes },
      },
    ],
  },
];

/**
 * A governance proposal a swap has no business carrying. The deposit is a body
 * field only — no input funds it here — so the gate's balance clauses see an
 * ordinary order, and only a presence check can refuse this.
 */
export const INFO_PROPOSAL: Cardano.ProposalProcedure = {
  anchor: {
    dataHash: '0'.repeat(64) as Cardano.Anchor['dataHash'],
    url: 'https://example.invalid/proposal',
  },
  deposit: 100_000_000_000n,
  governanceAction: { __typename: Cardano.GovernanceActionType.info_action },
  rewardAccount: REWARD_ACCOUNT,
};

/** A certificate a swap has no business carrying. */
export const STAKE_REGISTRATION: Cardano.Certificate = {
  __typename: Cardano.CertificateType.StakeRegistration,
  stakeCredential: {
    hash: 'a'.repeat(56) as Cardano.Credential['hash'],
    type: Cardano.CredentialType.KeyHash,
  },
};

export const SELL_TOKEN = Cardano.AssetId(
  'c0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e75746f6b656e32',
);
export const BUY_TOKEN = Cardano.AssetId(
  'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e75746f6b656e31',
);
export const OTHER_TOKEN = Cardano.AssetId(
  'd0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e75746f6b656e33',
);

const PREV_TX_ID = Cardano.TransactionId(
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
);
const POOL_TX_ID = Cardano.TransactionId(
  '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
);

/** An input the account owns, and the value it carries. */
export const ownUtxo = (
  index: number,
  value: Cardano.Value,
  address: Cardano.PaymentAddress = OWN_ADDRESS,
): Cardano.Utxo => [
  { address, index, txId: PREV_TX_ID },
  { address, value },
];

/** An input the account does not own — a DEX pool, or a counterparty's. */
export const foreignInput = (index: number): Cardano.TxIn => ({
  index,
  txId: POOL_TX_ID,
});

/**
 * A datum naming the order's beneficiary by credential hash. Pass several to
 * model the two-part address a real DEX datum carries — payment credential and
 * stake credential as separate fields.
 */
export const beneficiaryDatum = (
  ...hashes: readonly string[]
): Cardano.PlutusData => ({
  constructor: 0n,
  fields: {
    items: (hashes.length > 0 ? hashes : [OWN_PAYMENT_HASH]).map(hash =>
      Buffer.from(hash, 'hex'),
    ),
  },
});

/** The hash an output must reference to pick this datum out of the witness set. */
export const datumHashOf = (datum: Cardano.PlutusData) =>
  Serialization.PlutusData.fromCore(datum).hash();

export type SwapTxParts = {
  inputs: readonly Cardano.TxIn[];
  outputs: readonly Cardano.TxOut[];
  fee: bigint;
  collaterals?: readonly Cardano.TxIn[];
  /** Pays the unused part of the collateral back; may name a foreign address. */
  collateralReturn?: Cardano.TxOut;
  certificates?: Cardano.TxBody['certificates'];
  withdrawals?: Cardano.TxBody['withdrawals'];
  votingProcedures?: Cardano.TxBody['votingProcedures'];
  proposalProcedures?: Cardano.TxBody['proposalProcedures'];
  mint?: Cardano.TxBody['mint'];
  ttl?: number;
  /** Witness-set datums, for outputs that carry a hash rather than an inline. */
  datums?: readonly Cardano.PlutusData[];
};

export const buildSwapTx = ({
  inputs,
  outputs,
  fee,
  collaterals,
  collateralReturn,
  certificates,
  withdrawals,
  votingProcedures,
  proposalProcedures,
  mint,
  ttl,
  datums,
}: SwapTxParts): HexBytes =>
  HexBytes(
    Serialization.Transaction.fromCore({
      body: {
        certificates,
        collateralReturn,
        collaterals: collaterals === undefined ? undefined : [...collaterals],
        fee,
        inputs: [...inputs],
        mint,
        outputs: [...outputs],
        proposalProcedures:
          proposalProcedures === undefined
            ? undefined
            : [...proposalProcedures],
        validityInterval:
          ttl === undefined
            ? undefined
            : { invalidHereafter: Cardano.Slot(ttl) },
        votingProcedures:
          votingProcedures === undefined ? undefined : [...votingProcedures],
        withdrawals,
      },
      id: Cardano.TransactionId('0'.repeat(64)),
      witness: {
        datums: datums === undefined ? undefined : [...datums],
        signatures: new Map(),
      },
    }).toCbor(),
  );

/** Lovelace an honest build consumes beyond the sell amount: fee + deposit. */
export const HONEST_FEE = 200_000n;
export const DEPOSIT = 2_000_000n;
export const SELL_LOVELACE = 100_000_000n;

/**
 * The reference honest order: 100 ADA sold into a DEX order that names the
 * account, change back, plus the partner fee output the aggregator adds.
 */
export const honestAdaOrder = ({
  orderCoin = SELL_LOVELACE + DEPOSIT,
  datum = beneficiaryDatum(),
  fee = HONEST_FEE,
  includePartnerFee = false,
  mint,
  proposalProcedures,
  quotedFeeLovelace = 0n,
  votingProcedures,
}: {
  orderCoin?: bigint;
  datum?: Cardano.PlutusData;
  /** The transaction's declared fee; the change output absorbs the difference. */
  fee?: bigint;
  includePartnerFee?: boolean;
  mint?: Cardano.TxBody['mint'];
  proposalProcedures?: Cardano.TxBody['proposalProcedures'];
  votingProcedures?: Cardano.TxBody['votingProcedures'];
  /**
   * Lovelace paid out as the batcher/service fees the quote declares. A real
   * one leaves as its own output, so it counts as outflow.
   */
  quotedFeeLovelace?: bigint;
} = {}) => {
  const funding = ownUtxo(0, { coins: 200_000_000n });
  const partnerFee = includePartnerFee ? 1_000_000n : 0n;
  return {
    accountUtxos: [funding],
    serializedTx: buildSwapTx({
      fee,
      inputs: [funding[0]],
      mint,
      proposalProcedures,
      votingProcedures,
      outputs: [
        { address: ORDER_SCRIPT_ADDRESS, datum, value: { coins: orderCoin } },
        ...(includePartnerFee
          ? [{ address: PARTNER_ADDRESS, value: { coins: partnerFee } }]
          : []),
        ...(quotedFeeLovelace > 0n
          ? [{ address: PARTNER_ADDRESS, value: { coins: quotedFeeLovelace } }]
          : []),
        {
          address: OWN_ADDRESS,
          value: {
            coins:
              200_000_000n - orderCoin - partnerFee - quotedFeeLovelace - fee,
          },
        },
      ],
      ttl: 12_345,
    }),
  };
};
