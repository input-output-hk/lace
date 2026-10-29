// Mirrors lib/cardano_account_custody_contract/grant.test.ak and the
// SpendWithGrant cases of validators/account.test.ak,
// validators/logic_v1.test.ak and validators/attacks.test.ak of
// Biglup/cardano-account-custody-contract at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0), modified for Lace:
// each refused case names the violation it expects, and validity bounds are
// slots read through an injected converter.

import { Cardano } from '@cardano-sdk/core';
import { Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  custodyGrantAfterSpend,
  encodeCustodyAccountState,
  encodeCustodyGrant,
  findCustodyScopeViolations,
} from '../src';
import {
  grantSpendViolationsOf,
  leavingValueAt,
} from '../src/analysis/grant-spend';
import {
  grantAssetIdOf,
  isAtAccount,
  plutusAddressKeyOf,
  viewOfOutput,
} from '../src/analysis/outputs';

import { hexOf } from './custody-transactions';
import { LOGIC_HASH } from './fixtures';

import type {
  CustodyAccountState,
  CustodyAsset,
  CustodyGrant,
  CustodyScope,
  CustodyValueDelta,
} from '../src';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

interface CustodyGrantSpendContext {
  readonly inputs: readonly Cardano.TxOut[];
  readonly referenceInputs: readonly Cardano.TxOut[];
  readonly outputs: readonly Cardano.TxOut[];
  readonly mint?: Cardano.TokenMap;
  readonly requiredSigners: readonly string[];
  readonly invalidHereafter: Cardano.Slot | undefined;
  readonly slotToPosixMs: (slot: Cardano.Slot) => number;
  readonly account: {
    accountValidatorHash: Hash28ByteBase16;
    stakeScriptHash: Hash28ByteBase16;
  };
  readonly slot: bigint;
}

const findCustodyGrantSpendViolations = (context: CustodyGrantSpendContext) => {
  const account = {
    accountValidatorHash:
      context.account.accountValidatorHash.toLowerCase() as Hash28ByteBase16,
    stakeScriptHash:
      context.account.stakeScriptHash.toLowerCase() as Hash28ByteBase16,
  };
  const inputs = context.inputs.map(viewOfOutput);
  const assetId = grantAssetIdOf(account, context.slot);
  const grantInput = inputs.find(
    view =>
      assetId !== undefined &&
      isAtAccount(view, account) &&
      view.value.assets.has(assetId),
  );
  if (!grantInput) throw new Error('Grant input missing from test fixture');
  return grantSpendViolationsOf({
    grantInput,
    inputs,
    referenceInputs: context.referenceInputs.map(viewOfOutput),
    outputs: context.outputs.map(viewOfOutput),
    mint: new Map(
      [...(context.mint ?? [])].map(([assetId, quantity]) => [
        assetId.toLowerCase() as Cardano.AssetId,
        quantity,
      ]),
    ),
    requiredSigners: new Set(
      context.requiredSigners.map(signer => signer.toLowerCase()),
    ),
    upperBoundMs:
      context.invalidHereafter === undefined
        ? undefined
        : context.slotToPosixMs(context.invalidHereafter),
    account,
  });
};

const custodyLeavingValue = (
  inputs: readonly Cardano.TxOut[],
  outputs: readonly Cardano.TxOut[],
  address: Cardano.PaymentAddress,
) =>
  leavingValueAt(
    inputs.map(viewOfOutput),
    outputs.map(viewOfOutput),
    plutusAddressKeyOf(Cardano.Address.fromBech32(address)),
  );

/** The upstream test hashes: the 28-byte big-endian encoding of a small number. */
const hash28 = (value: number) =>
  value.toString(16).padStart(56, '0') as Hash28ByteBase16;

const SCRIPT_HASH = hash28(1);
const STAKE_SCRIPT_HASH = hash28(2);
const OTHER_STAKE_SCRIPT_HASH = hash28(3);
const DEVICE_KEY = HexBlob(hash28(4));
const OTHER_DEVICE_KEY = HexBlob(hash28(5));
const STRANGER_KEY = HexBlob(hash28(6));
const EXPIRY = 1_800_000_000_000n;
const DATUM_HASH = Hash32ByteBase16('00'.repeat(32));
const REFERENCE_SCRIPT: Cardano.Script = {
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireAllOf,
  scripts: [],
};

const script = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: hash as Hash28ByteBase16,
});
const key = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as Hash28ByteBase16,
});
const bech32 = (address: Cardano.Address) =>
  address.toBech32() as Cardano.PaymentAddress;

const accountAddressOf = (stakeScriptHash: string) =>
  bech32(
    Cardano.BaseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      script(SCRIPT_HASH),
      script(stakeScriptHash),
    ).toAddress(),
  );
const ACCOUNT_ADDRESS = accountAddressOf(STAKE_SCRIPT_HASH);
const OTHER_ACCOUNT_ADDRESS = accountAddressOf(OTHER_STAKE_SCRIPT_HASH);
const enterpriseOf = (credential: Cardano.Credential) =>
  bech32(
    Cardano.EnterpriseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      credential,
    ).toAddress(),
  );
const RECIPIENT_ADDRESS = enterpriseOf(key(STRANGER_KEY));

const ACCOUNT = {
  accountValidatorHash: SCRIPT_HASH,
  stakeScriptHash: STAKE_SCRIPT_HASH,
};

