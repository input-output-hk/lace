import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_VALIDATOR_COMPILED_CODE,
  ACCOUNT_VALIDATOR_HASH,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  CUSTODY_BLUEPRINT_SHA256,
  CUSTODY_CONTRACT_COMPILER,
  CUSTODY_CONTRACT_REVISION,
  custodyReferenceScriptUtxos,
  encodeCustodyAccountRedeemer,
  encodeCustodyLogicRedeemer,
  encodeCustodyMintRedeemer,
  encodeCustodyStakeRedeemer,
  findCustodyContractVersion,
  findCustodyLogic,
  LOGIC_V1_COMPILED_CODE,
  LOGIC_V1_HASH,
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS,
  UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE,
  UNAPPLIED_STAKE_VALIDATOR_HASH,
} from '../src';
import { PREPROD_REFERENCE_SCRIPTS } from '../src/blueprint/reference-scripts';

import { blazeApply } from './blaze-apply';

import type { CustodyAccountRedeemer, CustodyMintRedeemer } from '../src';

interface BlueprintValidator {
  title: string;
  compiledCode: string;
  hash: string;
  parameters?: { title: string }[];
}

interface BlueprintConstructor {
  title: string;
  dataType: string;
  index: number;
  fields: unknown[];
}

interface Blueprint {
  preamble: {
    compiler: { name: string; version: string };
    license: string;
    plutusVersion: string;
  };
  validators: BlueprintValidator[];
  definitions: Record<string, { anyOf?: BlueprintConstructor[] }>;
}

interface NetworkScripts {
  network: string;
  references: {
    scriptHash: string;
    txId: string;
    index: number;
    address: string;
    lovelace: string;
  }[];
}

const SOURCE_DIRECTORY = join(__dirname, '..', 'src');
const BLUEPRINT_PATH = join(SOURCE_DIRECTORY, 'blueprint', 'plutus.json');
const blueprintBytes = readFileSync(BLUEPRINT_PATH);
const blueprint = JSON.parse(blueprintBytes.toString('utf8')) as Blueprint;
const PREPROD_PATH = join(SOURCE_DIRECTORY, 'blueprint', 'preprod.json');
const preprodBytes = readFileSync(PREPROD_PATH);
const preprod = JSON.parse(preprodBytes.toString('utf8')) as NetworkScripts;

const validatorsTitled = (prefix: string): BlueprintValidator[] =>
  blueprint.validators.filter(validator => validator.title.startsWith(prefix));

/** Script hash as the ledger defines it: BLAKE2b-224 of 0x03 (Plutus V3) and the script bytes. */
const plutusV3Hash = (compiledCode: string): string =>
  Crypto.blake2b.hash(HexBlob(`03${compiledCode}`), 28);

const sha256 = (hex: string): string =>
  createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');

/**
 * A logic the vendored blueprint does not carry: the upgrade fixture's second
 * logic applied to the proxy hash, `SECOND_APPLIED_HASH` of upstream
 * offchain/test/logic.test.ts.
 */
const SECOND_LOGIC_HASH =
  '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d';

