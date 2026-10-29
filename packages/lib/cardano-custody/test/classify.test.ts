import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16, Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_VALIDATOR_HASH,
  classifyCustodyAccountUtxos,
  custodyGrantAssetId,
  custodyGrantLiveness,
  encodeCustodyAccountState,
  encodeCustodyGrant,
  revokeAllCustodyGrants,
} from '../src';
import { constr } from '../src/codecs/plutus-data';

import {
  EXPIRY,
  fixtureGrants,
  fromCbor,
  grantedState,
  NOW,
  OWNER_STAKE_SCRIPT_HASH,
  OWNER_TESTNET_ADDRESS,
  PREPROD_ADDRESS,
  STRANGER_KEY,
} from './fixtures';

import type { CustodyGrant } from '../src';

const account: Parameters<typeof classifyCustodyAccountUtxos>[0] = {
  accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
  stakeScriptHash: Hash28ByteBase16(OWNER_STAKE_SCRIPT_HASH),
  address: Cardano.PaymentAddress(OWNER_TESTNET_ADDRESS),
};

const stateNft = Cardano.AssetId(
  `${ACCOUNT_VALIDATOR_HASH}${OWNER_STAKE_SCRIPT_HASH}`,
);
const grantToken = (slot: bigint) => custodyGrantAssetId(account, slot);
const otherAccountToken = Cardano.AssetId(
  `${ACCOUNT_VALIDATOR_HASH}${'87'.repeat(28)}00000000`,
);
const nightToken = Cardano.AssetId(`${'99'.repeat(28)}4e49474854`);

const outputIndex = { next: 0 };

const utxoAt = (
  address: string,
  output: Partial<Cardano.TxOut> & { assets?: [Cardano.AssetId, bigint][] },
): Cardano.Utxo => {
  const { assets, ...rest } = output;
  return [
    {
      txId: Cardano.TransactionId('11'.repeat(32)),
      index: outputIndex.next++,
      address: Cardano.PaymentAddress(address),
    },
    {
      address: Cardano.PaymentAddress(address),
      value: {
        coins: 2_000_000n,
        ...(assets && { assets: new Map(assets) }),
      },
      ...rest,
    },
  ];
};

const utxo = (output: Parameters<typeof utxoAt>[1] = {}): Cardano.Utxo =>
  utxoAt(OWNER_TESTNET_ADDRESS, output);

const controlUtxo = () =>
  utxo({
    assets: [[stateNft, 1n]],
    datum: encodeCustodyAccountState(grantedState),
  });

const grantUtxo = (grant: CustodyGrant) =>
  utxo({
    assets: [[grantToken(grant.slot), 1n]],
    datum: encodeCustodyGrant(grant),
  });

const DATUM_HASH = Hash32ByteBase16('ab'.repeat(32));

