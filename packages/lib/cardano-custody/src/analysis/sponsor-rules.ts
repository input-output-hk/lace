// Mirrors src/policy/rules.ts, src/policy/parse.ts and
// src/policy/script-data.ts of Biglup/cardano-account-custody-fee-sponsor at
// revision 4de7a3812af99c631870724a0633f6250ed4f23a (Apache-2.0). Modified
// for Lace: the rules read @cardano-sdk/core values and return typed
// violations; the sponsor UTxOs the client knows are the leased fee UTxO and
// the shared collateral, where the service also knows the rest of its pool;
// the account script, the known logics and the stake derivation come from a
// contract version and the fee limit is the service's default, where the
// service reads its configuration; the shared collateral rule also refuses a
// fee that collateral cannot cover; and the script rule also refuses a
// reference script other than the version's parked scripts.

import { Cardano, Serialization } from '@cardano-sdk/core';
import { blake2b, Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';

import { bytesToHex, HASH_28_BYTE_LENGTH } from '../hex';
import {
  chainIdFromNetworkMagic,
  identityOfValidatedCreator,
} from '../identity';
import { parseCustodyAccountTokenName } from '../tokens';

import type { CustodyContractVersion } from '../contract-version';
import type { Hash32ByteBase16 } from '@cardano-sdk/crypto';

/** The service's limit on the size of a transaction it inspects, in bytes. */
const MAX_TRANSACTION_BYTES = 16 * 1024;

/** The service's default limit on the fee a leased fee UTxO pays, in lovelace. */
const MAX_FEE_LOVELACE = 2_000_000n;

/**
 * The most devices a well formed state lists, which bounds the stake scripts
 * a creation has the service derive.
 */
const MAX_DEVICES = 8;

/**
 * How the fee sponsor service takes part in a transaction. In fee mode it
 * pays from one leased fee UTxO; in collateral mode it contributes the
 * shared collateral UTxO and nothing else.
 */
export type CustodySponsorMode =
  | {
      readonly kind: 'fee';
      /** The leased fee UTxO: the only sponsor input the transaction may spend. */
      readonly feeUtxo: Cardano.Utxo;
      /** The most the fee UTxO may be drawn down by. */
      readonly maxSponsoredLovelace: bigint;
    }
  | { readonly kind: 'collateral' };

export interface CustodySponsorRuleContext {
  readonly mode: CustodySponsorMode;
  /** Receives the collateral return and, in fee mode, the change. */
  readonly sponsorAddress: Cardano.PaymentAddress;
  /** The shared collateral UTxO, which must be the only collateral input. */
  readonly collateralUtxo: Cardano.Utxo;
  /**
   * The contract version of the accounts the service sponsors. Its proxy is
   * the service's account script, its logics stand for the logics the
   * service knows, and a creation's stake credential must be its stake
   * validator applied to a listed device. Its scripts parked on
   * `networkMagic` are the only reference scripts Lace accepts.
   */
  readonly contractVersion: CustodyContractVersion;
  readonly networkMagic: Cardano.NetworkMagic;
  /** The latest `invalidHereafter` the service accepts under the mode. */
  readonly latestValiditySlot: Cardano.Slot;
  /** The slot of the current time; the upper bound must be later. */
  readonly currentSlot: Cardano.Slot;
  /**
   * The protocol's collateral percentage: the ledger takes collateral of at
   * least this share of the fee, and the shared collateral UTxO is the only
   * collateral the service allows.
   */
  readonly collateralPercentage: number;
  /** The cost models the service recomputes the script data hash under. */
  readonly costModels: Cardano.CostModels;
}

/**
 * Where a transaction names an account's logic: in the datum of a control
 * UTxO it spends or references, or of a control output it writes.
 */
type CustodySponsorControlLocation =
  | { readonly input: Cardano.TxIn; readonly kind: 'control-utxo' }
  | { readonly kind: 'control-output'; readonly outputIndex: number };

/**
 * A rule the service would refuse a transaction under, with what breaks
 * it. `assetId` is absent for lovelace. The `limit` of
 * `fee-exceeds-collateral` is the largest fee the shared collateral covers.
 * `logic-draw` is a withdrawal drawing lovelace from the logic it runs,
 * which the service runs on a withdrawal of zero only.
 * `foreign-reference-script` is Lace's own: a reference input carrying a
 * script, other than a parked script's UTxO carrying exactly that script.
 * Its `scriptHash` is absent for a parked script's UTxO that carries none.
 */
export type CustodySponsorRuleViolation =
  | {
      readonly certificateIndex: number;
      readonly reason: 'foreign-certificate';
      readonly rule: 'no_foreign_scripts';
      readonly scriptHash: string;
    }
  | {
      readonly certificateIndex: number;
      readonly reason: 'sponsor-certificate';
      readonly rule: 'signers';
    }
  | {
      readonly computed: Hash32ByteBase16;
      readonly declared: Hash32ByteBase16;
      readonly reason: 'script-data-hash-mismatch';
      readonly rule: 'script_data_hash';
    }
  | {
      readonly control: CustodySponsorControlLocation;
      readonly logic: Hash28ByteBase16;
      readonly reason: 'unknown-logic';
      readonly rule: 'known_logic';
      readonly stakeScriptHash: Hash28ByteBase16;
    }
  | {
      readonly control: CustodySponsorControlLocation;
      readonly reason: 'logic-missing';
      readonly rule: 'known_logic';
      readonly stakeScriptHash: Hash28ByteBase16;
    }
  | {
      readonly count: number;
      readonly limit: number;
      readonly reason: 'device-count';
      readonly rule: 'account_transaction';
    }
  | {
      readonly count: number;
      readonly reason: 'sponsor-output-count';
      readonly rule: 'sponsor_outflow_bounded';
    }
  | {
      readonly declared: Hash32ByteBase16;
      readonly reason: 'unexpected-script-data-hash';
      readonly rule: 'script_data_hash';
    }
  | {
      readonly demanded: bigint;
      readonly reason: 'uncovered-outflow';
      readonly rule: 'no_sponsor_value_elsewhere';
      readonly supplied: bigint;
      readonly assetId?: Cardano.AssetId;
    }
  | {
      readonly expected: bigint;
      readonly reason: 'draw-mismatch';
      readonly rule: 'sponsor_outflow_bounded';
      readonly sponsored: bigint;
    }
  | {
      readonly fee: bigint;
      readonly limit: bigint;
      readonly reason: 'fee-exceeds-limit';
      readonly rule: 'sponsor_outflow_bounded';
    }
  | {
      readonly input: Cardano.TxIn;
      /**
       * `foreign-referenced-control`: a referenced control UTxO of an account
       * no input operates. `orphan-grant`: a spent grant UTxO whose
       * account's control UTxO is neither spent nor referenced.
       */
      readonly reason: 'foreign-referenced-control' | 'orphan-grant';
      readonly rule: 'account_transaction';
      /** The stake script hash of the account the UTxO belongs to. */
      readonly stakeScriptHash: Hash28ByteBase16;
    }
  | {
      readonly input: Cardano.TxIn;
      readonly reason: 'fee-input-missing';
      readonly rule: 'uses_leased_fee_input';
    }
  | {
      readonly input: Cardano.TxIn;
      readonly reason: 'foreign-reference-script';
      readonly rule: 'no_foreign_scripts';
      readonly scriptHash?: Hash28ByteBase16;
    }
  | {
      readonly input: Cardano.TxIn;
      readonly reason: 'foreign-script-input';
      readonly rule: 'no_foreign_scripts';
      readonly scriptHash: string;
    }
  | {
      readonly input: Cardano.TxIn;
      readonly reason: 'sponsor-input' | 'unreadable-input';
      readonly rule: 'no_sponsor_inputs' | 'uses_leased_fee_input';
    }
  | {
      readonly keyHash: string;
      readonly reason: 'sponsor-required-signer';
      readonly rule: 'signers';
    }
  | {
      readonly language: Cardano.PlutusLanguageVersion;
      readonly reason: 'missing-cost-model' | 'non-v3-script';
      readonly rule: 'script_data_hash';
    }
  | {
      readonly latest: Cardano.Slot;
      readonly reason: 'upper-bound-too-late';
      readonly rule: 'bounded_validity';
      readonly upperBound: Cardano.Slot;
    }
  | {
      readonly limit: bigint;
      readonly reason: 'draw-exceeds-limit';
      readonly rule: 'sponsor_outflow_bounded';
      readonly sponsored: bigint;
    }
  | {
      readonly limit: bigint;
      readonly reason: 'fee-exceeds-collateral';
      readonly rule: 'uses_shared_collateral';
      readonly fee: bigint;
    }
  | {
      readonly limit: number;
      readonly reason: 'too-large';
      readonly rule: 'well_formed';
      readonly size: number;
    }
  | {
      readonly logic: Hash28ByteBase16;
      readonly quantity: bigint;
      readonly reason: 'logic-draw';
      readonly rewardAccount: Cardano.RewardAccount;
      readonly rule: 'no_foreign_scripts';
    }
  | {
      readonly outputIndex: number;
      readonly reason:
        | 'sponsor-output-datum'
        | 'sponsor-output-reference-script';
      readonly rule: 'sponsor_outflow_bounded';
    }
  | {
      readonly outputIndex: number;
      readonly reason: 'pays-sponsor';
      readonly rule: 'sponsor_outflow_zero';
    }
  | {
      readonly policyId: string;
      readonly reason: 'foreign-mint';
      readonly rule: 'no_foreign_scripts';
    }
  | {
      readonly reason:
        | 'collateral-inputs'
        | 'collateral-return-address'
        | 'collateral-return-datum'
        | 'collateral-return-reference-script'
        | 'no-collateral-return'
        | 'no-total-collateral'
        | 'phase-two-invalid';
      readonly rule: 'uses_shared_collateral';
    }
  | {
      readonly reason:
        | 'control-output-devices'
        | 'control-output-placement'
        | 'control-output-stake'
        | 'mint-count'
        | 'not-account-transaction'
        | 'registration-count'
        | 'state-nft-name-length'
        | 'state-nft-name';
      readonly rule: 'account_transaction';
    }
  | {
      readonly reason: 'duplicate-withdrawal' | 'foreign-withdrawal';
      readonly rewardAccount: Cardano.RewardAccount;
      readonly rule: 'no_foreign_scripts';
    }
  | {
      readonly reason: 'foreign-attached-script';
      readonly rule: 'no_foreign_scripts';
      readonly scriptHash: string;
    }
  | {
      readonly reason: 'foreign-voter';
      readonly rule: 'no_foreign_scripts';
      readonly scriptHash: string;
    }
  | {
      readonly reason: 'missing-script-data-hash';
      readonly rule: 'script_data_hash';
    }
  | {
      readonly reason: 'native-script';
      readonly rule: 'no_foreign_scripts';
    }
  | {
      readonly reason: 'no-upper-bound';
      readonly rule: 'bounded_validity';
    }
  | {
      readonly reason: 'not-creation';
      readonly rule: 'sponsor_outflow_bounded';
    }
  | {
      readonly reason: 'proposal-procedures' | 'treasury-donation';
      readonly rule: 'well_formed';
    }
  | {
      readonly reason: 'sponsor-voter';
      readonly rule: 'signers';
    }
  | {
      readonly reason: 'sponsor-withdrawal';
      readonly rewardAccount: Cardano.RewardAccount;
      readonly rule: 'signers' | 'sponsor_outflow_zero';
    }
  | {
      readonly reason: 'total-collateral-exceeds';
      readonly rule: 'uses_shared_collateral';
      readonly available: bigint;
      readonly totalCollateral: bigint;
    }
  | {
      readonly reason: 'underived-stake-credential';
      readonly rule: 'account_transaction';
      readonly stakeScriptHash: Hash28ByteBase16;
    }
  | {
      readonly reason: 'upper-bound-not-future';
      readonly rule: 'bounded_validity';
      readonly current: Cardano.Slot;
      readonly upperBound: Cardano.Slot;
    };

interface SponsorKeys {
  readonly paymentKeyHash: string | undefined;
  readonly stakeKeyHash: string | undefined;
}

interface Creation {
  readonly deposit: bigint;
  readonly controlLovelace: bigint;
  readonly stakeScriptHash: Hash28ByteBase16;
}

interface ResolvedInput {
  readonly input: Cardano.TxIn;
  /** Undefined when the caller resolved no output for the input. */
  readonly output: Cardano.TxOut | undefined;
}

/**
 * An input or a reference input holding a token of an account: its control
 * UTxO under the state NFT, or a grant UTxO under a grant token.
 */
interface AccountToken {
  readonly input: Cardano.TxIn;
  readonly output: Cardano.TxOut;
  /** The account's stake script hash, which the token name starts with. */
  readonly account: Hash28ByteBase16;
  readonly kind: 'control' | 'grant';
}

/** The account tokens the transaction spends and the control UTxOs it references. */
interface AccountTokens {
  readonly spent: readonly AccountToken[];
  readonly referencedControls: readonly AccountToken[];
}

/**
 * A logic the transaction names and where it names it. The hash is
 * undefined when the datum names nothing a script hash could be read from.
 */
interface NamedLogic {
  readonly logic: Hash28ByteBase16 | undefined;
  readonly control: CustodySponsorControlLocation;
  readonly stakeScriptHash: Hash28ByteBase16;
}

/** The redeemers and the datums of a witness set, as the bytes it states them in. */
interface WitnessScriptData {
  readonly redeemers: HexBlob | undefined;
  readonly datums: HexBlob | undefined;
}

/** What the transaction is to the account contract, or why it is neither an operation nor a creation. */
type AccountReading =
  | {
      readonly kind: 'refused';
      readonly violation: CustodySponsorRuleViolation;
    }
  | { readonly kind: 'creation'; readonly creation: Creation }
  | { readonly kind: 'operation' };

/** The transaction read against the sponsor and the account contract. */
interface Analysis {
  readonly transaction: Serialization.Transaction;
  readonly body: Cardano.TxBody;
  readonly witness: Cardano.Witness;
  readonly inputs: readonly ResolvedInput[];
  readonly referenceInputs: readonly ResolvedInput[];
  readonly sponsorInputs: readonly ResolvedInput[];
  /** Outputs that pay the sponsor address exactly, with their positions. */
  readonly sponsorOutputs: readonly IndexedOutput[];
  readonly foreignOutputs: readonly Cardano.TxOut[];
  /**
   * The withdrawals as the body states them, one per map entry: the decoded
   * body keeps one entry per reward account, the service reads them all.
   */
  readonly withdrawals: readonly Cardano.Withdrawal[];
  readonly witnessScriptData: WitnessScriptData;
  readonly reading: AccountReading;
  /** The stake scripts of the accounts the transaction belongs to. */
  readonly stakeScriptHashes: ReadonlySet<string>;
  readonly namedLogics: readonly NamedLogic[];
  /** The logics a withdrawal may run and an attached script may be: the ones named. */
  readonly logicHashes: ReadonlySet<string>;
  readonly sponsorKeys: SponsorKeys;
}

interface IndexedOutput {
  readonly output: Cardano.TxOut;
  readonly outputIndex: number;
}

type Rule = (
  analysis: Analysis,
  context: CustodySponsorRuleContext,
) => CustodySponsorRuleViolation | undefined;

const outpointKey = ({ txId, index }: Cardano.TxIn): string =>
  `${txId.toLowerCase()}#${index}`;

const toTxIn = ({ txId, index }: Cardano.TxIn): Cardano.TxIn => ({
  txId,
  index,
});

const paymentCredentialOf = (
  address: string,
): Cardano.Credential | undefined => {
  const parsed = Cardano.Address.fromString(address);
  return (
    parsed?.asBase() ??
    parsed?.asEnterprise() ??
    parsed?.asPointer()
  )?.getPaymentCredential();
};

const stakeCredentialOf = (address: string): Cardano.Credential | undefined => {
  const parsed = Cardano.Address.fromString(address);
  return (
    parsed?.asBase()?.getStakeCredential() ??
    parsed?.asReward()?.getPaymentCredential()
  );
};

const keyHashOf = (
  credential: Cardano.Credential | undefined,
): string | undefined =>
  credential?.type === Cardano.CredentialType.KeyHash
    ? credential.hash
    : undefined;

const scriptHashOf = (
  credential: Cardano.Credential | undefined,
): Hash28ByteBase16 | undefined =>
  credential?.type === Cardano.CredentialType.ScriptHash
    ? credential.hash
    : undefined;

const sponsorKeysOf = (address: Cardano.PaymentAddress): SponsorKeys => ({
  paymentKeyHash: keyHashOf(paymentCredentialOf(address)),
  stakeKeyHash: keyHashOf(stakeCredentialOf(address)),
});

const namesSponsorKey = (
  credential: Cardano.Credential,
  { paymentKeyHash, stakeKeyHash }: SponsorKeys,
): boolean =>
  credential.type === Cardano.CredentialType.KeyHash &&
  (credential.hash === paymentKeyHash || credential.hash === stakeKeyHash);

const isAccountOutput = (
  output: Cardano.TxOut,
  { contractVersion }: CustodySponsorRuleContext,
): boolean =>
  scriptHashOf(paymentCredentialOf(output.address)) ===
  contractVersion.accountValidatorHash;

const policyIdOf = (assetId: Cardano.AssetId): string =>
  Cardano.AssetId.getPolicyId(assetId);

/** The 28-byte hash a datum field holds, or undefined for a field of any other shape. */
const hashFieldOf = (
  field: Cardano.PlutusData | undefined,
): Hash28ByteBase16 | undefined =>
  Cardano.util.isPlutusBoundedBytes(field) &&
  field.length === HASH_28_BYTE_LENGTH
    ? Hash28ByteBase16(bytesToHex(field))
    : undefined;

/** The fields of an inline datum that is constructor 0, or undefined for any other datum. */
const inlineFieldsOf = (
  output: Cardano.TxOut,
): Cardano.PlutusData[] | undefined =>
  Cardano.util.isConstrPlutusData(output.datum) &&
  output.datum.constructor === 0n
    ? output.datum.fields.items
    : undefined;

/** The logic a control datum names: a 28-byte hash in its first field. */
const logicHashOf = (output: Cardano.TxOut): Hash28ByteBase16 | undefined =>
  hashFieldOf(inlineFieldsOf(output)?.[0]);

/** The devices a control datum lists: a list of 28-byte hashes in its second field. */
const devicesOf = (output: Cardano.TxOut): Hash28ByteBase16[] | undefined => {
  const list = inlineFieldsOf(output)?.[1];
  if (!Cardano.util.isPlutusList(list)) return undefined;
  const devices = list.items.map(hashFieldOf);
  return devices.every(
    (device): device is Hash28ByteBase16 => device !== undefined,
  )
    ? devices
    : undefined;
};

/**
 * The account token an input holds, when it is a control or a grant UTxO:
 * the output sits at an account address staked to a script and holds a
 * token under the account policy named after that very script, alone or
 * followed by a slot. The validator mints a token only into such an
 * output, so an output shaped otherwise is never read as an account's. The
 * control token wins when an output holds both kinds.
 */
const accountTokenOf = (
  { input, output }: ResolvedInput,
  context: CustodySponsorRuleContext,
): AccountToken | undefined => {
  if (output === undefined || !isAccountOutput(output, context)) {
    return undefined;
  }
  const account = scriptHashOf(stakeCredentialOf(output.address));
  if (account === undefined) return undefined;
  const kinds = [
    ...(output.value.assets ?? new Map<Cardano.AssetId, bigint>()),
  ].flatMap(([assetId, quantity]) => {
    if (
      policyIdOf(assetId) !== context.contractVersion.accountValidatorHash ||
      quantity <= 0n
    ) {
      return [];
    }
    const name = parseCustodyAccountTokenName(
      Cardano.AssetId.getAssetName(assetId),
    );
    return name?.stakeScriptHash === account ? [name.kind] : [];
  });
  if (kinds.length === 0) return undefined;
  return {
    input,
    output,
    account,
    kind: kinds.includes('state-nft') ? 'control' : 'grant',
  };
};

/**
 * The account a control output belongs to: an output at an account address
 * staked to a script, holding exactly one state NFT named after that script.
 * The validator pins the state NFT to such an output, so its datum names
 * the logic the account runs once the transaction lands.
 */
const controlOutputAccount = (
  output: Cardano.TxOut,
  context: CustodySponsorRuleContext,
): Hash28ByteBase16 | undefined => {
  if (!isAccountOutput(output, context)) return undefined;
  const account = scriptHashOf(stakeCredentialOf(output.address));
  if (account === undefined) return undefined;
  const stateNft = Cardano.AssetId.fromParts(
    Cardano.PolicyId(context.contractVersion.accountValidatorHash),
    Cardano.AssetName(account),
  );
  return output.value.assets?.get(stateNft) === 1n ? account : undefined;
};

/**
 * Every logic the transaction names: the one each control UTxO it spends or
 * references names, then the one each control output it writes names. A
 * creation names its initial logic in its control output, and an upgrade
 * names the logic it leaves in the control UTxO and the one it arrives at in
 * the control output.
 */
const namedLogicsOf = (
  { spent, referencedControls }: AccountTokens,
  body: Cardano.TxBody,
  context: CustodySponsorRuleContext,
): NamedLogic[] => [
  ...[
    ...spent.filter(({ kind }) => kind === 'control'),
    ...referencedControls,
  ].map(
    ({ input, output, account }): NamedLogic => ({
      logic: logicHashOf(output),
      control: { kind: 'control-utxo', input },
      stakeScriptHash: account,
    }),
  ),
  ...body.outputs.flatMap((output, outputIndex): NamedLogic[] => {
    const account = controlOutputAccount(output, context);
    return account === undefined
      ? []
      : [
          {
            logic: logicHashOf(output),
            control: { kind: 'control-output', outputIndex },
            stakeScriptHash: account,
          },
        ];
  }),
];

/**
 * A sponsor UTxO is the leased fee UTxO, the shared collateral, or any
 * output locked by the sponsor payment key: the sponsor's signature
 * authorises every one of them.
 */
const isSponsorInput = (
  { input, output }: ResolvedInput,
  context: CustodySponsorRuleContext,
  sponsorKeys: SponsorKeys,
): boolean => {
  const key = outpointKey(input);
  return (
    (context.mode.kind === 'fee' &&
      key === outpointKey(context.mode.feeUtxo[0])) ||
    key === outpointKey(context.collateralUtxo[0]) ||
    (output !== undefined &&
      sponsorKeys.paymentKeyHash !== undefined &&
      keyHashOf(paymentCredentialOf(output.address)) ===
        sponsorKeys.paymentKeyHash)
  );
};

/** Every credential a certificate names, any of which may have to sign. */
const certificateCredentials = (
  certificate: Cardano.Certificate,
): Cardano.Credential[] => {
  const named: (Cardano.Credential | undefined)[] = [];
  if ('stakeCredential' in certificate) named.push(certificate.stakeCredential);
  if ('dRep' in certificate && Cardano.isDRepCredential(certificate.dRep)) {
    named.push(certificate.dRep);
  }
  if ('dRepCredential' in certificate) named.push(certificate.dRepCredential);
  if ('coldCredential' in certificate) named.push(certificate.coldCredential);
  if ('hotCredential' in certificate) named.push(certificate.hotCredential);
  const poolIds: Cardano.PoolId[] = [];
  if ('poolId' in certificate) poolIds.push(certificate.poolId);
  if ('poolParameters' in certificate) {
    const { id, rewardAccount, owners } = certificate.poolParameters;
    poolIds.push(id);
    named.push(
      stakeCredentialOf(rewardAccount),
      ...owners.map(owner => stakeCredentialOf(owner)),
    );
  }
  for (const poolId of poolIds) {
    named.push({
      type: Cardano.CredentialType.KeyHash,
      hash: Cardano.PoolId.toKeyHash(poolId) as unknown as Hash28ByteBase16,
    });
  }
  return named.filter(
    (credential): credential is Cardano.Credential => credential !== undefined,
  );
};

const LOVELACE_KEY = '';

/** Lovelace and every asset a list of values holds, keyed by asset id ('' for lovelace). */
const balanceOf = (values: readonly Cardano.Value[]): Map<string, bigint> => {
  const balance = new Map<string, bigint>();
  const add = (key: string, quantity: bigint) =>
    balance.set(key, (balance.get(key) ?? 0n) + quantity);
  for (const value of values) {
    add(LOVELACE_KEY, value.coins);
    for (const [assetId, quantity] of value.assets ?? [])
      add(assetId, quantity);
  }
  return balance;
};

/** Reads each entry of the CBOR map the reader is at, definite or not. */
const readMapEntries = (
  reader: Serialization.CborReader,
  readEntry: () => void,
): void => {
  const count = reader.readStartMap();
  for (
    let read = 0;
    count === null
      ? reader.peekState() !== Serialization.CborReaderState.EndMap
      : read < count;
    read++
  ) {
    readEntry();
  }
};

/** The fields of an encoded body or witness set by key, each as the bytes it is stated in. */
const fieldsOf = (encoded: Uint8Array): Map<bigint, HexBlob> => {
  const reader = new Serialization.CborReader(bytesToHex(encoded));
  const fields = new Map<bigint, HexBlob>();
  readMapEntries(reader, () =>
    fields.set(reader.readUInt(), bytesToHex(reader.readEncodedValue())),
  );
  return fields;
};

const BODY_WITHDRAWALS = 5n;
const WITNESS_DATUMS = 4n;
const WITNESS_REDEEMERS = 5n;

/**
 * The body withdrawals and the witness script data as the transaction's
 * bytes state them, which is what the service reads: the decoded body keeps
 * one withdrawal per reward account, and the script data hash is taken over
 * the bytes the witness set carries.
 */
const statedOf = (
  transaction: Serialization.Transaction,
): Pick<Analysis, 'withdrawals' | 'witnessScriptData'> => {
  const reader = new Serialization.CborReader(HexBlob(transaction.toCbor()));
  reader.readStartArray();
  const body = fieldsOf(reader.readEncodedValue());
  const witnessSet = fieldsOf(reader.readEncodedValue());
  const withdrawals: Cardano.Withdrawal[] = [];
  const encodedWithdrawals = body.get(BODY_WITHDRAWALS);
  if (encodedWithdrawals !== undefined) {
    const withdrawalReader = new Serialization.CborReader(encodedWithdrawals);
    readMapEntries(withdrawalReader, () =>
      withdrawals.push({
        stakeAddress: Cardano.RewardAccount(
          Cardano.Address.fromBytes(
            bytesToHex(withdrawalReader.readByteString()),
          ).toBech32(),
        ),
        quantity: withdrawalReader.readUInt(),
      }),
    );
  }
  return {
    withdrawals,
    witnessScriptData: {
      redeemers: witnessSet.get(WITNESS_REDEEMERS),
      datums: witnessSet.get(WITNESS_DATUMS),
    },
  };
};

/**
 * Reads an account creation, or the reason the transaction is none:
 * exactly one token minted under the account policy, named with the 28
 * bytes of a stake script hash, exactly one registration of a script stake
 * credential with its deposit, the token named after that credential and
 * held by exactly one output at an account address staked to it, and that
 * credential the version's stake script of a device the output's datum
 * lists. A datum listing more devices than a well formed state is refused
 * before any script is derived.
 */
const readCreation = (
  body: Cardano.TxBody,
  context: CustodySponsorRuleContext,
): Creation | CustodySponsorRuleViolation => {
  const refuse = (
    reason: Extract<
      CustodySponsorRuleViolation,
      { rule: 'account_transaction'; stakeScriptHash?: never; count?: never }
    >['reason'],
  ): CustodySponsorRuleViolation => ({ rule: 'account_transaction', reason });
  const { accountValidatorHash } = context.contractVersion;
  const minted = [...(body.mint ?? new Map<Cardano.AssetId, bigint>())].filter(
    ([assetId]) => policyIdOf(assetId) === accountValidatorHash,
  );
  if (minted.length === 0) return refuse('not-account-transaction');
  const [[assetId, quantity]] = minted;
  if (minted.length !== 1 || quantity !== 1n) return refuse('mint-count');
  const name = parseCustodyAccountTokenName(
    Cardano.AssetId.getAssetName(assetId),
  );
  if (name?.kind !== 'state-nft') return refuse('state-nft-name-length');
  const registrations = (body.certificates ?? []).filter(
    (certificate): certificate is Cardano.NewStakeAddressCertificate =>
      certificate.__typename === Cardano.CertificateType.Registration &&
      certificate.stakeCredential.type === Cardano.CredentialType.ScriptHash,
  );
  if (registrations.length !== 1) return refuse('registration-count');
  const [registration] = registrations;
  const stakeScriptHash = registration.stakeCredential.hash;
  if ((Cardano.AssetId.getAssetName(assetId) as string) !== stakeScriptHash) {
    return refuse('state-nft-name');
  }
  const holders = body.outputs.filter(
    output => output.value.assets?.get(assetId) === 1n,
  );
  if (holders.length !== 1 || !isAccountOutput(holders[0], context)) {
    return refuse('control-output-placement');
  }
  const [controlOutput] = holders;
  if (
    scriptHashOf(stakeCredentialOf(controlOutput.address)) !== stakeScriptHash
  ) {
    return refuse('control-output-stake');
  }
  const devices = devicesOf(controlOutput);
  if (devices === undefined) return refuse('control-output-devices');
  if (devices.length > MAX_DEVICES) {
    return {
      rule: 'account_transaction',
      reason: 'device-count',
      count: devices.length,
      limit: MAX_DEVICES,
    };
  }
  const chainId = chainIdFromNetworkMagic(context.networkMagic);
  const isDerived = devices.some(
    device =>
      identityOfValidatedCreator({
        contractVersion: context.contractVersion,
        creatorKeyHash: device,
        chainId,
      }).stakeScriptHash === stakeScriptHash,
  );
  if (!isDerived) {
    return {
      rule: 'account_transaction',
      reason: 'underived-stake-credential',
      stakeScriptHash,
    };
  }
  return {
    deposit: registration.deposit,
    controlLovelace: controlOutput.value.coins,
    stakeScriptHash,
  };
};

/** The accounts whose control UTxO the transaction spends or references. */
const controlledAccountsOf = ({
  spent,
  referencedControls,
}: AccountTokens): Set<string> =>
  new Set(
    [...spent, ...referencedControls]
      .filter(({ kind }) => kind === 'control')
      .map(({ account }) => account),
  );

/**
 * Reads what the transaction does to the account contract. A referenced
 * control UTxO serves only an account the transaction operates, so one of
 * any other account is refused first, even beside a creation. A
 * transaction spending no account token is a creation, or no account
 * transaction at all. One spending a token is an operation, and every
 * account it operates needs its control UTxO spent or referenced, as the
 * contract needs on the owner, the sweep and the agent path alike.
 */
const readAccountTransaction = (
  body: Cardano.TxBody,
  { spent, referencedControls }: AccountTokens,
  context: CustodySponsorRuleContext,
): AccountReading => {
  const refuse = (
    reason: 'foreign-referenced-control' | 'orphan-grant',
    { input, account }: AccountToken,
  ): AccountReading => ({
    kind: 'refused',
    violation: {
      rule: 'account_transaction',
      reason,
      input,
      stakeScriptHash: account,
    },
  });
  const operated = new Set(spent.map(({ account }) => account));
  const foreignControl = referencedControls.find(
    ({ account }) => !operated.has(account),
  );
  if (foreignControl) {
    return refuse('foreign-referenced-control', foreignControl);
  }
  if (spent.length === 0) {
    const creation = readCreation(body, context);
    return 'rule' in creation
      ? { kind: 'refused', violation: creation }
      : { kind: 'creation', creation };
  }
  const controlled = controlledAccountsOf({ spent, referencedControls });
  const orphan = spent.find(({ account }) => !controlled.has(account));
  return orphan ? refuse('orphan-grant', orphan) : { kind: 'operation' };
};

/**
 * The stake scripts of the accounts the transaction belongs to: those of
 * the control UTxOs it spends or references, which name them, and the one
 * it registers at creation. A grant UTxO alone names none: an agent spend
 * references the control UTxO of its account.
 */
const stakeScriptHashesOf = (
  tokens: AccountTokens,
  reading: AccountReading,
): Set<string> => {
  const hashes = controlledAccountsOf(tokens);
  if (reading.kind === 'creation') {
    hashes.add(reading.creation.stakeScriptHash);
  }
  return hashes;
};

const analyse = (
  transaction: Serialization.Transaction,
  resolvedInputs: readonly Cardano.Utxo[],
  context: CustodySponsorRuleContext,
): Analysis => {
  const body = transaction.body().toCore();
  const sponsorKeys = sponsorKeysOf(context.sponsorAddress);
  const resolutions = new Map(
    resolvedInputs.map(([input, output]) => [outpointKey(input), output]),
  );
  const resolve = (input: Cardano.TxIn): ResolvedInput => ({
    input: toTxIn(input),
    output: resolutions.get(outpointKey(input)),
  });
  const inputs = body.inputs.map(resolve);
  const referenceInputs = (body.referenceInputs ?? []).map(resolve);
  const sponsorInputs = inputs.filter(input =>
    isSponsorInput(input, context, sponsorKeys),
  );
  const tokens: AccountTokens = {
    spent: inputs
      .filter(input => !sponsorInputs.includes(input))
      .flatMap(input => accountTokenOf(input, context) ?? []),
    referencedControls: referenceInputs
      .flatMap(input => accountTokenOf(input, context) ?? [])
      .filter(({ kind }) => kind === 'control'),
  };
  const reading = readAccountTransaction(body, tokens, context);
  const namedLogics = namedLogicsOf(tokens, body, context);
  const sponsorOutputs = body.outputs.flatMap((output, outputIndex) =>
    output.address === context.sponsorAddress ? [{ output, outputIndex }] : [],
  );
  return {
    transaction,
    body,
    witness: transaction.witnessSet().toCore(),
    inputs,
    referenceInputs,
    sponsorInputs,
    sponsorOutputs,
    foreignOutputs: body.outputs.filter(
      output =>
        output.address !== context.sponsorAddress &&
        !isAccountOutput(output, context),
    ),
    ...statedOf(transaction),
    reading,
    stakeScriptHashes: stakeScriptHashesOf(tokens, reading),
    namedLogics,
    logicHashes: new Set(namedLogics.flatMap(({ logic }) => logic ?? [])),
    sponsorKeys,
  };
};

const wellFormed: Rule = ({ transaction, body }) => {
  const size = transaction.toCbor().length / 2;
  if (size > MAX_TRANSACTION_BYTES) {
    return {
      rule: 'well_formed',
      reason: 'too-large',
      size,
      limit: MAX_TRANSACTION_BYTES,
    };
  }
  if ((body.proposalProcedures ?? []).length > 0) {
    return { rule: 'well_formed', reason: 'proposal-procedures' };
  }
  return body.donation === undefined
    ? undefined
    : { rule: 'well_formed', reason: 'treasury-donation' };
};

/**
 * Fee mode spends the leased fee UTxO and no other sponsor UTxO; collateral
 * mode spends none. An input whose payment credential cannot be read
 * cannot be told from the sponsor's.
 */
const sponsorInputsRule: Rule = (
  { inputs, sponsorInputs },
  { mode },
): CustodySponsorRuleViolation | undefined => {
  const rule =
    mode.kind === 'fee' ? 'uses_leased_fee_input' : 'no_sponsor_inputs';
  const feeKey = mode.kind === 'fee' ? outpointKey(mode.feeUtxo[0]) : undefined;
  if (
    mode.kind === 'fee' &&
    !inputs.some(({ input }) => outpointKey(input) === feeKey)
  ) {
    return {
      rule: 'uses_leased_fee_input',
      reason: 'fee-input-missing',
      input: toTxIn(mode.feeUtxo[0]),
    };
  }
  const unreadable = inputs.find(
    ({ output }) =>
      output !== undefined && paymentCredentialOf(output.address) === undefined,
  );
  if (unreadable) {
    return { rule, reason: 'unreadable-input', input: unreadable.input };
  }
  const extra = sponsorInputs.find(
    ({ input }) => outpointKey(input) !== feeKey,
  );
  return extra
    ? { rule, reason: 'sponsor-input', input: extra.input }
    : undefined;
};

/**
 * The transaction is not flagged as failing phase two, and its collateral
 * is exactly the shared collateral UTxO, returned plainly to the sponsor,
 * with the total collateral set within what it holds. The ledger also
 * takes collateral of at least the collateral percentage of the fee, so a
 * fee above what the shared collateral covers is refused: the service
 * would refuse the total it needs, and the ledger any less.
 */
const sharedCollateral: Rule = ({ transaction, body }, context) => {
  const refuse = (
    reason: Exclude<
      Extract<
        CustodySponsorRuleViolation,
        { rule: 'uses_shared_collateral' }
      >['reason'],
      'fee-exceeds-collateral' | 'total-collateral-exceeds'
    >,
  ): CustodySponsorRuleViolation => ({
    rule: 'uses_shared_collateral',
    reason,
  });
  if (!transaction.isValid()) return refuse('phase-two-invalid');
  const collaterals = body.collaterals ?? [];
  if (
    collaterals.length !== 1 ||
    outpointKey(collaterals[0]) !== outpointKey(context.collateralUtxo[0])
  ) {
    return refuse('collateral-inputs');
  }
  const { collateralReturn, totalCollateral } = body;
  if (!collateralReturn) return refuse('no-collateral-return');
  if (collateralReturn.address !== context.sponsorAddress) {
    return refuse('collateral-return-address');
  }
  if (
    collateralReturn.datum !== undefined ||
    collateralReturn.datumHash !== undefined
  ) {
    return refuse('collateral-return-datum');
  }
  if (collateralReturn.scriptReference !== undefined) {
    return refuse('collateral-return-reference-script');
  }
  if (totalCollateral === undefined) return refuse('no-total-collateral');
  const available = context.collateralUtxo[1].value.coins;
  if (totalCollateral > available) {
    return {
      rule: 'uses_shared_collateral',
      reason: 'total-collateral-exceeds',
      totalCollateral,
      available,
    };
  }
  const percentage = BigInt(context.collateralPercentage);
  return body.fee * percentage > available * 100n
    ? {
        rule: 'uses_shared_collateral',
        reason: 'fee-exceeds-collateral',
        fee: body.fee,
        limit: (available * 100n) / percentage,
      }
    : undefined;
};

const boundedValidity: Rule = ({ body }, context) => {
  const upperBound = body.validityInterval?.invalidHereafter;
  if (upperBound === undefined) {
    return { rule: 'bounded_validity', reason: 'no-upper-bound' };
  }
  if (upperBound > context.latestValiditySlot) {
    return {
      rule: 'bounded_validity',
      reason: 'upper-bound-too-late',
      upperBound,
      latest: context.latestValiditySlot,
    };
  }
  return upperBound <= context.currentSlot
    ? {
        rule: 'bounded_validity',
        reason: 'upper-bound-not-future',
        upperBound,
        current: context.currentSlot,
      }
    : undefined;
};

const accountTransaction: Rule = ({ reading }) =>
  reading.kind === 'refused' ? reading.violation : undefined;

/**
 * Every logic the transaction names is one the service knows. The proxy
 * runs whatever registered script a control datum names, so the service
 * pays for and lends collateral to no account under rules it has not read,
 * and refuses a control datum that names no script hash at all.
 */
const knownLogic: Rule = ({ namedLogics }, { contractVersion }) => {
  const known = new Set<string>(contractVersion.logics.map(({ hash }) => hash));
  for (const { logic, control, stakeScriptHash } of namedLogics) {
    if (logic === undefined) {
      return {
        rule: 'known_logic',
        reason: 'logic-missing',
        control,
        stakeScriptHash,
      };
    }
    if (!known.has(logic)) {
      return {
        rule: 'known_logic',
        reason: 'unknown-logic',
        control,
        logic,
        stakeScriptHash,
      };
    }
  }
  return undefined;
};

/**
 * The leased fee UTxO pays for an account creation and nothing else: an
 * operation on an existing account pays its own fee and takes the
 * collateral route, whatever it draws. The fee stays within the service's
 * limit, and the fee UTxO is drawn down by exactly the fee, the
 * registration deposit and the control output, within the sponsored limit,
 * and returns as one plain change output the pool can spend.
 */
const sponsorOutflowBounded = (
  { body, sponsorOutputs, reading }: Analysis,
  mode: Extract<CustodySponsorMode, { kind: 'fee' }>,
): CustodySponsorRuleViolation | undefined => {
  const rule = 'sponsor_outflow_bounded';
  if (reading.kind !== 'creation') return { rule, reason: 'not-creation' };
  if (body.fee > MAX_FEE_LOVELACE) {
    return {
      rule,
      reason: 'fee-exceeds-limit',
      fee: body.fee,
      limit: MAX_FEE_LOVELACE,
    };
  }
  for (const { output, outputIndex } of sponsorOutputs) {
    if (output.datum !== undefined || output.datumHash !== undefined) {
      return { rule, reason: 'sponsor-output-datum', outputIndex };
    }
    if (output.scriptReference !== undefined) {
      return { rule, reason: 'sponsor-output-reference-script', outputIndex };
    }
  }
  if (sponsorOutputs.length !== 1) {
    return {
      rule,
      reason: 'sponsor-output-count',
      count: sponsorOutputs.length,
    };
  }
  const sponsored =
    mode.feeUtxo[1].value.coins - sponsorOutputs[0].output.value.coins;
  const { deposit, controlLovelace } = reading.creation;
  const expected = body.fee + deposit + controlLovelace;
  if (sponsored !== expected) {
    return { rule, reason: 'draw-mismatch', sponsored, expected };
  }
  return sponsored > mode.maxSponsoredLovelace
    ? {
        rule,
        reason: 'draw-exceeds-limit',
        sponsored,
        limit: mode.maxSponsoredLovelace,
      }
    : undefined;
};

/** In collateral mode nothing pays the sponsor key and nothing draws from its reward account. */
const sponsorOutflowZero = ({
  body,
  withdrawals,
  sponsorKeys,
}: Analysis): CustodySponsorRuleViolation | undefined => {
  const outputIndex = body.outputs.findIndex(
    output =>
      sponsorKeys.paymentKeyHash !== undefined &&
      keyHashOf(paymentCredentialOf(output.address)) ===
        sponsorKeys.paymentKeyHash,
  );
  if (outputIndex >= 0) {
    return {
      rule: 'sponsor_outflow_zero',
      reason: 'pays-sponsor',
      outputIndex,
    };
  }
  const withdrawal = withdrawals.find(
    ({ stakeAddress }) =>
      sponsorKeys.stakeKeyHash !== undefined &&
      keyHashOf(stakeCredentialOf(stakeAddress)) === sponsorKeys.stakeKeyHash,
  );
  return withdrawal
    ? {
        rule: 'sponsor_outflow_zero',
        reason: 'sponsor-withdrawal',
        rewardAccount: withdrawal.stakeAddress,
      }
    : undefined;
};

const sponsorOutflow: Rule = (analysis, { mode }) =>
  mode.kind === 'fee'
    ? sponsorOutflowBounded(analysis, mode)
    : sponsorOutflowZero(analysis);

/** Outputs away from the sponsor and the account are covered by what non-sponsor inputs and withdrawals bring. */
const noSponsorValueElsewhere: Rule = ({
  withdrawals,
  inputs,
  sponsorInputs,
  foreignOutputs,
  sponsorKeys,
}) => {
  const supply = balanceOf(
    inputs
      .filter(input => !sponsorInputs.includes(input))
      .flatMap(({ output }) => (output ? [output.value] : [])),
  );
  for (const { stakeAddress, quantity } of withdrawals) {
    const isSponsors =
      sponsorKeys.stakeKeyHash !== undefined &&
      keyHashOf(stakeCredentialOf(stakeAddress)) === sponsorKeys.stakeKeyHash;
    if (!isSponsors) {
      supply.set(LOVELACE_KEY, (supply.get(LOVELACE_KEY) ?? 0n) + quantity);
    }
  }
  const demand = balanceOf(foreignOutputs.map(output => output.value));
  for (const [key, demanded] of demand) {
    const supplied = supply.get(key) ?? 0n;
    if (demanded > supplied) {
      return {
        rule: 'no_sponsor_value_elsewhere',
        reason: 'uncovered-outflow',
        demanded,
        supplied,
        ...(key === LOVELACE_KEY ? {} : { assetId: key as Cardano.AssetId }),
      };
    }
  }
  return undefined;
};

/**
 * Lace's own rule on reference inputs: one carrying a script must be a
 * version's parked script UTxO on the network, carrying exactly the script
 * parked there, and a parked script's UTxO must carry its script.
 */
const foreignReferenceScriptOf = (
  referenceInputs: readonly ResolvedInput[],
  { contractVersion, networkMagic }: CustodySponsorRuleContext,
): CustodySponsorRuleViolation | undefined => {
  const parked = new Map(
    (contractVersion.referenceScripts[networkMagic] ?? []).map(
      ({ txIn, scriptHash }) => [outpointKey(txIn), scriptHash],
    ),
  );
  for (const { input, output } of referenceInputs) {
    const script = output?.scriptReference;
    const scriptHash = script && Serialization.Script.fromCore(script).hash();
    const expected = parked.get(outpointKey(input));
    const isForeign =
      expected === undefined
        ? scriptHash !== undefined
        : output !== undefined && scriptHash !== expected;
    if (isForeign) {
      return {
        rule: 'no_foreign_scripts',
        reason: 'foreign-reference-script',
        input,
        ...(scriptHash && { scriptHash }),
      };
    }
  }
  return undefined;
};

/**
 * Every script the transaction runs or attaches belongs to the account.
 * Inputs and mints use the account proxy alone. A certificate or a vote may
 * name the proxy or the stake script of an account the transaction belongs
 * to. A logic its control datums name may also run through a withdrawal,
 * of zero only, and be attached. No reward account is drawn from twice.
 */
const noForeignScripts: Rule = (
  {
    body,
    witness,
    inputs,
    referenceInputs,
    withdrawals,
    stakeScriptHashes,
    logicHashes,
  },
  context,
) => {
  const rule = 'no_foreign_scripts';
  const proxy: string = context.contractVersion.accountValidatorHash;
  const accountScripts = new Set<string>([proxy, ...stakeScriptHashes]);
  const runnable = new Set<string>([...accountScripts, ...logicHashes]);
  for (const { input, output } of inputs) {
    const scriptHash =
      output && scriptHashOf(paymentCredentialOf(output.address));
    if (scriptHash !== undefined && scriptHash !== proxy) {
      return { rule, reason: 'foreign-script-input', input, scriptHash };
    }
  }
  for (const assetId of body.mint?.keys() ?? []) {
    const policyId = policyIdOf(assetId);
    if (policyId !== proxy) return { rule, reason: 'foreign-mint', policyId };
  }
  for (const [certificateIndex, certificate] of (
    body.certificates ?? []
  ).entries()) {
    const scriptHash = certificateCredentials(certificate)
      .map(scriptHashOf)
      .find(hash => hash !== undefined && !accountScripts.has(hash));
    if (scriptHash) {
      return {
        rule,
        reason: 'foreign-certificate',
        certificateIndex,
        scriptHash,
      };
    }
  }
  const drawn = new Set<string>();
  for (const { stakeAddress: rewardAccount, quantity } of withdrawals) {
    if (drawn.has(rewardAccount)) {
      return { rule, reason: 'duplicate-withdrawal', rewardAccount };
    }
    drawn.add(rewardAccount);
    const scriptHash = scriptHashOf(stakeCredentialOf(rewardAccount));
    if (scriptHash !== undefined && !runnable.has(scriptHash)) {
      return { rule, reason: 'foreign-withdrawal', rewardAccount };
    }
    if (
      scriptHash !== undefined &&
      logicHashes.has(scriptHash) &&
      quantity !== 0n
    ) {
      return {
        rule,
        reason: 'logic-draw',
        rewardAccount,
        logic: scriptHash,
        quantity,
      };
    }
  }
  for (const { voter } of body.votingProcedures ?? []) {
    const scriptHash = scriptHashOf(voter.credential);
    if (scriptHash !== undefined && !accountScripts.has(scriptHash)) {
      return { rule, reason: 'foreign-voter', scriptHash };
    }
  }
  const scripts = witness.scripts ?? [];
  if (scripts.some(script => Cardano.isNativeScript(script))) {
    return { rule, reason: 'native-script' };
  }
  for (const script of scripts) {
    const scriptHash = Serialization.Script.fromCore(script).hash();
    if (!runnable.has(scriptHash)) {
      return { rule, reason: 'foreign-attached-script', scriptHash };
    }
  }
  return foreignReferenceScriptOf(referenceInputs, context);
};

/**
 * The Plutus languages of the scripts the transaction attaches, then of the
 * reference scripts its inputs and reference inputs carry: the service's
 * language view covers all of them, not only the scripts that run.
 */
const languagesOf = ({
  witness,
  inputs,
  referenceInputs,
}: Analysis): Cardano.PlutusLanguageVersion[] => [
  ...(witness.scripts ?? []).flatMap(script =>
    Cardano.isPlutusScript(script) ? [script.version] : [],
  ),
  ...[...inputs, ...referenceInputs].flatMap(({ output }) =>
    output?.scriptReference && Cardano.isPlutusScript(output.scriptReference)
      ? [output.scriptReference.version]
      : [],
  ),
];

/** The redeemers that stand in for a witness set carrying datums and no redeemers. */
const EMPTY_REDEEMERS = 'a0';

/**
 * The script data hash the body commits to is the one the witness set's
 * redeemers and datums hash to, under the cost models, with the language
 * view of every attached and referenced script. Every script an account
 * runs is Plutus V3, so a transaction carrying any other language is
 * refused before a view is formed.
 */
const scriptDataHash: Rule = (analysis, { costModels }) => {
  const rule = 'script_data_hash';
  const declared = analysis.body.scriptIntegrityHash;
  const { redeemers, datums } = analysis.witnessScriptData;
  if (redeemers === undefined && datums === undefined) {
    return declared === undefined
      ? undefined
      : { rule, reason: 'unexpected-script-data-hash', declared };
  }
  if (declared === undefined)
    return { rule, reason: 'missing-script-data-hash' };
  const languages = languagesOf(analysis);
  const foreign = languages.find(
    language => language !== Cardano.PlutusLanguageVersion.V3,
  );
  if (foreign !== undefined) {
    return { rule, reason: 'non-v3-script', language: foreign };
  }
  const views = new Serialization.Costmdls();
  for (const language of new Set(languages)) {
    const costs = costModels.get(language);
    if (!costs) return { rule, reason: 'missing-cost-model', language };
    views.insert(new Serialization.CostModel(language, costs));
  }
  const computed = blake2b.hash<Hash32ByteBase16>(
    HexBlob(
      `${redeemers ?? EMPTY_REDEEMERS}${
        datums ?? ''
      }${views.languageViewsEncoding()}`,
    ),
    32,
  );
  return computed === declared
    ? undefined
    : { rule, reason: 'script-data-hash-mismatch', declared, computed };
};

/** Neither sponsor key signs for anything but the sponsor's own inputs. */
const signers: Rule = ({ body, withdrawals, sponsorKeys }) => {
  const keyHash = (body.requiredExtraSignatures ?? []).find(
    signer =>
      signer === sponsorKeys.paymentKeyHash ||
      signer === sponsorKeys.stakeKeyHash,
  );
  if (keyHash) {
    return { rule: 'signers', reason: 'sponsor-required-signer', keyHash };
  }
  const withdrawal = withdrawals.find(({ stakeAddress }) => {
    const credential = stakeCredentialOf(stakeAddress);
    return credential !== undefined && namesSponsorKey(credential, sponsorKeys);
  });
  if (withdrawal) {
    return {
      rule: 'signers',
      reason: 'sponsor-withdrawal',
      rewardAccount: withdrawal.stakeAddress,
    };
  }
  const certificateIndex = (body.certificates ?? []).findIndex(certificate =>
    certificateCredentials(certificate).some(credential =>
      namesSponsorKey(credential, sponsorKeys),
    ),
  );
  if (certificateIndex >= 0) {
    return { rule: 'signers', reason: 'sponsor-certificate', certificateIndex };
  }
  return (body.votingProcedures ?? []).some(({ voter }) =>
    namesSponsorKey(voter.credential, sponsorKeys),
  )
    ? { rule: 'signers', reason: 'sponsor-voter' }
    : undefined;
};

/** The service's rules in its check order; it evaluates the scripts between the last two. */
const RULES: readonly Rule[] = [
  wellFormed,
  sponsorInputsRule,
  sharedCollateral,
  boundedValidity,
  accountTransaction,
  knownLogic,
  sponsorOutflow,
  noSponsorValueElsewhere,
  noForeignScripts,
  scriptDataHash,
  signers,
];

/**
 * Every rule of the fee sponsor service's policy that a transaction breaks,
 * at most one per rule and in the service's check order, so the first is
 * the one the service would answer with. Lace checks its custody builds
 * with it before asking the sponsor for a witness, so a refusal from the
 * service points at a real defect rather than a build Lace knew to be wrong.
 *
 * The script evaluation rule is not mirrored: it needs the chain. Of the
 * sponsor's UTxOs, only the leased fee UTxO, the shared collateral and
 * outputs locked by the sponsor payment key are recognised; the service
 * also knows the rest of its pool. The service knows the logics its
 * operator lists, which Lace takes to be the contract version's. Beyond the
 * service's rules, the shared collateral rule refuses a fee above what the
 * shared collateral covers, which the ledger would refuse after the service
 * signed, and the script rule refuses a reference script other than the
 * version's parked scripts on the network.
 *
 * @param resolvedInputs - the outputs the transaction's inputs spend and its
 *   reference inputs name; an input or a reference input without one is
 *   read as the service reads one the chain does not know, which is never
 *   an account's control or grant UTxO and carries no reference script
 */
export const findCustodySponsorRuleViolations = (
  transaction: Serialization.Transaction,
  resolvedInputs: readonly Cardano.Utxo[],
  context: CustodySponsorRuleContext,
): CustodySponsorRuleViolation[] => {
  const analysis = analyse(transaction, resolvedInputs, context);
  return RULES.flatMap(rule => {
    const violation = rule(analysis, context);
    return violation ? [violation] : [];
  });
};
