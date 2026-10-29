import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { classifyCustodyAccountUtxos } from '@lace-lib/cardano-custody';
import { describe, expect, it } from 'vitest';

import {
  classifyCardanoCustodyGrants,
  isCardanoCustodyGrantExhausted,
} from '../../src/custody/grant-status';
import {
  cardanoCustodyAccount,
  custodyGrant,
  custodyLovelaceScope,
  custodyProtocolParameters,
  custodyState,
  grantUtxo,
} from '../custody-mocks';

import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyGrantUtxo,
  CustodyRecipient,
  CustodyScope,
} from '@lace-lib/cardano-custody';

const NOW = 1_800_000_000_000;
const EXPIRY = BigInt(NOW + 3_600_000);
const networkId = Cardano.NetworkId.Testnet;
const pricing = { protocolParameters: custodyProtocolParameters, networkId };

/**
 * Smallest outputs on Preprod: lovelace to an enterprise key address, the
 * cheapest an unrestricted grant can pay; lovelace to a base address; and
 * one `token` unit to an enterprise key address.
 */
const ENTERPRISE_OUTPUT = 849_070n;
const BASE_OUTPUT = 969_750n;
const ENTERPRISE_TOKEN_OUTPUT = 1_021_470n;
const FEE_BOUND = 1_500_000n;

const TOKEN = {
  policyId: HexBlob('99'.repeat(28)),
  assetName: HexBlob('746f6b656e'),
};

const tokenScope = (scope: Partial<CustodyScope> = {}): CustodyScope =>
  custodyLovelaceScope(EXPIRY, {
    asset: TOKEN,
    perCallCap: 10n,
    cap: 50n,
    lovelacePerCallCap: 5_000_000n,
    lovelaceCap: 20_000_000n,
    ...scope,
  });

const baseRecipient: CustodyRecipient = {
  paymentCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: HexBlob('b1'.repeat(28)),
  },
  stakeCredential: {
    kind: 'inline',
    credential: {
      type: Cardano.CredentialType.KeyHash,
      hash: HexBlob('b2'.repeat(28)),
    },
  },
};

const enterpriseRecipient: CustodyRecipient = {
  paymentCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: HexBlob('b3'.repeat(28)),
  },
};

const grant = (
  slot: bigint,
  byte: string,
  scope: Partial<CustodyScope> = {},
): CustodyGrant =>
  custodyGrant(slot, byte, custodyLovelaceScope(EXPIRY, scope));

/** The grant UTxO of a grant, as the classifier reads it from the chain. */
const utxoOf = (seed: number, value: CustodyGrant): CustodyGrantUtxo => {
  const [classified] = classifyCustodyAccountUtxos(
    cardanoCustodyAccount.blockchainSpecific,
    [grantUtxo(seed, value)],
  ).grants;
  return classified;
};

type GrantView = Parameters<typeof classifyCardanoCustodyGrants>[0]['inFlight'];

const viewOf = (
  grants: CustodyGrantUtxo[],
  state: Partial<CustodyAccountState> = {},
): GrantView => ({
  state: {
    ...custodyState,
    nextSlot: BigInt(grants.length),
    outstanding: BigInt(grants.length),
    ...state,
  },
  grants,
});

const classify = (
  confirmed: GrantView | undefined,
  inFlight: GrantView = confirmed!,
  now = NOW,
) => classifyCardanoCustodyGrants({ confirmed, inFlight, now, ...pricing });

const agent = utxoOf(1, grant(0n, 'a1'));
const other = utxoOf(2, grant(1n, 'a2'));