const TOKEN_POLICY = HexBlob(`${'00'.repeat(27)}99`);
const TOKEN_ASSET: CustodyAsset = {
  policyId: TOKEN_POLICY,
  assetName: hexOf('token'),
};
const LOVELACE_ASSET: CustodyAsset = {
  policyId: HexBlob(''),
  assetName: HexBlob(''),
};
const TOKEN = Cardano.AssetId(`${TOKEN_POLICY}${hexOf('token')}`);
const OTHER_TOKEN = Cardano.AssetId(`${TOKEN_POLICY}${hexOf('other')}`);
const nftOf = (stakeScriptHash: string) =>
  Cardano.AssetId(`${SCRIPT_HASH}${stakeScriptHash}`);
const grantTokenOf = (stakeScriptHash: string, slot: bigint) =>
  Cardano.AssetId(
    `${SCRIPT_HASH}${stakeScriptHash}${slot.toString(16).padStart(8, '0')}`,
  );

const valueOf = (
  lovelace: bigint,
  assets: [Cardano.AssetId, bigint][] = [],
): Cardano.Value =>
  assets.length > 0
    ? { coins: lovelace, assets: new Map(assets) }
    : { coins: lovelace };

const output = (
  address: Cardano.PaymentAddress,
  value: Cardano.Value,
  datum: Pick<Cardano.TxOut, 'datum' | 'datumHash'> = {},
): Cardano.TxOut => ({ address, value, ...datum });

/** The state of validators/account.test.ak, with both its grants outstanding. */
const state = (
  changes: Partial<CustodyAccountState> = {},
): CustodyAccountState => ({
  logic: LOGIC_HASH,
  devices: [DEVICE_KEY],
  grantGeneration: 0n,
  nextSlot: 2n,
  revoked: [],
  outstanding: 2n,
  ...changes,
});

const controlOutput = (
  held: CustodyAccountState = state(),
  stakeScriptHash = STAKE_SCRIPT_HASH,
): Cardano.TxOut =>
  output(
    accountAddressOf(stakeScriptHash),
    valueOf(2_000_000n, [[nftOf(stakeScriptHash), 1n]]),
    { datum: encodeCustodyAccountState(held) },
  );

/** The grants of validators/account.test.ak. */
const lovelaceScope = (): CustodyScope => ({
  asset: LOVELACE_ASSET,
  perCallCap: 3_000_000n,
  cap: 5_000_000n,
  lovelacePerCallCap: 0n,
  lovelaceCap: 0n,
  expiresAt: EXPIRY,
  recipients: [],
});

const recipient = {
  paymentCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: STRANGER_KEY,
  },
};

const tokenScope = (): CustodyScope => ({
  asset: TOKEN_ASSET,
  perCallCap: 10n,
  cap: 50n,
  lovelacePerCallCap: 2_000_000n,
  lovelaceCap: 2_000_000n,
  expiresAt: EXPIRY,
  recipients: [recipient],
});

const lovelaceGrant = (): CustodyGrant => ({
  slot: 0n,
  grantee: STRANGER_KEY,
  generation: 0n,
  scope: lovelaceScope(),
});

const tokenGrant = (): CustodyGrant => ({
  slot: 1n,
  grantee: STRANGER_KEY,
  generation: 0n,
  scope: tokenScope(),
});

const withCaps = (
  grant: CustodyGrant,
  { cap, lovelaceCap }: { cap: bigint; lovelaceCap: bigint },
): CustodyGrant => ({ ...grant, scope: { ...grant.scope, cap, lovelaceCap } });

/** A grant UTxO holding the grant's token and datum. */
const grantOutput = (
  grant: CustodyGrant,
  {
    lovelace = 2_000_000n,
    slot = grant.slot,
  }: { lovelace?: bigint; slot?: bigint } = {},
): Cardano.TxOut =>
  output(
    ACCOUNT_ADDRESS,
    valueOf(lovelace, [[grantTokenOf(STAKE_SCRIPT_HASH, slot), 1n]]),
    { datum: encodeCustodyGrant(grant) },
  );

const fundOutput = (value: Cardano.Value): Cardano.TxOut =>
  output(ACCOUNT_ADDRESS, value);

const payout = (lovelace: bigint): Cardano.TxOut =>
  output(RECIPIENT_ADDRESS, valueOf(lovelace));

const fundInput = () => fundOutput(valueOf(10_000_000n));
const treasuryInput = () => fundOutput(valueOf(10_000_000n, [[TOKEN, 20n]]));

/** A spend of the lovelace grant in slot 0, or the token grant in slot 1, that a test then changes. */
const context = (
  changes: Partial<CustodyGrantSpendContext> = {},
): CustodyGrantSpendContext => ({
  inputs: [grantOutput(lovelaceGrant()), fundInput()],
  referenceInputs: [controlOutput()],
  outputs: [],
  requiredSigners: [STRANGER_KEY],
  invalidHereafter: Cardano.Slot(Number(EXPIRY) - 1),
  // The upstream tests state validity bounds in POSIX milliseconds already.
  slotToPosixMs: slot => slot,
  account: ACCOUNT,
  slot: 0n,
  ...changes,
});

/** Pays `lovelace` from the 10 tADA fund, lowering the cap by `decrement`. */
const lovelaceSpendOutputs = (
  lovelace: bigint,
  decrement = lovelace,
): Cardano.TxOut[] => [
  grantOutput(
    withCaps(lovelaceGrant(), {
      cap: 5_000_000n - decrement,
      lovelaceCap: 0n,
    }),
  ),
  fundOutput(valueOf(10_000_000n - lovelace)),
  payout(lovelace),
];

const spendLovelace = (changes: Partial<CustodyGrantSpendContext> = {}) =>
  findCustodyGrantSpendViolations(
    context({ outputs: lovelaceSpendOutputs(2_000_000n), ...changes }),
  );

