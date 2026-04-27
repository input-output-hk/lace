import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  formatDeposit,
  formatDRepId,
  formatStakeAddress,
  formatStakeKeyHash,
  getDRepDisplayInfo,
} from '../src/common/utils';

describe('certificate-utils', () => {
  describe('formatStakeAddress', () => {
    it('formats a stake credential as a bech32 reward address for mainnet', () => {
      const networkId = Cardano.NetworkId.Mainnet;
      const stakeCredential: Cardano.Credential = {
        type: Cardano.CredentialType.KeyHash,
        hash: Crypto.Ed25519KeyHashHex(
          '00000000000000000000000000000000000000000000000000000000',
        ),
      };

      const result = formatStakeAddress(networkId, stakeCredential);

      expect(result).toBe(
        'stake1uyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq28lj8u',
      );
    });

    it('formats a stake credential as a bech32 reward address for testnet', () => {
      const networkId = Cardano.NetworkId.Testnet;
      const stakeCredential: Cardano.Credential = {
        type: Cardano.CredentialType.KeyHash,
        hash: Crypto.Ed25519KeyHashHex(
          '00000000000000000000000000000000000000000000000000000000',
        ),
      };

      const result = formatStakeAddress(networkId, stakeCredential);

      expect(result).toBe(
        'stake_test1uqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqdd4srp',
      );
    });
  });

  describe('formatStakeKeyHash', () => {
    it('returns the credential hash as hex string', () => {
      const stakeCredential: Cardano.Credential = {
        type: Cardano.CredentialType.KeyHash,
        hash: Crypto.Ed25519KeyHashHex(
          '00000000000000000000000000000000000000000000000000000000',
        ),
      };

      const result = formatStakeKeyHash(stakeCredential);

      expect(result).toBe(
        '00000000000000000000000000000000000000000000000000000000',
      );
    });
  });

  describe('formatDRepId', () => {
    it('converts a hash to a bech32-encoded DRep ID', () => {
      const hash =
        '00000000000000000000000000000000000000000000000000000000' as Crypto.Hash28ByteBase16;

      const result = formatDRepId(hash);

      expect(result).toBe(
        'drep1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqua9udh',
      );
    });

    it('converts a different hash to a bech32-encoded DRep ID', () => {
      const hash =
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef12' as Crypto.Hash28ByteBase16;

      const result = formatDRepId(hash);

      expect(result.startsWith('drep1')).toBe(true);
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('formatDeposit', () => {
    it('formats deposit in lovelace to ADA with coin symbol', () => {
      const deposit = BigInt(2_000_000);
      const coinSymbol = 'ADA';

      const result = formatDeposit(deposit, coinSymbol);

      expect(result).toBe('2.00 ADA');
    });

    it('formats deposit with testnet symbol', () => {
      const deposit = BigInt(2_000_000);
      const coinSymbol = 'tADA';

      const result = formatDeposit(deposit, coinSymbol);

      expect(result).toBe('2.00 tADA');
    });

    it('formats larger deposit amounts', () => {
      const deposit = BigInt(500_000_000);
      const coinSymbol = 'ADA';

      const result = formatDeposit(deposit, coinSymbol);

      expect(result).toBe('500.00 ADA');
    });

    it('formats deposit with decimals', () => {
      const deposit = BigInt(2_500_000);
      const coinSymbol = 'ADA';

      const result = formatDeposit(deposit, coinSymbol);

      expect(result).toBe('2.50 ADA');
    });

    it('formats zero deposit', () => {
      const deposit = BigInt(0);
      const coinSymbol = 'ADA';

      const result = formatDeposit(deposit, coinSymbol);

      expect(result).toBe('0.00 ADA');
    });
  });

  describe('getDRepDisplayInfo', () => {
    it('returns drepId for credential-based DRep', () => {
      const dRep: Cardano.DelegateRepresentative = {
        type: Cardano.CredentialType.KeyHash,
        hash: Crypto.Ed25519KeyHashHex(
          '00000000000000000000000000000000000000000000000000000000',
        ),
      };

      const result = getDRepDisplayInfo(dRep);

      expect(result.drepId).toBeDefined();
      expect(result.drepId?.startsWith('drep1')).toBe(true);
      expect(result.alwaysAbstain).toBe(false);
      expect(result.alwaysNoConfidence).toBe(false);
    });

    it('returns alwaysAbstain flag for always abstain DRep', () => {
      const dRep: Cardano.DelegateRepresentative = {
        __typename: 'AlwaysAbstain',
      };

      const result = getDRepDisplayInfo(dRep);

      expect(result.drepId).toBeUndefined();
      expect(result.alwaysAbstain).toBe(true);
      expect(result.alwaysNoConfidence).toBe(false);
    });

    it('returns alwaysNoConfidence flag for always no confidence DRep', () => {
      const dRep: Cardano.DelegateRepresentative = {
        __typename: 'AlwaysNoConfidence',
      };

      const result = getDRepDisplayInfo(dRep);

      expect(result.drepId).toBeUndefined();
      expect(result.alwaysAbstain).toBe(false);
      expect(result.alwaysNoConfidence).toBe(true);
    });
  });
});