describe('classifyCardanoCustodyGrants', () => {
  it('lists a confirmed current grant without an operation in flight as live', () => {
    expect(classify(viewOf([agent]))).toEqual([{ ...agent, status: 'live' }]);
  });

  it('lists a grant whose expiry the tip reached as expired', () => {
    expect(classify(viewOf([agent]), undefined, Number(EXPIRY))).toEqual([
      { ...agent, status: 'expired' },
    ]);
  });

  it('lists a grant whose slot the confirmed state revoked as revoked', () => {
    expect(classify(viewOf([agent, other], { revoked: [0n] }))).toEqual([
      { ...agent, status: 'revoked' },
      { ...other, status: 'live' },
    ]);
  });

  it('lists a grant of an older generation than the confirmed state as superseded', () => {
    expect(classify(viewOf([agent], { grantGeneration: 1n }))).toEqual([
      { ...agent, status: 'superseded' },
    ]);
  });

  it('lists a grant of a newer generation than the confirmed state as pending', () => {
    const ahead = utxoOf(3, { ...grant(0n, 'a1'), generation: 1n });

    expect(classify(viewOf([ahead]))).toEqual([
      { ...ahead, status: 'pending' },
    ]);
  });

  it('lists a grant only a submitted operation issues as pending', () => {
    expect(classify(viewOf([agent]), viewOf([agent, other]))).toEqual([
      { ...agent, status: 'live' },
      { ...other, status: 'pending' },
    ]);
  });

  it('lists every grant as pending before the account has a confirmed state', () => {
    expect(classify(undefined, viewOf([agent]))).toEqual([
      { ...agent, status: 'pending' },
    ]);
  });

  it('lists a grant a submitted operation revokes as revoking', () => {
    expect(
      classify(
        viewOf([agent, other]),
        viewOf([agent, other], { revoked: [0n] }),
      ),
    ).toEqual([
      { ...agent, status: 'revoking' },
      { ...other, status: 'live' },
    ]);
  });

  it('lists the grants a submitted revoke-all kills as revoking', () => {
    expect(
      classify(
        viewOf([agent, other]),
        viewOf([agent, other], { grantGeneration: 1n }),
      ),
    ).toEqual([
      { ...agent, status: 'revoking' },
      { ...other, status: 'revoking' },
    ]);
  });

  it('lists an expired grant a submitted operation revokes as revoking', () => {
    expect(
      classify(
        viewOf([agent]),
        viewOf([agent], { revoked: [0n] }),
        Number(EXPIRY),
      ),
    ).toEqual([{ ...agent, status: 'revoking' }]);
  });

  it('lists a submitted replace as the old grant revoking and the new one pending', () => {
    const replacement = utxoOf(4, grant(1n, 'a1', { cap: 80_000_000n }));

    expect(
      classify(
        viewOf([agent]),
        viewOf([agent, replacement], { revoked: [0n] }),
      ),
    ).toEqual([
      { ...agent, status: 'revoking' },
      { ...replacement, status: 'pending' },
    ]);
  });

  it('lists a grant a submitted operation burns as sweeping, in slot order', () => {
    const revoked = { revoked: [0n] };

    expect(
      classify(viewOf([agent, other], revoked), viewOf([other], revoked)),
    ).toEqual([
      { ...agent, status: 'sweeping' },
      { ...other, status: 'live' },
    ]);
  });

  it('lists the in-flight version of a grant a submitted grant spend draws down', () => {
    const spent = utxoOf(5, grant(0n, 'a1', { cap: 40_000_000n }));

    expect(classify(viewOf([agent]), viewOf([spent]))).toEqual([
      { ...spent, status: 'live' },
    ]);
  });

  it('lists a current grant whose remaining caps no longer pay the smallest spend as exhausted', () => {
    const drained = utxoOf(
      6,
      grant(0n, 'a1', { cap: ENTERPRISE_OUTPUT + FEE_BOUND - 1n }),
    );

    expect(classify(viewOf([drained]))).toEqual([
      { ...drained, status: 'exhausted' },
    ]);
  });

  it('lists an expired grant as expired, not exhausted', () => {
    const drained = utxoOf(7, grant(0n, 'a1', { cap: 0n }));

    expect(classify(viewOf([drained]), undefined, Number(EXPIRY))).toEqual([
      { ...drained, status: 'expired' },
    ]);
  });
});