describe('classifyCustodyAccountUtxos', () => {
  it('sorts every kind, grants in slot order', () => {
    const control = controlUtxo();
    const [grant0, grant1, grant2] = fixtureGrants.map(grantUtxo);
    const ownReserve = utxo({ datum: fromCbor('d87980') });
    const foreignReserve = utxo({ datum: constr(1, [0n]) });
    const fund = utxo({ assets: [[nightToken, 5n]] });
    const stranded = utxo({ datumHash: DATUM_HASH });
    expect(
      classifyCustodyAccountUtxos(account, [
        fund,
        grant2,
        ownReserve,
        control,
        stranded,
        grant0,
        foreignReserve,
        grant1,
      ]),
    ).toEqual({
      controls: [control],
      grants: [grant0, grant1, grant2].map((each, index) => ({
        utxo: each,
        grant: fixtureGrants[index],
        token: grantToken(BigInt(index)),
      })),
      reserves: { own: [ownReserve], foreign: [foreignReserve] },
      funds: [fund],
      stranded: [stranded],
      anomalies: [],
    });
  });

  it('ignores UTxOs at any other address', () => {
    const keyStaked = Cardano.BaseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      { type: Cardano.CredentialType.ScriptHash, hash: ACCOUNT_VALIDATOR_HASH },
      {
        type: Cardano.CredentialType.KeyHash,
        hash: Hash28ByteBase16(OWNER_STAKE_SCRIPT_HASH),
      },
    )
      .toAddress()
      .toBech32();
    const elsewhere = [
      utxoAt(PREPROD_ADDRESS, { assets: [[stateNft, 1n]] }),
      utxoAt(keyStaked, {}),
      utxoAt(
        Cardano.EnterpriseAddress.fromCredentials(Cardano.NetworkId.Testnet, {
          type: Cardano.CredentialType.KeyHash,
          hash: Hash28ByteBase16(STRANGER_KEY),
        })
          .toAddress()
          .toBech32(),
        {},
      ),
    ];
    expect(classifyCustodyAccountUtxos(account, elsewhere)).toMatchObject({
      controls: [],
      grants: [],
      funds: [],
      anomalies: [],
    });
  });

  it('lists every UTxO holding the state NFT, so the caller can refuse several', () => {
    const controls = [controlUtxo(), controlUtxo()];
    expect(classifyCustodyAccountUtxos(account, controls).controls).toEqual(
      controls,
    );
  });

  it.each([
    ['a datum other than d87980', { datum: constr(0, [0n]) }],
    [
      'd87980 spelled with an indefinite field list',
      { datum: fromCbor('d8799fff') },
    ],
    [
      'd87980 with a reference script',
      {
        datum: fromCbor('d87980'),
        scriptReference: {
          __type: Cardano.ScriptType.Native,
          kind: Cardano.NativeScriptKind.RequireAnyOf,
          scripts: [],
        } as Cardano.Script,
      },
    ],
  ])('lists a reserve with %s as foreign', (_, output) => {
    const reserve = utxo(output);
    expect(classifyCustodyAccountUtxos(account, [reserve]).reserves).toEqual({
      own: [],
      foreign: [reserve],
    });
  });

  it.each<[string, Parameters<typeof utxo>[0], unknown]>([
    [
      'another account token',
      { assets: [[otherAccountToken, 1n]], datum: constr(0) },
      { code: 'unexpected-account-tokens', assetIds: [otherAccountToken] },
    ],
    [
      'two grant tokens',
      {
        assets: [
          [grantToken(0n), 1n],
          [grantToken(1n), 1n],
        ],
        datum: encodeCustodyGrant(fixtureGrants[0]),
      },
      {
        code: 'unexpected-account-tokens',
        assetIds: [grantToken(0n), grantToken(1n)],
      },
    ],
    [
      'a grant token held twice',
      {
        assets: [[grantToken(0n), 2n]],
        datum: encodeCustodyGrant(fixtureGrants[0]),
      },
      { code: 'unexpected-account-tokens', assetIds: [grantToken(0n)] },
    ],
    [
      'an account token of neither contract shape',
      { assets: [[Cardano.AssetId(`${ACCOUNT_VALIDATOR_HASH}aa`), 1n]] },
      {
        code: 'unexpected-account-tokens',
        assetIds: [`${ACCOUNT_VALIDATOR_HASH}aa`],
      },
    ],
    [
      'a grant token beside another asset',
      {
        assets: [
          [grantToken(0n), 1n],
          [nightToken, 1n],
        ],
        datum: encodeCustodyGrant(fixtureGrants[0]),
      },
      { code: 'grant-value-not-strict', slot: 0n },
    ],
    [
      'a grant token without a datum',
      { assets: [[grantToken(0n), 1n]] },
      { code: 'grant-datum-not-inline', slot: 0n },
    ],
    [
      'a grant token under a datum hash',
      { assets: [[grantToken(0n), 1n]], datumHash: DATUM_HASH },
      { code: 'grant-datum-not-inline', slot: 0n },
    ],
    [
      'a grant token under a datum that is not a grant',
      {
        assets: [[grantToken(0n), 1n]],
        datum: encodeCustodyAccountState(grantedState),
      },
      {
        code: 'grant-datum-malformed',
        slot: 0n,
        error: {
          code: 'malformed-data',
          path: '',
          expected: 'a grant as constructor 0 with 4 fields',
        },
      },
    ],
    [
      'a grant token under the grant of another slot',
      {
        assets: [[grantToken(1n), 1n]],
        datum: encodeCustodyGrant(fixtureGrants[0]),
      },
      { code: 'grant-slot-mismatch', slot: 1n, datumSlot: 0n },
    ],
  ])('lists a UTxO with %s as an anomaly', (_, output, anomaly) => {
    const anomalous = utxo(output);
    const kinds = classifyCustodyAccountUtxos(account, [anomalous]);
    expect(kinds.anomalies).toEqual([
      expect.objectContaining({ utxo: anomalous, ...(anomaly as object) }),
    ]);
    expect(kinds).toMatchObject({
      controls: [],
      grants: [],
      reserves: { own: [], foreign: [] },
      funds: [],
      stranded: [],
    });
  });
});

describe('custodyGrantLiveness', () => {
  const [grant] = fixtureGrants;

  it('is current under the state generation, unrevoked and unexpired', () => {
    expect(custodyGrantLiveness(grant, grantedState, NOW)).toBe('current');
    expect(custodyGrantLiveness(grant, grantedState, Number(EXPIRY) - 1)).toBe(
      'current',
    );
  });

  it('is expired from the instant the grant names', () => {
    for (const now of [Number(EXPIRY), Number(EXPIRY) + 1, Number.NaN]) {
      expect(custodyGrantLiveness(grant, grantedState, now)).toBe('expired');
    }
  });

  it('is revoked when its slot is listed, whatever the time', () => {
    const revoked = { ...grantedState, revoked: [0n] };
    for (const now of [NOW, Number(EXPIRY)]) {
      expect(custodyGrantLiveness(grant, revoked, now)).toBe('revoked');
    }
    expect(custodyGrantLiveness(fixtureGrants[1], revoked, NOW)).toBe(
      'current',
    );
  });

  it('is superseded under an older generation, even when also revoked or expired', () => {
    const bumped = { ...revokeAllCustodyGrants(grantedState), revoked: [0n] };
    for (const now of [NOW, Number(EXPIRY)]) {
      expect(custodyGrantLiveness(grant, bumped, now)).toBe('superseded');
    }
  });

  it('is of a future generation against a state older than the grant', () => {
    expect(
      custodyGrantLiveness({ ...grant, generation: 1n }, grantedState, NOW),
    ).toBe('future-generation');
  });
});
