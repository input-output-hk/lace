import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import { APIError, APIErrorCode } from '../src/common/api-error';
import { addrToDisplay, addrToSignWith } from '../src/common/store/util';

import type { Ed25519KeyHashHex, Hash28ByteBase16 } from '@cardano-sdk/crypto';

const paymentAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;

const rewardAccount =
  'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn' as Cardano.RewardAccount;

// All fixtures below are different encodings of the same DRep credential.
const drepKeyHashHex =
  'e9529fa1028dbe3388da5f26b6960d04d8e301c8a7adab6283397884';
const drepIdCip129Bech32 = Cardano.DRepID(
  'drep1yt5498apq2xmuvugmf0jdd5kp5zd3ccpezn6m2mzsvuh3pqn8x06l',
);
const drepIdCip105Bech32 = Cardano.DRepID(
  'drep1a9fflggz3klr8zx6tuntd9sdqnvwxqwg57k6kc5r89uggk24zj2',
);
const drepIdCip105Bech32KeyHashHex = Cardano.DRepID.toCredential(
  drepIdCip105Bech32,
).hash as unknown as string;
const drepIdCip129Hex = `22${drepKeyHashHex}`;
const enterpriseAddressMainnetHex = `61${drepKeyHashHex}`;
const enterpriseAddressTestnetHex = `60${drepKeyHashHex}`;

const hexOf = (account: Cardano.RewardAccount): string =>
  String(Cardano.Address.fromBech32(account).toBytes());

// Reward address sharing drepKeyHashHex with the DRep fixtures above, proving
// disambiguation is by address header/type, not by the credential hash.
const rewardAccountMainnet = Cardano.RewardAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  {
    type: Cardano.CredentialType.KeyHash,
    hash: drepKeyHashHex as unknown as Hash28ByteBase16,
  },
)
  .toAddress()
  .toBech32() as Cardano.RewardAccount;
const rewardAccountScript = Cardano.RewardAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  {
    type: Cardano.CredentialType.ScriptHash,
    hash: drepKeyHashHex as unknown as Hash28ByteBase16,
  },
)
  .toAddress()
  .toBech32() as Cardano.RewardAccount;

const rewardAccountTestnetHex = hexOf(rewardAccount);
const rewardAccountMainnetHex = hexOf(rewardAccountMainnet);
const rewardAccountScriptHex = hexOf(rewardAccountScript);

const accountDRepKeyHash = drepKeyHashHex as Ed25519KeyHashHex;
const otherKeyHash =
  'aaaaaaaa028dbe3388da5f26b6960d04d8e301c8a7adab62833978bb' as Ed25519KeyHashHex;

const paymentAddressHex = String(
  Cardano.Address.fromBech32(paymentAddress).toBytes(),
);
const enterpriseAddressBech32 = Cardano.Address.fromBytes(
  HexBlob(enterpriseAddressTestnetHex),
).toBech32() as Cardano.PaymentAddress;

const expectEnterpriseKeyAddressWithHash = (
  result: Cardano.PaymentAddress | Cardano.RewardAccount,
  expectedKeyHashHex: string,
  expectedNetworkId?: number,
) => {
  const address = Cardano.Address.fromString(result);
  expect(address).toBeDefined();
  expect(address!.getType()).toBe(Cardano.AddressType.EnterpriseKey);
  expect(address!.getProps().paymentPart?.hash).toBe(expectedKeyHashHex);
  expect(address!.getProps().paymentPart?.type).toBe(
    Cardano.CredentialType.KeyHash,
  );
  if (expectedNetworkId !== undefined) {
    expect(address!.getNetworkId()).toBe(expectedNetworkId);
  }
};