describe('isCardanoCustodyGrantExhausted', () => {
  describe('a lovelace grant', () => {
    const smallestSpend = ENTERPRISE_OUTPUT + FEE_BOUND;

    it('is not exhausted while both lovelace caps reach the smallest spend', () => {
      expect(
        isCardanoCustodyGrantExhausted(
          custodyLovelaceScope(EXPIRY, {
            cap: smallestSpend,
            perCallCap: smallestSpend,
          }),
          pricing,
        ),
      ).toBe(false);
    });

    it.each([
      ['cap', { cap: smallestSpend - 1n }],
      ['perCallCap', { perCallCap: smallestSpend - 1n }],
    ] as [string, Partial<CustodyScope>][])(
      'is exhausted once %s is below the smallest spend',
      (_, scope) => {
        expect(
          isCardanoCustodyGrantExhausted(
            custodyLovelaceScope(EXPIRY, scope),
            pricing,
          ),
        ).toBe(true);
      },
    );

    it('prices the smallest spend with the given fee bound', () => {
      const scope = custodyLovelaceScope(EXPIRY, {
        cap: ENTERPRISE_OUTPUT + 500_000n,
      });

      expect(isCardanoCustodyGrantExhausted(scope, pricing)).toBe(true);
      expect(
        isCardanoCustodyGrantExhausted(scope, {
          ...pricing,
          feeBound: 500_000n,
        }),
      ).toBe(false);
    });

    it('prices the cheapest listed recipient', () => {
      const atBase = custodyLovelaceScope(EXPIRY, {
        cap: BASE_OUTPUT + FEE_BOUND - 1n,
        recipients: [baseRecipient],
      });

      expect(isCardanoCustodyGrantExhausted(atBase, pricing)).toBe(true);
      expect(
        isCardanoCustodyGrantExhausted(
          { ...atBase, recipients: [baseRecipient, enterpriseRecipient] },
          pricing,
        ),
      ).toBe(false);
    });

    it('is exhausted when no listed recipient names an address', () => {
      const unrepresentable: CustodyRecipient = {
        paymentCredential: {
          type: Cardano.CredentialType.KeyHash,
          hash: HexBlob('b4'),
        },
      };

      expect(
        isCardanoCustodyGrantExhausted(
          custodyLovelaceScope(EXPIRY, { recipients: [unrepresentable] }),
          pricing,
        ),
      ).toBe(true);
    });
  });

  describe('a token grant', () => {
    const smallestLovelaceSpend = ENTERPRISE_TOKEN_OUTPUT + FEE_BOUND;

    it('is not exhausted while it can send one token and the lovelace beside it', () => {
      expect(
        isCardanoCustodyGrantExhausted(
          tokenScope({
            cap: 1n,
            perCallCap: 1n,
            lovelaceCap: smallestLovelaceSpend,
            lovelacePerCallCap: smallestLovelaceSpend,
          }),
          pricing,
        ),
      ).toBe(false);
    });

    it.each([
      ['cap', { cap: 0n }],
      ['perCallCap', { perCallCap: 0n }],
      ['lovelaceCap', { lovelaceCap: smallestLovelaceSpend - 1n }],
      [
        'lovelacePerCallCap',
        { lovelacePerCallCap: smallestLovelaceSpend - 1n },
      ],
    ] as [string, Partial<CustodyScope>][])(
      'is exhausted once %s is below the smallest spend',
      (_, scope) => {
        expect(isCardanoCustodyGrantExhausted(tokenScope(scope), pricing)).toBe(
          true,
        );
      },
    );

    it('is exhausted when its asset names no token', () => {
      expect(
        isCardanoCustodyGrantExhausted(
          tokenScope({
            asset: { policyId: HexBlob('99'), assetName: HexBlob('') },
          }),
          pricing,
        ),
      ).toBe(true);
    });
  });
});