describe('vendored blueprint', () => {
  it('is byte for byte the upstream plutus.json', () => {
    expect(createHash('sha256').update(blueprintBytes).digest('hex')).toBe(
      CUSTODY_BLUEPRINT_SHA256,
    );
  });

  it('names the pinned compiler, Plutus version and license', () => {
    const { compiler, plutusVersion, license } = blueprint.preamble;
    expect(`${compiler.name} ${compiler.version}`).toBe(
      CUSTODY_CONTRACT_COMPILER,
    );
    expect(plutusVersion).toBe('v3');
    expect(license).toBe('Apache-2.0');
  });

  it('is never imported by runtime code, nor is the Preprod record', () => {
    const sources = readdirSync(SOURCE_DIRECTORY, {
      recursive: true,
      encoding: 'utf8',
    }).filter(path => path.endsWith('.ts'));
    for (const source of sources) {
      const text = readFileSync(join(SOURCE_DIRECTORY, source), 'utf8');
      expect(text).not.toMatch(
        /(?:from|import|import\(|require\()\s*["'][^"']*\.json["']/,
      );
    }
  });
});

describe('account proxy constants', () => {
  it('equal every account.account handler entry, which takes no parameter', () => {
    const entries = validatorsTitled('account.account.');
    expect(entries.map(entry => entry.title)).toEqual([
      'account.account.mint',
      'account.account.spend',
      'account.account.else',
    ]);
    for (const entry of entries) {
      expect(entry.compiledCode).toBe(ACCOUNT_VALIDATOR_COMPILED_CODE);
      expect(entry.hash).toBe(ACCOUNT_VALIDATOR_HASH);
      expect(entry.parameters ?? []).toEqual([]);
    }
  });

  it('hash to the pinned account proxy hash', () => {
    expect(ACCOUNT_VALIDATOR_HASH).toBe(
      'ed61963ac94d12c0b320be5a336c36af66bc02c380e0aa3001899253',
    );
    expect(ACCOUNT_VALIDATOR_COMPILED_CODE).toHaveLength(2735 * 2);
    expect(ACCOUNT_VALIDATOR_COMPILED_CODE.startsWith('590aac')).toBe(true);
    expect(plutusV3Hash(ACCOUNT_VALIDATOR_COMPILED_CODE)).toBe(
      ACCOUNT_VALIDATOR_HASH,
    );
  });
});

describe('stake validator constants', () => {
  it('equal every account_stake handler entry, owner first', () => {
    const entries = validatorsTitled('account_stake.account_stake.');
    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      expect(entry.compiledCode).toBe(UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE);
      expect(entry.hash).toBe(UNAPPLIED_STAKE_VALIDATOR_HASH);
      expect(entry.parameters?.map(parameter => parameter.title)).toEqual([
        'owner',
        'proxy_hash',
      ]);
    }
  });

  it('hash to the pinned unapplied stake validator hash', () => {
    expect(UNAPPLIED_STAKE_VALIDATOR_HASH).toBe(
      'edcfa41389b7b924916ad7408cd2d0f75a7a3dae8717f9bbf1a668c6',
    );
    expect(UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE).toHaveLength(1214 * 2);
    expect(UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE.startsWith('5904bb')).toBe(
      true,
    );
    expect(plutusV3Hash(UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE)).toBe(
      UNAPPLIED_STAKE_VALIDATOR_HASH,
    );
  });
});

describe('logic version 1 constants', () => {
  const entries = validatorsTitled('logic_v1.logic_v1.');

  it('come from the logic_v1 handler entries, which take the proxy hash', () => {
    expect(entries.map(entry => entry.title)).toEqual([
      'logic_v1.logic_v1.withdraw',
      'logic_v1.logic_v1.publish',
      'logic_v1.logic_v1.else',
    ]);
    for (const entry of entries) {
      expect(entry.compiledCode).toBe(entries[0].compiledCode);
      expect(entry.hash).toBe(
        '7cf7daa6c0a5825e23a9dadece990d5a602fa1508d01f061eacaed52',
      );
      expect(entry.parameters?.map(parameter => parameter.title)).toEqual([
        'proxy_hash',
      ]);
    }
  });

  it('are logic_v1 applied to the account proxy hash', () => {
    expect(LOGIC_V1_COMPILED_CODE).toBe(
      blazeApply(entries[0].compiledCode, ACCOUNT_VALIDATOR_HASH),
    );
  });

  // Pinned upstream in offchain/test/logic.test.ts, produced with
  // `aiken blueprint apply` from the vendored blueprint.
  it('reproduce the Aiken CLI vectors', () => {
    expect(LOGIC_V1_HASH).toBe(
      '2cd68e398bdf9fbc8d257614b54403451ee722520ec785fe14f8df5a',
    );
    expect(LOGIC_V1_COMPILED_CODE).toHaveLength(9136 * 2);
    expect(sha256(LOGIC_V1_COMPILED_CODE)).toBe(
      '467631d56f1c7ba59adc931ca24953be2f2abb0ac4f2bdbf17a2ac9a2a847a48',
    );
    expect(plutusV3Hash(LOGIC_V1_COMPILED_CODE)).toBe(LOGIC_V1_HASH);
  });
});

describe('vendored validators', () => {
  it('are the proxy, the stake validator and logic version 1', () => {
    expect(blueprint.validators.map(validator => validator.title)).toEqual([
      'account.account.mint',
      'account.account.spend',
      'account.account.else',
      'account_stake.account_stake.withdraw',
      'account_stake.account_stake.publish',
      'account_stake.account_stake.else',
      'logic_v1.logic_v1.withdraw',
      'logic_v1.logic_v1.publish',
      'logic_v1.logic_v1.else',
    ]);
  });
});

describe('Preprod reference scripts', () => {
  it('come from the upstream Preprod record, byte for byte', () => {
    expect(createHash('sha256').update(preprodBytes).digest('hex')).toBe(
      '61c04cb9e6c36eac670fc155177b51d6d7dc24315813e1ca08d1879ff62991a6',
    );
    expect(preprod.network).toBe('preprod');
    expect(
      PREPROD_REFERENCE_SCRIPTS.map(({ scriptHash, txIn, address, coins }) => ({
        scriptHash,
        txId: txIn.txId,
        index: txIn.index,
        address,
        lovelace: coins.toString(),
      })),
    ).toEqual(preprod.references);
  });

  it('park the account proxy and logic version 1 once each', () => {
    expect(
      PREPROD_REFERENCE_SCRIPTS.map(({ scriptHash }) => scriptHash),
    ).toEqual([ACCOUNT_VALIDATOR_HASH, LOGIC_V1_HASH]);
  });

  it('sit at the enterprise address of logic version 1', () => {
    const logicAddress = Cardano.EnterpriseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      { type: Cardano.CredentialType.ScriptHash, hash: LOGIC_V1_HASH },
    )
      .toAddress()
      .toBech32();
    for (const { address, txIn } of PREPROD_REFERENCE_SCRIPTS) {
      expect(address).toBe(logicAddress);
      expect(Cardano.TransactionId(txIn.txId)).toBe(txIn.txId);
    }
  });

  it("are the current version's on Preprod and nowhere else", () => {
    expect(CURRENT_CUSTODY_CONTRACT_VERSION.referenceScripts).toEqual({
      [Cardano.NetworkMagics.Preprod]: PREPROD_REFERENCE_SCRIPTS,
    });
  });

  it('rebuild as UTxOs carrying the vendored scripts', () => {
    const utxos = custodyReferenceScriptUtxos(
      CURRENT_CUSTODY_CONTRACT_VERSION,
      Cardano.NetworkMagics.Preprod,
    );
    expect(utxos).toEqual(
      PREPROD_REFERENCE_SCRIPTS.map(({ txIn, address, coins }, index) => [
        { ...txIn, address },
        {
          address,
          value: { coins },
          scriptReference: [
            CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator,
            CURRENT_CUSTODY_CONTRACT_VERSION.logics[0].script,
          ][index],
        },
      ]),
    );
    for (const [[, output], { scriptHash }] of utxos.map(
      (utxo, index) => [utxo, PREPROD_REFERENCE_SCRIPTS[index]] as const,
    )) {
      expect(
        Serialization.Script.fromCore(output.scriptReference!).hash(),
      ).toBe(scriptHash);
    }
  });

  it('rebuild no UTxO on a network without parked scripts', () => {
    expect(
      custodyReferenceScriptUtxos(
        CURRENT_CUSTODY_CONTRACT_VERSION,
        Cardano.NetworkMagics.Mainnet,
      ),
    ).toEqual([]);
  });

  it('rebuild no UTxO for a parked script the version does not carry', () => {
    const version = {
      ...CURRENT_CUSTODY_CONTRACT_VERSION,
      referenceScripts: {
        [Cardano.NetworkMagics.Preprod]: [
          {
            ...PREPROD_REFERENCE_SCRIPTS[1],
            scriptHash: SECOND_LOGIC_HASH as typeof LOGIC_V1_HASH,
          },
        ],
      },
    };
    expect(
      custodyReferenceScriptUtxos(version, Cardano.NetworkMagics.Preprod),
    ).toEqual([]);
  });
});