describe('addrToSignWith', () => {
  it('returns payment addresses unchanged', () => {
    expect(addrToSignWith(paymentAddress)).toBe(paymentAddress);
  });

  it('returns reward accounts unchanged', () => {
    expect(addrToSignWith(rewardAccount)).toBe(rewardAccount);
  });

  describe('extended DRepID encodings', () => {
    it('accepts a CIP-129 bech32 DRep ID', () => {
      expectEnterpriseKeyAddressWithHash(
        addrToSignWith(drepIdCip129Bech32),
        drepKeyHashHex,
      );
    });

    it('accepts a CIP-129 hex DRep ID and drops the header byte', () => {
      expectEnterpriseKeyAddressWithHash(
        addrToSignWith(drepIdCip129Hex),
        drepKeyHashHex,
      );
    });

    it('accepts a legacy CIP-105 bech32 DRep ID', () => {
      expectEnterpriseKeyAddressWithHash(
        addrToSignWith(drepIdCip105Bech32),
        drepIdCip105Bech32KeyHashHex,
      );
    });

    it('accepts a legacy CIP-105 hex DRep key hash', () => {
      expectEnterpriseKeyAddressWithHash(
        addrToSignWith(drepKeyHashHex),
        drepKeyHashHex,
      );
    });

    it('accepts a type-6 enterprise address hex (mainnet) and preserves the network byte', () => {
      expectEnterpriseKeyAddressWithHash(
        addrToSignWith(enterpriseAddressMainnetHex),
        drepKeyHashHex,
        1,
      );
    });

    it('accepts a type-6 enterprise address hex (testnet) and preserves the network byte', () => {
      expectEnterpriseKeyAddressWithHash(
        addrToSignWith(enterpriseAddressTestnetHex),
        drepKeyHashHex,
        0,
      );
    });
  });

  it.each<[label: string, input: string, expected: Cardano.RewardAccount]>([
    ['testnet key reward address', rewardAccountTestnetHex, rewardAccount],
    [
      'mainnet key reward address',
      rewardAccountMainnetHex,
      rewardAccountMainnet,
    ],
    [
      'testnet script reward address',
      rewardAccountScriptHex,
      rewardAccountScript,
    ],
  ])(
    'signs a hex %s with its bech32 reward account',
    (_label, input, expected) => {
      expect(addrToSignWith(input)).toBe(expected);
    },
  );

  it('signs a hex base payment address with its bech32 address', () => {
    expect(addrToSignWith(paymentAddressHex)).toBe(paymentAddress);
  });

  it('throws APIError for unrecognised input', () => {
    expect(() => addrToSignWith('not-a-valid-address')).toThrow(
      new APIError(
        APIErrorCode.InternalError,
        'Invalid address format for signing',
      ),
    );
  });

  it('throws APIError for hex strings whose length is neither 56 nor 58', () => {
    expect(() => addrToSignWith(`${drepKeyHashHex}aaaa`)).toThrow(APIError);
  });
});