/** Pays 10 tokens and `lovelace` from the treasury to `destination` under the token grant. */
const spendToken = ({
  grant = tokenGrant(),
  lovelace = 1_500_000n,
  tokens = 10n,
  caps = {
    cap: grant.scope.cap - tokens,
    lovelaceCap: grant.scope.lovelaceCap - lovelace,
  },
  destination = RECIPIENT_ADDRESS,
}: {
  grant?: CustodyGrant;
  lovelace?: bigint;
  tokens?: bigint;
  caps?: { cap: bigint; lovelaceCap: bigint };
  destination?: Cardano.PaymentAddress;
} = {}) =>
  findCustodyGrantSpendViolations(
    context({
      inputs: [grantOutput(grant), treasuryInput()],
      outputs: [
        grantOutput(withCaps(grant, caps)),
        fundOutput(valueOf(10_000_000n - lovelace, [[TOKEN, 20n - tokens]])),
        output(destination, valueOf(lovelace, [[TOKEN, tokens]])),
      ],
      slot: grant.slot,
    }),
  );

const codes = (violations: readonly { code: string }[]) =>
  violations.map(({ code }) => code);

describe('leavingValueAt', () => {
  const delta = (
    lovelace: bigint,
    assets: [Cardano.AssetId, bigint][] = [],
  ): CustodyValueDelta => ({ lovelace, assets: new Map(assets) });

  it('subtracts what returns to the address', () => {
    const inputs = [
      grantOutput(lovelaceGrant()),
      fundOutput(valueOf(10_000_000n, [[TOKEN, 20n]])),
      payout(1n),
    ];
    const outputs = [
      grantOutput(lovelaceGrant()),
      fundOutput(valueOf(7_000_000n, [[TOKEN, 15n]])),
      output(RECIPIENT_ADDRESS, valueOf(3_000_000n, [[TOKEN, 5n]])),
    ];
    expect(custodyLeavingValue(inputs, outputs, ACCOUNT_ADDRESS)).toEqual(
      delta(3_000_000n, [[TOKEN, 5n]]),
    );
  });

  it('is negative for a deposit', () => {
    expect(
      custodyLeavingValue([], [fundOutput(valueOf(5n))], ACCOUNT_ADDRESS),
    ).toEqual(delta(-5n));
  });

  it("ignores another account's address", () => {
    expect(
      custodyLeavingValue(
        [output(OTHER_ACCOUNT_ADDRESS, valueOf(9n))],
        [],
        ACCOUNT_ADDRESS,
      ),
    ).toEqual(delta(0n));
  });

  it('compares addresses without their network id', () => {
    const mainnet = bech32(
      Cardano.BaseAddress.fromCredentials(
        Cardano.NetworkId.Mainnet,
        script(SCRIPT_HASH),
        script(STAKE_SCRIPT_HASH),
      ).toAddress(),
    );
    expect(
      custodyLeavingValue([output(mainnet, valueOf(9n))], [], ACCOUNT_ADDRESS),
    ).toEqual(delta(9n));
  });

  it('treats asset ids of any case as one asset class', () => {
    expect(
      custodyLeavingValue(
        [
          fundOutput(
            valueOf(1n, [[TOKEN.toUpperCase() as Cardano.AssetId, 4n]]),
          ),
        ],
        [fundOutput(valueOf(1n, [[TOKEN, 4n]]))],
        ACCOUNT_ADDRESS,
      ),
    ).toEqual(delta(0n));
  });
});