/** The constructor index and field count an encoded redeemer carries. */
const shapeOf = (data: Cardano.PlutusData) => {
  if (!Cardano.util.isConstrPlutusData(data))
    throw new Error('Not a constructor');
  return { index: Number(data.constructor), fields: data.fields.items.length };
};

const constructorsOf = (type: string) =>
  (
    blueprint.definitions[`cardano_account_custody_contract/types/${type}`]
      .anyOf ?? []
  ).map(({ title, dataType, index, fields }) => {
    expect(dataType).toBe('constructor');
    return { title, index, fields: fields.length };
  });

describe('redeemer codecs', () => {
  it('follow the blueprint account redeemer constructors', () => {
    const kinds: Record<string, CustodyAccountRedeemer['kind']> = {
      Device: 'device',
      SpendWithGrant: 'spendWithGrant',
      SweepGrant: 'sweepGrant',
      Fund: 'fund',
    };
    const constructors = constructorsOf('AccountRedeemer');
    expect(constructors.map(({ title }) => title)).toEqual(Object.keys(kinds));
    for (const { title, index, fields } of constructors) {
      expect(
        shapeOf(encodeCustodyAccountRedeemer({ kind: kinds[title] })),
      ).toEqual({ index, fields });
    }
  });

  it('follow the blueprint mint redeemer constructors', () => {
    const kinds: Record<string, CustodyMintRedeemer['kind']> = {
      CreateAccount: 'createAccount',
      IssueGrants: 'issueGrants',
      BurnGrants: 'burnGrants',
    };
    const constructors = constructorsOf('MintRedeemer');
    expect(constructors.map(({ title }) => title)).toEqual(Object.keys(kinds));
    for (const { title, index, fields } of constructors) {
      expect(
        shapeOf(encodeCustodyMintRedeemer({ kind: kinds[title] })),
      ).toEqual({ index, fields });
    }
  });

  it('follow the blueprint stake redeemer constructor', () => {
    expect(constructorsOf('StakeRedeemer')).toEqual([
      { title: 'Operate', index: 0, fields: 0 },
    ]);
    expect(shapeOf(encodeCustodyStakeRedeemer())).toEqual({
      index: 0,
      fields: 0,
    });
  });

  it('follow the blueprint logic redeemer constructor', () => {
    expect(constructorsOf('LogicRedeemer')).toEqual([
      { title: 'Run', index: 0, fields: 0 },
    ]);
    expect(shapeOf(encodeCustodyLogicRedeemer())).toEqual({
      index: 0,
      fields: 0,
    });
  });
});

