import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  formatDeposit,
  formatDRepId,
  formatStakeKeyHash,
  getDRepDisplayInfo,
} from '../src/common/utils';

describe('certificate-utils', () => {
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
    it('converts a key-hash credential to a CIP-129 bech32-encoded DRep ID', () => {
      const credential: Cardano.Credential = {
        type: Cardano.CredentialType.KeyHash,
        hash: Crypto.Hash28ByteBase16(
          '00000000000000000000000000000000000000000000000000000000',
        ),
      };

      const result = formatDRepId(credential);

      expect(result).toBe(
        'drep1ygqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq7vlc9n',
      );
    });

    it('converts a script-hash credential to a CIP-129 bech32-encoded DRep ID', () => {
      const credential: Cardano.Credential = {
        type: Cardano.CredentialType.ScriptHash,
        hash: Crypto.Hash28ByteBase16(
          'b96897b866ec26f4b93d93b2792e496ba9369cef6bfd175d5ffb0d6a',
        ),
      };

      const result = formatDRepId(credential);

      expect(result).toBe(
        'drep1ywuk39acvmkzda9e8kfmy7fwf946jd5uaa4l696atlas66s68f0fl',
      );
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

      expect(result.drepId).toBe(
        'drep1ygqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq7vlc9n',
      );
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
