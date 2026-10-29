import { Cardano } from '@cardano-sdk/core';

import {
  ACCOUNT_VALIDATOR_COMPILED_CODE,
  ACCOUNT_VALIDATOR_HASH,
  CUSTODY_BLUEPRINT_SHA256,
  CUSTODY_CONTRACT_COMPILER,
  CUSTODY_CONTRACT_REVISION,
  LOGIC_V1_COMPILED_CODE,
  LOGIC_V1_HASH,
  UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE,
  UNAPPLIED_STAKE_VALIDATOR_HASH,
} from './blueprint';
import { PREPROD_REFERENCE_SCRIPTS } from './blueprint/reference-scripts';
import { fail, ok } from './result';

import type { CustodyReferenceScript } from './blueprint';
import type { CustodyResult } from './result';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type { HexBlob } from '@cardano-sdk/util';

/**
 * A logic script accounts of a contract version may run: a logic validator
 * of the blueprint applied to the version's account proxy hash. The proxy
 * runs the logic a control datum names through a withdrawal from the
 * logic's script stake credential.
 */
export interface CustodyLogic {
  /** Hash of the applied script: what a control datum names and the stake credential withdrawn from. */
  readonly hash: Hash28ByteBase16;
  /** The blueprint module of the logic validator, such as `logic_v1`. */
  readonly title: string;
  /** The applied script, ready to attach as a transaction witness. */
  readonly script: Cardano.PlutusScript;
}

/**
 * One pinned build of the custody contract. Every account is bound for life
 * to the account proxy its stake script was applied to, so records and
 * persisted accounts name their version by the proxy hash, which they call
 * the account validator hash. The account's rules live in the logic script
 * its control datum names, which a device may replace.
 */
export interface CustodyContractVersion {
  /**
   * The registry key: the hash of the account proxy, which is the account
   * payment credential, the account token policy id and the parameter of the
   * stake and logic scripts.
   */
  readonly accountValidatorHash: Hash28ByteBase16;
  /** The account proxy, ready to attach as a transaction witness. */
  readonly accountValidator: Cardano.PlutusScript;
  /**
   * Every logic Lace accepts for this version's accounts, by applied hash.
   * An account whose control datum names any other logic runs rules Lace
   * has not reviewed.
   */
  readonly logics: readonly CustodyLogic[];
  /** The hash of the logic new accounts run; one of `logics`. */
  readonly currentLogicHash: Hash28ByteBase16;
  readonly unappliedStakeValidator: {
    readonly compiledCode: HexBlob;
    readonly hash: Hash28ByteBase16;
    /**
     * Bit length of the flat-encoded program body. The trailing filler of the
     * unapplied program allows several lengths, so it is pinned with the
     * blueprint and proven by the Aiken CLI vectors in the tests.
     */
    readonly bodyBitLength: number;
  };
  /**
   * UTxOs that hold this version's proxy and logic scripts as reference
   * scripts, by network magic. A network without an entry has none, so its
   * transactions attach the scripts.
   */
  readonly referenceScripts: Readonly<
    Partial<Record<number, readonly CustodyReferenceScript[]>>
  >;
  readonly blueprintSha256: string;
  readonly compiler: string;
  readonly revision: string;
  /**
   * The CIP-1854 account index `a` of `m/1854'/1815'/a'` whose role 0 keys
   * are this version's creator and device keys, per network magic. A
   * network without an entry uses `default`. Read it through
   * `custodyDeviceAccountIndex`.
   */
  readonly deviceAccountIndex: {
    readonly default: number;
    readonly byNetworkMagic: Readonly<Partial<Record<number, number>>>;
  };
}

export interface CustodyUnsupportedContractVersion {
  readonly code: 'unsupported-contract-version';
  readonly accountValidatorHash: string;
}

interface CustodyUnknownLogic {
  readonly code: 'unknown-logic';
  readonly logic: string;
}

const LOGIC_V1: CustodyLogic = {
  hash: LOGIC_V1_HASH,
  title: 'logic_v1',
  script: {
    __type: Cardano.ScriptType.Plutus,
    bytes: LOGIC_V1_COMPILED_CODE,
    version: Cardano.PlutusLanguageVersion.V3,
  },
};