describe('contract version registry', () => {
  it('holds the vendored blueprint only', () => {
    expect(SUPPORTED_CUSTODY_CONTRACT_VERSIONS).toEqual([
      CURRENT_CUSTODY_CONTRACT_VERSION,
    ]);
  });

  it('pins the vendored blueprint as the current version', () => {
    const version = CURRENT_CUSTODY_CONTRACT_VERSION;
    expect(version.revision).toBe('b48545f4be850c1044de2dbeb51751718b4b8e70');
    expect(version.blueprintSha256).toBe(
      '8b48096f70a5d0cb207659fcc7875b5f0639f7822604c6e7db439212b5374dde',
    );
    expect(version.unappliedStakeValidator.bodyBitLength).toBe(9658);
    expect(version.accountValidatorHash).toBe(ACCOUNT_VALIDATOR_HASH);
    expect(version.blueprintSha256).toBe(CUSTODY_BLUEPRINT_SHA256);
    expect(version.revision).toBe(CUSTODY_CONTRACT_REVISION);
    expect(version.compiler).toBe(CUSTODY_CONTRACT_COMPILER);
    expect(version.unappliedStakeValidator).toMatchObject({
      compiledCode: UNAPPLIED_STAKE_VALIDATOR_COMPILED_CODE,
      hash: UNAPPLIED_STAKE_VALIDATOR_HASH,
    });
  });

  it('carries an account validator witness that hashes to its key', () => {
    const { accountValidator } = CURRENT_CUSTODY_CONTRACT_VERSION;
    expect(accountValidator).toEqual({
      __type: Cardano.ScriptType.Plutus,
      bytes: ACCOUNT_VALIDATOR_COMPILED_CODE,
      version: Cardano.PlutusLanguageVersion.V3,
    });
    expect(Serialization.Script.fromCore(accountValidator).hash()).toBe(
      ACCOUNT_VALIDATOR_HASH,
    );
  });

  it('accepts logic version 1 only, and runs it on new accounts', () => {
    const { logics, currentLogicHash } = CURRENT_CUSTODY_CONTRACT_VERSION;
    expect(logics).toEqual([
      {
        hash: LOGIC_V1_HASH,
        title: 'logic_v1',
        script: {
          __type: Cardano.ScriptType.Plutus,
          bytes: LOGIC_V1_COMPILED_CODE,
          version: Cardano.PlutusLanguageVersion.V3,
        },
      },
    ]);
    expect(currentLogicHash).toBe(LOGIC_V1_HASH);
    expect(Serialization.Script.fromCore(logics[0].script).hash()).toBe(
      LOGIC_V1_HASH,
    );
  });

  it('finds a logic by its applied hash', () => {
    expect(
      findCustodyLogic(CURRENT_CUSTODY_CONTRACT_VERSION, LOGIC_V1_HASH),
    ).toEqual({
      ok: true,
      value: CURRENT_CUSTODY_CONTRACT_VERSION.logics[0],
    });
  });

  it.each([
    ['a logic the blueprint does not carry', SECOND_LOGIC_HASH],
    [
      'the unapplied logic version 1',
      '7cf7daa6c0a5825e23a9dadece990d5a602fa1508d01f061eacaed52',
    ],
    ['the account proxy', ACCOUNT_VALIDATOR_HASH],
    ['an upper-case logic version 1 hash', LOGIC_V1_HASH.toUpperCase()],
  ])('refuses %s as a logic', (_, logic) => {
    expect(findCustodyLogic(CURRENT_CUSTODY_CONTRACT_VERSION, logic)).toEqual({
      ok: false,
      error: { code: 'unknown-logic', logic },
    });
  });

  it('finds a version by its account validator hash', () => {
    expect(findCustodyContractVersion(ACCOUNT_VALIDATOR_HASH)).toEqual({
      ok: true,
      value: CURRENT_CUSTODY_CONTRACT_VERSION,
    });
  });

  it('refuses an account validator it has not pinned', () => {
    expect(findCustodyContractVersion('cc'.repeat(28))).toEqual({
      ok: false,
      error: {
        code: 'unsupported-contract-version',
        accountValidatorHash: 'cc'.repeat(28),
      },
    });
  });
});