describe('findCustodyScopeViolations', () => {
  /** The scopes of grant.test.ak. */
  const unitTokenScope = (): CustodyScope => ({
    ...tokenScope(),
    lovelacePerCallCap: 1_000_000n,
    lovelaceCap: 2_000_000n,
    expiresAt: 1000n,
    recipients: [],
  });
  const leaving = (lovelace: bigint, tokens: bigint): CustodyValueDelta => ({
    lovelace,
    assets: tokens === 0n ? new Map() : new Map([[TOKEN, tokens]]),
  });

  it('accepts the per call cap exactly', () => {
    expect(
      findCustodyScopeViolations(unitTokenScope(), leaving(1_000_000n, 10n)),
    ).toEqual([]);
  });

  it('refuses one above the per call cap', () => {
    expect(
      findCustodyScopeViolations(unitTokenScope(), leaving(0n, 11n)),
    ).toEqual([{ code: 'per-call-cap-exceeded', outflow: 11n, limit: 10n }]);
  });

  it('refuses more than the remaining cap', () => {
    expect(
      findCustodyScopeViolations(
        { ...unitTokenScope(), cap: 5n },
        leaving(0n, 6n),
      ),
    ).toEqual([{ code: 'cap-exceeded', outflow: 6n, limit: 5n }]);
  });

  it('refuses one above the lovelace per call cap', () => {
    expect(
      findCustodyScopeViolations(unitTokenScope(), leaving(1_000_001n, 0n)),
    ).toEqual([
      {
        code: 'lovelace-per-call-cap-exceeded',
        outflow: 1_000_001n,
        limit: 1_000_000n,
      },
    ]);
  });

  it('refuses lovelace above the remaining lovelace cap', () => {
    expect(
      findCustodyScopeViolations(
        { ...unitTokenScope(), lovelaceCap: 500_000n },
        leaving(500_001n, 0n),
      ),
    ).toEqual([
      { code: 'lovelace-cap-exceeded', outflow: 500_001n, limit: 500_000n },
    ]);
  });

  it('ignores the lovelace caps of a lovelace scope', () => {
    expect(
      findCustodyScopeViolations(lovelaceScope(), leaving(3_000_000n, 0n)),
    ).toEqual([]);
  });

  it('refuses a foreign asset leaving', () => {
    expect(
      findCustodyScopeViolations(lovelaceScope(), {
        lovelace: 1n,
        assets: new Map([[OTHER_TOKEN, 1n]]),
      }),
    ).toEqual([
      { code: 'foreign-asset-outflow', assetId: OTHER_TOKEN, outflow: 1n },
    ]);
  });

  it('accepts a foreign asset entering', () => {
    expect(
      findCustodyScopeViolations(lovelaceScope(), {
        lovelace: 1n,
        assets: new Map([[OTHER_TOKEN, -1n]]),
      }),
    ).toEqual([]);
  });

  it('accepts a deposit', () => {
    expect(
      findCustodyScopeViolations(unitTokenScope(), leaving(-1n, -1n)),
    ).toEqual([]);
  });

  it('lists every broken rule at once', () => {
    expect(
      codes(
        findCustodyScopeViolations(
          { ...unitTokenScope(), cap: 5n, lovelaceCap: 0n },
          {
            lovelace: 1_000_001n,
            assets: new Map([
              [TOKEN, 11n],
              [OTHER_TOKEN, 1n],
            ]),
          },
        ),
      ),
    ).toEqual([
      'per-call-cap-exceeded',
      'cap-exceeded',
      'lovelace-per-call-cap-exceeded',
      'lovelace-cap-exceeded',
      'foreign-asset-outflow',
    ]);
  });

  it('reports the account fee on each violation whose outflow is lovelace', () => {
    expect(
      findCustodyScopeViolations(
        { ...lovelaceScope(), perCallCap: 2_000_000n, cap: 2_500_000n },
        leaving(3_127_393n, 0n),
        1_127_393n,
      ),
    ).toEqual([
      {
        code: 'per-call-cap-exceeded',
        outflow: 3_127_393n,
        limit: 2_000_000n,
        fee: 1_127_393n,
      },
      {
        code: 'cap-exceeded',
        outflow: 3_127_393n,
        limit: 2_500_000n,
        fee: 1_127_393n,
      },
    ]);
    expect(
      findCustodyScopeViolations(
        { ...unitTokenScope(), cap: 5n, lovelaceCap: 0n },
        {
          lovelace: 1_000_001n,
          assets: new Map([
            [TOKEN, 11n],
            [OTHER_TOKEN, 1n],
          ]),
        },
        400_000n,
      ),
    ).toStrictEqual([
      { code: 'per-call-cap-exceeded', outflow: 11n, limit: 10n },
      { code: 'cap-exceeded', outflow: 11n, limit: 5n },
      {
        code: 'lovelace-per-call-cap-exceeded',
        outflow: 1_000_001n,
        limit: 1_000_000n,
        fee: 400_000n,
      },
      {
        code: 'lovelace-cap-exceeded',
        outflow: 1_000_001n,
        limit: 0n,
        fee: 400_000n,
      },
      { code: 'foreign-asset-outflow', assetId: OTHER_TOKEN, outflow: 1n },
    ]);
  });

  it('reports no fee unless the caller names it', () => {
    expect(
      findCustodyScopeViolations(unitTokenScope(), leaving(1_000_001n, 0n))[0],
    ).not.toHaveProperty('fee');
  });

  it('matches a grant asset whose policy id is not 28 bytes to nothing', () => {
    const malformed: CustodyScope = {
      ...unitTokenScope(),
      asset: {
        policyId: HexBlob(TOKEN_POLICY.slice(2)),
        assetName: HexBlob(`99${hexOf('token')}`),
      },
    };
    expect(
      codes(findCustodyScopeViolations(malformed, leaving(0n, 1n))),
    ).toEqual(['foreign-asset-outflow']);
  });
});

describe('custodyGrantAfterSpend', () => {
  const leaving = (lovelace: bigint, tokens: bigint): CustodyValueDelta => ({
    lovelace,
    assets: new Map([[TOKEN, tokens]]),
  });

  it('lowers both caps of a token grant by what left', () => {
    expect(custodyGrantAfterSpend(tokenGrant(), leaving(500_000n, 7n))).toEqual(
      withCaps(tokenGrant(), { cap: 43n, lovelaceCap: 1_500_000n }),
    );
  });

  it('keeps the lovelace cap of a lovelace grant', () => {
    expect(
      custodyGrantAfterSpend(lovelaceGrant(), {
        lovelace: 1_000_000n,
        assets: new Map(),
      }),
    ).toEqual(withCaps(lovelaceGrant(), { cap: 4_000_000n, lovelaceCap: 0n }));
  });

  it('keeps the caps on a net deposit', () => {
    expect(
      custodyGrantAfterSpend(tokenGrant(), leaving(-500_000n, -7n)),
    ).toEqual(tokenGrant());
  });

  it('ignores a lovelace deposit beside a token withdrawal', () => {
    expect(
      custodyGrantAfterSpend(tokenGrant(), leaving(-500_000n, 7n)),
    ).toEqual(withCaps(tokenGrant(), { cap: 43n, lovelaceCap: 2_000_000n }));
  });

  it('lets a cap go negative, which no recreated grant may carry', () => {
    expect(
      custodyGrantAfterSpend(lovelaceGrant(), {
        lovelace: 6_000_000n,
        assets: new Map(),
      }).scope.cap,
    ).toBe(-1_000_000n);
  });
});