describe('addrToDisplay', () => {
  it('returns payment addresses unchanged', () => {
    expect(addrToDisplay(paymentAddress)).toBe(paymentAddress);
  });

  it('returns reward addresses unchanged', () => {
    expect(addrToDisplay(rewardAccount)).toBe(rewardAccount);
  });

  it('returns the original input when the format is not recognised', () => {
    expect(addrToDisplay('not-a-valid-address')).toBe('not-a-valid-address');
  });

  describe('hex reward (stake) addresses render as bech32 (LW-15062)', () => {
    it.each<[label: string, input: string, expected: Cardano.RewardAccount]>([
      ['testnet key reward address', rewardAccountTestnetHex, rewardAccount],
      [
        'mainnet key reward address',
        rewardAccountMainnetHex,
        rewardAccountMainnet,
      ],
      [
        'testnet script reward address',
        rewardAccountScriptHex,
        rewardAccountScript,
      ],
    ])('decodes %s to its bech32 stake address', (_label, input, expected) => {
      expect(addrToDisplay(input)).toBe(expected);
    });

    it('shows the stake key, not a DRep ID, when the dApp signs with the stake key', () => {
      const result = addrToDisplay(rewardAccountTestnetHex);
      expect(result.startsWith('drep1')).toBe(false);
      expect(result.startsWith('stake')).toBe(true);
    });
  });

  describe('payment addresses render as bech32', () => {
    it('decodes a hex base payment address to its bech32 address', () => {
      expect(addrToDisplay(paymentAddressHex)).toBe(paymentAddress);
    });

    it('returns a bech32 enterprise payment address unchanged, not a DRep ID', () => {
      const result = addrToDisplay(enterpriseAddressBech32);
      expect(result).toBe(enterpriseAddressBech32);
      expect(result.startsWith('drep1')).toBe(false);
    });
  });

  describe('disambiguates a type-6 enterprise address by the account DRep key hash', () => {
    it('renders a DRep ID when a hex enterprise address is the account DRep key', () => {
      const result = addrToDisplay(enterpriseAddressTestnetHex, {
        dRepKeyHash: accountDRepKeyHash,
      });
      expect(result.startsWith('drep1')).toBe(true);
      expect(Cardano.DRepID.toCredential(Cardano.DRepID(result)).hash).toBe(
        drepKeyHashHex,
      );
    });

    it('renders the payment address when a hex enterprise address is not the account DRep key', () => {
      const result = addrToDisplay(enterpriseAddressTestnetHex, {
        dRepKeyHash: otherKeyHash,
      });
      expect(result).toBe(enterpriseAddressBech32);
      expect(result.startsWith('drep1')).toBe(false);
    });

    it('renders a DRep ID when a bech32 enterprise address is the account DRep key', () => {
      const result = addrToDisplay(enterpriseAddressBech32, {
        dRepKeyHash: accountDRepKeyHash,
      });
      expect(result.startsWith('drep1')).toBe(true);
    });

    it('keeps a bech32 enterprise address when it is not the account DRep key', () => {
      expect(
        addrToDisplay(enterpriseAddressBech32, { dRepKeyHash: otherKeyHash }),
      ).toBe(enterpriseAddressBech32);
    });

    it('keeps an explicit CIP-129 DRep ID even when it is not the account DRep key', () => {
      const result = addrToDisplay(drepIdCip129Bech32, {
        dRepKeyHash: otherKeyHash,
      });
      expect(result.startsWith('drep1')).toBe(true);
    });

    it('still renders a hex reward address as bech32 with a DRep key hash present', () => {
      expect(
        addrToDisplay(rewardAccountTestnetHex, {
          dRepKeyHash: accountDRepKeyHash,
        }),
      ).toBe(rewardAccount);
    });
  });

  describe('extended DRepID encodings normalised to CIP-129', () => {
    it.each<[label: string, input: string, expectedHash: string]>([
      ['CIP-129 bech32 DRep ID', drepIdCip129Bech32, drepKeyHashHex],
      ['CIP-129 hex DRep ID', drepIdCip129Hex, drepKeyHashHex],
      [
        'CIP-105 bech32 DRep ID',
        drepIdCip105Bech32,
        drepIdCip105Bech32KeyHashHex,
      ],
      ['CIP-105 hex DRep key hash', drepKeyHashHex, drepKeyHashHex],
      [
        'type-6 enterprise address hex (mainnet)',
        enterpriseAddressMainnetHex,
        drepKeyHashHex,
      ],
      [
        'type-6 enterprise address hex (testnet)',
        enterpriseAddressTestnetHex,
        drepKeyHashHex,
      ],
    ])('normalises %s to a CIP-129 DRep ID', (_label, input, expectedHash) => {
      const result = addrToDisplay(input);
      expect(result.startsWith('drep1')).toBe(true);
      const credential = Cardano.DRepID.toCredential(Cardano.DRepID(result));
      expect(credential.hash).toBe(expectedHash);
      expect(credential.type).toBe(Cardano.CredentialType.KeyHash);
    });

    it('preserves the ScriptHash credential type for CIP-129 hex with header 23', () => {
      const cip129ScriptHex = `23${drepKeyHashHex}`;
      const result = addrToDisplay(cip129ScriptHex);
      expect(result.startsWith('drep1')).toBe(true);
      const credential = Cardano.DRepID.toCredential(Cardano.DRepID(result));
      expect(credential.hash).toBe(drepKeyHashHex);
      expect(credential.type).toBe(Cardano.CredentialType.ScriptHash);
    });
  });
});

describe('addrToDisplay matches addrToSignWith (LW-15062)', () => {
  it.each<[label: string, input: string]>([
    ['bech32 reward account', rewardAccount],
    ['hex testnet key reward address', rewardAccountTestnetHex],
    ['hex mainnet key reward address', rewardAccountMainnetHex],
    ['hex testnet script reward address', rewardAccountScriptHex],
  ])(
    'displays the same reward account it signs with for a %s',
    (_label, input) => {
      const signedWith = addrToSignWith(input);
      expect(Cardano.isRewardAccount(signedWith)).toBe(true);
      expect(addrToDisplay(input)).toBe(signedWith);
    },
  );

  it.each<[label: string, input: string]>([
    ['bech32 base payment address', paymentAddress],
    ['hex base payment address', paymentAddressHex],
    ['bech32 enterprise payment address', enterpriseAddressBech32],
  ])(
    'displays the same payment address it signs with for a %s',
    (_label, input) => {
      expect(addrToDisplay(input)).toBe(addrToSignWith(input));
    },
  );
});