const CUSTODY_CONTRACT_B48545F: CustodyContractVersion = {
  accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
  accountValidator: {
    __type: Cardano.ScriptType.Plutus,
    bytes: ACCOUNT_VALIDATOR_COMPILED_CODE,
    version: Cardano.PlutusLanguageVersion.V3,
  },
  logics: [LOGIC_V1],
  currentLogicHash: LOGIC_V1.hash,
  unappliedStakeValidator: {
    compiledCode: UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE,
    hash: UNAPPLIED_STAKE_VALIDATOR_HASH,
    bodyBitLength: 9658,
  },
  referenceScripts: {
    [Cardano.NetworkMagics.Preprod]: PREPROD_REFERENCE_SCRIPTS,
  },
  blueprintSha256: CUSTODY_BLUEPRINT_SHA256,
  compiler: CUSTODY_CONTRACT_COMPILER,
  revision: CUSTODY_CONTRACT_REVISION,
  // Testnet keys never share an account with Mainnet keys: a testnet creation
  // publishes the creator key hash, and the stake credential derived from it
  // is valid on every network, so a shared account would let anyone watching
  // a testnet pre-register the same creator's Mainnet credential.
  deviceAccountIndex: {
    default: 1,
    byNetworkMagic: { [Cardano.NetworkMagics.Mainnet]: 0 },
  },
};

/** Every supported contract version, oldest first. */
export const SUPPORTED_CUSTODY_CONTRACT_VERSIONS: readonly CustodyContractVersion[] =
  [CUSTODY_CONTRACT_B48545F];

/** The version Lace creates new custody accounts with. */
export const CURRENT_CUSTODY_CONTRACT_VERSION = CUSTODY_CONTRACT_B48545F;

/**
 * The supported contract version an account validator hash names. Any other
 * hash is refused: Lace cannot derive or verify identities, nor sign for
 * accounts, of a build it has not pinned.
 */
export const findCustodyContractVersion = (
  accountValidatorHash: string,
): CustodyResult<CustodyContractVersion, CustodyUnsupportedContractVersion> => {
  const version = SUPPORTED_CUSTODY_CONTRACT_VERSIONS.find(
    candidate => candidate.accountValidatorHash === accountValidatorHash,
  );
  return version
    ? ok(version)
    : fail({ code: 'unsupported-contract-version', accountValidatorHash });
};

/**
 * The logic of a version's catalogue that a control datum names. Any other
 * hash is refused: Lace cannot judge what an account under unreviewed rules
 * allows, so it neither operates nor signs for one.
 */
export const findCustodyLogic = (
  version: CustodyContractVersion,
  logicHash: string,
): CustodyResult<CustodyLogic, CustodyUnknownLogic> => {
  const logic = version.logics.find(candidate => candidate.hash === logicHash);
  return logic ? ok(logic) : fail({ code: 'unknown-logic', logic: logicHash });
};

/**
 * The UTxOs that park a version's proxy and logic scripts on a network, as
 * the chain holds them: each at its pinned outref and address, with its
 * pinned lovelace and the vendored script as its reference script. None on
 * a network without parked scripts.
 */
export const custodyReferenceScriptUtxos = (
  version: CustodyContractVersion,
  networkMagic: Cardano.NetworkMagic,
): Cardano.Utxo[] =>
  (version.referenceScripts[networkMagic] ?? []).flatMap(
    ({ scriptHash, txIn, address, coins }): Cardano.Utxo[] => {
      const logic = findCustodyLogic(version, scriptHash);
      const script =
        scriptHash === version.accountValidatorHash
          ? version.accountValidator
          : logic.ok
          ? logic.value.script
          : undefined;
      return script
        ? [
            [
              { ...txIn, address },
              { address, value: { coins }, scriptReference: script },
            ],
          ]
        : [];
    },
  );

/**
 * The CIP-1854 account index `a` of `m/1854'/1815'/a'` that holds the
 * creator and device keys of a version's accounts on a network. A later
 * contract version may give networks separate index ranges, so callers
 * always take the index from here and never assume one.
 */
export const custodyDeviceAccountIndex = (
  version: CustodyContractVersion,
  networkMagic: Cardano.NetworkMagic,
): number =>
  version.deviceAccountIndex.byNetworkMagic[networkMagic] ??
  version.deviceAccountIndex.default;