describe('grantSpendViolationsOf', () => {
  describe('scope', () => {
    it('accepts lovelace within scope', () => {
      expect(spendLovelace()).toEqual([]);
    });

    it('accepts spending exactly the per call cap', () => {
      expect(
        findCustodyGrantSpendViolations(
          context({ outputs: lovelaceSpendOutputs(3_000_000n) }),
        ),
      ).toEqual([]);
    });

    it('refuses one lovelace above the per call cap', () => {
      expect(
        findCustodyGrantSpendViolations(
          context({ outputs: lovelaceSpendOutputs(3_000_001n) }),
        ),
      ).toEqual([
        {
          code: 'per-call-cap-exceeded',
          outflow: 3_000_001n,
          limit: 3_000_000n,
        },
      ]);
    });

    it.each([
      ['exactly the remaining cap', 2_500_000n, []],
      // No recreated cap can be negative, so the range rule fails as well.
      [
        'one lovelace above the remaining cap',
        2_500_001n,
        ['cap-exceeded', 'grant-output-cap'],
      ],
    ])('accepts or refuses %s', (_, lovelace, expected) => {
      const nearlySpent = withCaps(lovelaceGrant(), {
        cap: 2_500_000n,
        lovelaceCap: 0n,
      });
      expect(
        codes(
          findCustodyGrantSpendViolations(
            context({
              inputs: [grantOutput(nearlySpent), fundInput()],
              outputs: [
                grantOutput(
                  withCaps(nearlySpent, {
                    cap: lovelace > 2_500_000n ? 0n : 2_500_000n - lovelace,
                    lovelaceCap: 0n,
                  }),
                ),
                fundOutput(valueOf(10_000_000n - lovelace)),
                payout(lovelace),
              ],
            }),
          ),
        ),
      ).toEqual(expected);
    });

    it('accepts a token spend to a listed recipient', () => {
      expect(spendToken()).toEqual([]);
    });

    it.each([
      [
        'lovelace exactly at the lovelace per call cap',
        { lovelace: 2_000_000n },
        [],
      ],
      [
        'one lovelace above the lovelace per call cap',
        {
          grant: withCaps(tokenGrant(), { cap: 50n, lovelaceCap: 5_000_000n }),
          lovelace: 2_000_001n,
          caps: { cap: 40n, lovelaceCap: 2_999_999n },
        },
        ['lovelace-per-call-cap-exceeded'],
      ],
      ['tokens exactly at the per call cap', { tokens: 10n }, []],
      [
        'one token above the per call cap',
        { tokens: 11n, caps: { cap: 39n, lovelaceCap: 500_000n } },
        ['per-call-cap-exceeded'],
      ],
      [
        'one token above the remaining token cap',
        {
          grant: withCaps(tokenGrant(), { cap: 9n, lovelaceCap: 2_000_000n }),
          caps: { cap: 0n, lovelaceCap: 500_000n },
        },
        ['cap-exceeded', 'grant-output-cap'],
      ],
      [
        'lovelace above the remaining lovelace cap',
        {
          grant: withCaps(tokenGrant(), { cap: 50n, lovelaceCap: 1_000_000n }),
          caps: { cap: 40n, lovelaceCap: 0n },
        },
        ['lovelace-cap-exceeded', 'grant-output-cap'],
      ],
    ] as const)('accepts or refuses %s', (_, change, expected) => {
      expect(codes(spendToken(change))).toEqual(expected);
    });

    it('refuses a foreign asset leaving', () => {
      expect(
        findCustodyGrantSpendViolations(
          context({
            inputs: [
              grantOutput(lovelaceGrant()),
              fundOutput(valueOf(10_000_000n, [[OTHER_TOKEN, 1n]])),
            ],
            outputs: [
              grantOutput(
                withCaps(lovelaceGrant(), { cap: 3_000_000n, lovelaceCap: 0n }),
              ),
              fundOutput(valueOf(8_000_000n)),
              output(
                RECIPIENT_ADDRESS,
                valueOf(2_000_000n, [[OTHER_TOKEN, 1n]]),
              ),
            ],
          }),
        ),
      ).toEqual([
        { code: 'foreign-asset-outflow', assetId: OTHER_TOKEN, outflow: 1n },
      ]);
    });

    it('refuses a sibling asset name of the scoped token leaving', () => {
      expect(
        codes(
          findCustodyGrantSpendViolations(
            context({
              inputs: [
                grantOutput(tokenGrant()),
                fundOutput(valueOf(10_000_000n, [[OTHER_TOKEN, 5n]])),
              ],
              outputs: [
                grantOutput(
                  withCaps(tokenGrant(), { cap: 50n, lovelaceCap: 500_000n }),
                ),
                fundOutput(valueOf(8_500_000n)),
                output(
                  RECIPIENT_ADDRESS,
                  valueOf(1_500_000n, [[OTHER_TOKEN, 5n]]),
                ),
              ],
              slot: 1n,
            }),
          ),
        ),
      ).toEqual(['foreign-asset-outflow']);
    });
  });

  describe('caps the recreated grant carries', () => {
    it.each([
      ['the cap lowered by the outflow', 2_000_000n, []],
      ['the cap lowered below the outflow', 2_000_001n, []],
      ['the cap lowered to zero', 5_000_000n, []],
      [
        'the cap one lovelace above the outflow decrement',
        1_999_999n,
        ['grant-output-cap'],
      ],
      ['an unchanged cap', 0n, ['grant-output-cap']],
      ['a negative cap', 5_000_001n, ['grant-output-cap']],
    ])('accepts or refuses %s', (_, decrement, expected) => {
      expect(
        codes(
          findCustodyGrantSpendViolations(
            context({ outputs: lovelaceSpendOutputs(2_000_000n, decrement) }),
          ),
        ),
      ).toEqual(expected);
    });

    it('names the cap and its range', () => {
      expect(
        findCustodyGrantSpendViolations(
          context({ outputs: lovelaceSpendOutputs(2_000_000n, 1_999_999n) }),
        ),
      ).toEqual([
        {
          code: 'grant-output-cap',
          outputIndex: 0,
          field: 'cap',
          actual: 3_000_001n,
          expected: 3_000_000n,
        },
      ]);
    });

    it('charges a fee the account pays against the cap', () => {
      const fee = 200_000n;
      const outputs = (decrement: bigint) => [
        grantOutput(
          withCaps(lovelaceGrant(), {
            cap: 5_000_000n - decrement,
            lovelaceCap: 0n,
          }),
        ),
        fundOutput(valueOf(10_000_000n - 2_000_000n - fee)),
        payout(2_000_000n),
      ];
      expect(
        findCustodyGrantSpendViolations(
          context({ outputs: outputs(2_000_000n + fee) }),
        ),
      ).toEqual([]);
      expect(
        codes(
          findCustodyGrantSpendViolations(
            context({ outputs: outputs(2_000_000n) }),
          ),
        ),
      ).toEqual(['grant-output-cap']);
    });

    it.each([
      [
        'the token cap below the outflow',
        { cap: 39n, lovelaceCap: 500_000n },
        [],
      ],
      ['the lovelace cap below the outflow', { cap: 40n, lovelaceCap: 0n }, []],
      [
        'the token cap one above the outflow decrement',
        { cap: 41n, lovelaceCap: 500_000n },
        ['grant-output-cap'],
      ],
      [
        'the lovelace cap one above the outflow decrement',
        { cap: 40n, lovelaceCap: 500_001n },
        ['grant-output-cap'],
      ],
      [
        'a negative token cap',
        { cap: -1n, lovelaceCap: 500_000n },
        ['grant-output-cap'],
      ],
      [
        'a negative lovelace cap',
        { cap: 40n, lovelaceCap: -1n },
        ['grant-output-cap'],
      ],
    ])('accepts or refuses %s of a token grant', (_, caps, expected) => {
      expect(codes(spendToken({ caps }))).toEqual(expected);
    });

    it('refuses a lovelace cap written onto a lovelace grant', () => {
      expect(
        codes(
          findCustodyGrantSpendViolations(
            context({
              outputs: [
                grantOutput(
                  withCaps(lovelaceGrant(), {
                    cap: 3_000_000n,
                    lovelaceCap: 1n,
                  }),
                ),
                ...lovelaceSpendOutputs(2_000_000n).slice(1),
              ],
            }),
          ),
        ),
      ).toEqual(['grant-output-cap']);
    });

    describe('with an agent deposit', () => {
      const spendWithAgentDeposit = (after: CustodyGrant) =>
        findCustodyGrantSpendViolations(
          context({
            inputs: [
              grantOutput(lovelaceGrant()),
              fundInput(),
              output(RECIPIENT_ADDRESS, valueOf(5_000_000n)),
            ],
            outputs: [
              grantOutput(after),
              fundOutput(valueOf(14_000_000n)),
              payout(1_000_000n),
            ],
          }),
        );

      it('keeps the caps on a net deposit', () => {
        expect(spendWithAgentDeposit(lovelaceGrant())).toEqual([]);
      });

      it('refuses a cap raised by a net deposit', () => {
        expect(
          codes(
            spendWithAgentDeposit(
              withCaps(lovelaceGrant(), { cap: 9_000_000n, lovelaceCap: 0n }),
            ),
          ),
        ).toEqual(['grant-output-cap']);
      });
    });

    it.each<[string, CustodyGrant]>([
      ['a changed generation', { ...lovelaceGrant(), generation: 1n }],
      ['a changed grantee', { ...lovelaceGrant(), grantee: OTHER_DEVICE_KEY }],
      ['a changed slot', { ...lovelaceGrant(), slot: 1n }],
      [
        'a changed per call cap',
        {
          ...lovelaceGrant(),
          scope: { ...lovelaceScope(), perCallCap: 4_000_000n },
        },
      ],
      [
        'a changed expiry',
        {
          ...lovelaceGrant(),
          scope: { ...lovelaceScope(), expiresAt: EXPIRY + 1n },
        },
      ],
      [
        'changed recipients',
        {
          ...lovelaceGrant(),
          scope: { ...lovelaceScope(), recipients: [recipient] },
        },
      ],
      [
        'a changed asset',
        {
          ...lovelaceGrant(),
          scope: { ...lovelaceScope(), asset: TOKEN_ASSET },
        },
      ],
    ])('refuses a recreated grant with %s', (_, changed) => {
      const after = {
        ...changed,
        scope: { ...changed.scope, cap: 3_000_000n },
      };
      expect(
        findCustodyGrantSpendViolations(
          context({
            outputs: [
              grantOutput(after, { slot: 0n }),
              ...lovelaceSpendOutputs(2_000_000n).slice(1),
            ],
          }),
        ),
      ).toEqual([
        { code: 'grant-output-datum', outputIndex: 0, reason: 'field-changed' },
      ]);
    });
  });

  describe('recipients', () => {
    it('refuses an output outside the recipients', () => {
      expect(
        spendToken({ destination: enterpriseOf(key(OTHER_DEVICE_KEY)) }),
      ).toEqual([{ code: 'recipient-not-allowed', outputIndex: 2 }]);
    });

    it('compares a recipient by its full address', () => {
      const staked = bech32(
        Cardano.BaseAddress.fromCredentials(
          Cardano.NetworkId.Testnet,
          key(STRANGER_KEY),
          key(DEVICE_KEY),
        ).toAddress(),
      );
      expect(spendToken({ destination: staked })).toEqual([
        { code: 'recipient-not-allowed', outputIndex: 2 },
      ]);
    });

    it('accepts any destination when the recipients are empty', () => {
      expect(
        findCustodyGrantSpendViolations(
          context({
            outputs: [
              ...lovelaceSpendOutputs(2_000_000n).slice(0, 2),
              output(enterpriseOf(key(OTHER_DEVICE_KEY)), valueOf(2_000_000n)),
            ],
          }),
        ),
      ).toEqual([]);
    });
  });

  describe('validity', () => {
    it('refuses an unbounded validity range', () => {
      expect(spendLovelace({ invalidHereafter: undefined })).toEqual([
        { code: 'no-upper-bound' },
      ]);
    });

    it('refuses a validity range ending after the expiry', () => {
      expect(
        spendLovelace({ invalidHereafter: Cardano.Slot(Number(EXPIRY) + 1) }),
      ).toEqual([
        {
          code: 'expired',
          upperBoundMs: Number(EXPIRY) + 1,
          expiresAt: EXPIRY,
        },
      ]);
    });

    it('accepts a validity range ending at the expiry', () => {
      expect(
        spendLovelace({ invalidHereafter: Cardano.Slot(Number(EXPIRY)) }),
      ).toEqual([]);
    });

    it('refuses an upper bound the converter cannot place in time', () => {
      expect(spendLovelace({ slotToPosixMs: () => Number.NaN })).toEqual([
        { code: 'expired', upperBoundMs: Number.NaN, expiresAt: EXPIRY },
      ]);
    });
  });

  describe('the referenced control UTxO', () => {
    it.each<[string, Cardano.TxOut[], number]>([
      ['no reference', [], 0],
      ['two references', [controlOutput(), controlOutput()], 2],
      [
        "a reference to another account's control UTxO",
        [controlOutput(state(), OTHER_STAKE_SCRIPT_HASH)],
        0,
      ],
    ])('refuses %s', (_, referenceInputs, count) => {
      expect(spendLovelace({ referenceInputs })).toEqual([
        { code: 'referenced-control-count', count },
      ]);
    });

    it('refuses a referenced control UTxO that carries no account state', () => {
      expect(
        spendLovelace({
          referenceInputs: [{ ...controlOutput(), datum: 42n }],
        }),
      ).toEqual([{ code: 'referenced-control-datum' }]);
    });

    it('refuses the control UTxO spent in place of the reference', () => {
      expect(
        codes(
          spendLovelace({
            inputs: [
              grantOutput(lovelaceGrant()),
              fundInput(),
              controlOutput(),
            ],
            referenceInputs: [],
            outputs: [...lovelaceSpendOutputs(2_000_000n), controlOutput()],
          }),
        ),
      ).toEqual(['account-token-inputs', 'referenced-control-count']);
    });

    it('refuses the control UTxO spent beside the reference', () => {
      expect(
        spendLovelace({
          inputs: [grantOutput(lovelaceGrant()), fundInput(), controlOutput()],
          outputs: [...lovelaceSpendOutputs(2_000_000n), controlOutput()],
        }),
      ).toEqual([{ code: 'account-token-inputs', count: 2 }]);
    });

    it.each<[string, Partial<CustodyAccountState>, string]>([
      ['a grant of an older generation', { grantGeneration: 1n }, 'superseded'],
      ['a revoked slot', { revoked: [0n] }, 'revoked'],
      [
        'a grant of a generation the state has not reached',
        {},
        'future-generation',
      ],
    ])('refuses %s', (_, changes, liveness) => {
      const isFuture = liveness === 'future-generation';
      const grant = { ...lovelaceGrant(), generation: isFuture ? 1n : 0n };
      expect(
        findCustodyGrantSpendViolations(
          context({
            inputs: [grantOutput(grant), fundInput()],
            referenceInputs: [controlOutput(state(changes))],
            outputs: [
              grantOutput(
                withCaps(grant, { cap: 3_000_000n, lovelaceCap: 0n }),
              ),
              ...lovelaceSpendOutputs(2_000_000n).slice(1),
            ],
          }),
        ),
      ).toEqual([{ code: 'grant-not-current', liveness }]);
    });

    it('accepts another revoked slot', () => {
      expect(
        spendLovelace({
          referenceInputs: [controlOutput(state({ revoked: [1n] }))],
        }),
      ).toEqual([]);
    });
  });

  describe('the grant UTxO', () => {
    it('refuses a grant UTxO whose datum is not a grant', () => {
      expect(
        spendLovelace({
          inputs: [
            { ...grantOutput(lovelaceGrant()), datum: 42n },
            fundInput(),
          ],
        }),
      ).toEqual([{ code: 'grant-datum-invalid' }]);
    });

    it('refuses a grant UTxO whose datum names another slot than its token', () => {
      expect(
        codes(
          spendLovelace({
            inputs: [
              grantOutput({ ...lovelaceGrant(), slot: 1n }, { slot: 0n }),
              fundInput(),
            ],
          }),
        ),
      ).toEqual(['grant-input-value', 'grant-output-count']);
    });

    it('refuses extra tokens on the grant UTxO', () => {
      const stuffed = (grant: CustodyGrant) => {
        const held = grantOutput(grant);
        return {
          ...held,
          value: valueOf(2_000_000n, [...held.value.assets!, [TOKEN, 1n]]),
        };
      };
      expect(
        spendLovelace({
          inputs: [stuffed(lovelaceGrant()), fundInput()],
          outputs: [
            stuffed(
              withCaps(lovelaceGrant(), { cap: 3_000_000n, lovelaceCap: 0n }),
            ),
            ...lovelaceSpendOutputs(2_000_000n).slice(1),
          ],
        }),
      ).toEqual([{ code: 'grant-input-value' }]);
    });

    it('refuses a second grant UTxO of the account', () => {
      const second = grantOutput(tokenGrant());
      expect(
        spendLovelace({
          inputs: [grantOutput(lovelaceGrant()), second, fundInput()],
          outputs: [...lovelaceSpendOutputs(2_000_000n), second],
        }),
      ).toEqual([{ code: 'account-token-inputs', count: 2 }]);
    });

    it('refuses a grantee that did not sign', () => {
      expect(spendLovelace({ requiredSigners: [DEVICE_KEY] })).toEqual([
        { code: 'grantee-not-signer', grantee: STRANGER_KEY },
      ]);
    });

    it('matches required signers in any case', () => {
      expect(
        spendLovelace({ requiredSigners: [STRANGER_KEY.toUpperCase()] }),
      ).toEqual([]);
    });
  });

  describe('the recreated grant UTxO', () => {
    const after = withCaps(lovelaceGrant(), {
      cap: 3_000_000n,
      lovelaceCap: 0n,
    });
    const rest = () => lovelaceSpendOutputs(2_000_000n).slice(1);

    it.each<[string, () => Cardano.TxOut[], string[]]>([
      [
        'no grant output, so its value leaves the account',
        () => rest(),
        [
          'per-call-cap-exceeded',
          'foreign-asset-outflow',
          'grant-output-count',
        ],
      ],
      [
        'two grant outputs',
        () => [grantOutput(after), grantOutput(after), ...rest()],
        ['grant-output-count'],
      ],
      [
        'extra tokens on the grant output',
        () => [
          {
            ...grantOutput(after),
            value: valueOf(2_000_000n, [
              [grantTokenOf(STAKE_SCRIPT_HASH, 0n), 1n],
              [TOKEN, 1n],
            ]),
          },
          ...rest(),
        ],
        ['grant-output-value'],
      ],
      [
        'lovelace added to the grant output',
        () => [grantOutput(after, { lovelace: 2_000_001n }), ...rest()],
        ['grant-output-value'],
      ],
      [
        'a grant output under a datum hash',
        () => {
          const { datum: _, ...held } = grantOutput(after);
          return [{ ...held, datumHash: DATUM_HASH }, ...rest()];
        },
        ['grant-output-datum'],
      ],
      [
        'a grant output whose datum is not a grant',
        () => [{ ...grantOutput(after), datum: 42n }, ...rest()],
        ['grant-output-datum'],
      ],
      [
        'a reference script on the grant output',
        () => [
          { ...grantOutput(after), scriptReference: REFERENCE_SCRIPT },
          ...rest(),
        ],
        ['grant-output-reference-script'],
      ],
      [
        'a deposit back under a datum hash',
        () => [
          grantOutput(after),
          { ...fundOutput(valueOf(8_000_000n)), datumHash: DATUM_HASH },
          payout(2_000_000n),
        ],
        ['deposit-not-plain'],
      ],
      [
        'a deposit back under an inline datum',
        () => [
          grantOutput(after),
          { ...fundOutput(valueOf(8_000_000n)), datum: 7n },
          payout(2_000_000n),
        ],
        ['deposit-not-plain'],
      ],
      [
        'a deposit back with a reference script',
        () => [
          grantOutput(after),
          {
            ...fundOutput(valueOf(8_000_000n)),
            scriptReference: REFERENCE_SCRIPT,
          },
          payout(2_000_000n),
        ],
        ['deposit-not-plain'],
      ],
    ])('refuses %s', (_, outputs, expected) => {
      expect(codes(spendLovelace({ outputs: outputs() }))).toEqual(expected);
    });

    it("refuses the grant output at another account's address", () => {
      // The grant's value then leaves the account, token included.
      expect(
        codes(
          spendLovelace({
            outputs: [
              { ...grantOutput(after), address: OTHER_ACCOUNT_ADDRESS },
              ...rest(),
            ],
          }),
        ),
      ).toEqual([
        'per-call-cap-exceeded',
        'foreign-asset-outflow',
        'account-token-misplaced',
        'grant-output-address',
        'grant-output-cap',
      ]);
    });
  });

  describe('account tokens', () => {
    it('refuses a stray state NFT among the inputs', () => {
      const stray = output(
        RECIPIENT_ADDRESS,
        valueOf(1_000_000n, [[nftOf(OTHER_STAKE_SCRIPT_HASH), 1n]]),
      );
      expect(
        codes(
          spendLovelace({
            inputs: [grantOutput(lovelaceGrant()), fundInput(), stray],
            outputs: [
              ...lovelaceSpendOutputs(2_000_000n),
              output(
                OTHER_ACCOUNT_ADDRESS,
                valueOf(1_000_000n, [[nftOf(OTHER_STAKE_SCRIPT_HASH), 1n]]),
              ),
            ],
          }),
        ),
      ).toEqual(['account-token-misplaced']);
    });

    it.each([
      ['a grant token of the account', grantTokenOf(STAKE_SCRIPT_HASH, 2n), 1n],
      ["another account's state NFT", nftOf(OTHER_STAKE_SCRIPT_HASH), 1n],
      [
        "a burn of another account's grant token",
        grantTokenOf(OTHER_STAKE_SCRIPT_HASH, 0n),
        -1n,
      ],
    ])('refuses %s minted beside the spend', (_, assetId, quantity) => {
      expect(spendLovelace({ mint: new Map([[assetId, quantity]]) })).toEqual([
        { code: 'mint-under-policy', assetId, quantity },
      ]);
    });

    it('ignores a mint of another policy', () => {
      expect(spendLovelace({ mint: new Map([[TOKEN, 1n]]) })).toEqual([]);
    });
  });

  it('accepts account hashes in upper case', () => {
    expect(
      spendLovelace({
        account: {
          accountValidatorHash: SCRIPT_HASH.toUpperCase() as Hash28ByteBase16,
          stakeScriptHash: STAKE_SCRIPT_HASH.toUpperCase() as Hash28ByteBase16,
        },
      }),
    ).toEqual([]);
  });
});
