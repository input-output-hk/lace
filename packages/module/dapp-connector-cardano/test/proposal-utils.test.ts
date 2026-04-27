import { describe, expect, it } from 'vitest';

import {
  formatFraction,
  formatLovelace,
  formatProposalDeposit,
  formatProtocolVersion,
  formatRewardAccount,
  getGovernanceActionExplorerUrl,
  truncateHash,
} from '../src/common/utils';

import type { Cardano } from '@cardano-sdk/core';

describe('proposal-utils', () => {
  describe('formatRewardAccount', () => {
    it('returns the string representation of a reward account', () => {
      const rewardAccount =
        'stake_test1uqfu74w3wh4gfzu8m6e7j987h4lq9r3t7ef5gaw497uu85qsqfy27' as Cardano.RewardAccount;
      const result = formatRewardAccount(rewardAccount);
      expect(result).toBe(rewardAccount);
    });
  });

  describe('formatProposalDeposit', () => {
    it('formats deposit with 2 decimal places for whole ADA amounts', () => {
      const deposit = BigInt(2_000_000);
      const result = formatProposalDeposit(deposit, 'ADA');
      expect(result).toContain('ADA');
      expect(result).toContain('2');
    });

    it('formats deposit with up to 6 decimal places for fractional ADA', () => {
      const deposit = BigInt(1_234_567);
      const result = formatProposalDeposit(deposit, 'tADA');
      expect(result).toContain('tADA');
      expect(result).toContain('1.234567');
    });

    it('formats zero deposit correctly', () => {
      const deposit = BigInt(0);
      const result = formatProposalDeposit(deposit, 'ADA');
      expect(result).toContain('0');
      expect(result).toContain('ADA');
    });

    it('formats large deposit amounts correctly', () => {
      const deposit = BigInt(500_000_000_000);
      const result = formatProposalDeposit(deposit, 'ADA');
      expect(result).toContain('ADA');
    });
  });

  describe('getGovernanceActionExplorerUrl', () => {
    const explorerBaseUrl = 'https://cexplorer.io';

    it('returns empty string when governance action ID is null', () => {
      const result = getGovernanceActionExplorerUrl(null, explorerBaseUrl);
      expect(result).toBe('');
    });

    it('returns empty string when explorer base URL is empty', () => {
      const governanceActionId = {
        id: 'abc123' as unknown as Cardano.TransactionId,
        actionIndex: 0,
      };
      const result = getGovernanceActionExplorerUrl(governanceActionId, '');
      expect(result).toBe('');
    });

    it('constructs correct explorer URL with action ID and index', () => {
      const governanceActionId = {
        id: 'abc123def456' as unknown as Cardano.TransactionId,
        actionIndex: 1,
      };
      const result = getGovernanceActionExplorerUrl(
        governanceActionId,
        explorerBaseUrl,
      );
      expect(result).toBe('https://cexplorer.io/governance/abc123def456#1');
    });

    it('handles action index of 0', () => {
      const governanceActionId = {
        id: 'txhash123' as unknown as Cardano.TransactionId,
        actionIndex: 0,
      };
      const result = getGovernanceActionExplorerUrl(
        governanceActionId,
        explorerBaseUrl,
      );
      expect(result).toBe('https://cexplorer.io/governance/txhash123#0');
    });
  });

  describe('formatLovelace', () => {
    it('formats lovelace to ADA with coin symbol', () => {
      const lovelace = BigInt(5_500_000);
      const result = formatLovelace(lovelace, 'tADA');
      expect(result).toContain('5.5');
      expect(result).toContain('tADA');
    });

    it('formats zero lovelace', () => {
      const lovelace = BigInt(0);
      const result = formatLovelace(lovelace, 'ADA');
      expect(result).toContain('0');
      expect(result).toContain('ADA');
    });
  });

  describe('formatProtocolVersion', () => {
    it('formats protocol version with major and minor', () => {
      const protocolVersion = { major: 9, minor: 0 };
      const result = formatProtocolVersion(protocolVersion);
      expect(result).toBe('9.0');
    });

    it('formats protocol version with non-zero minor', () => {
      const protocolVersion = { major: 10, minor: 2 };
      const result = formatProtocolVersion(protocolVersion);
      expect(result).toBe('10.2');
    });
  });

  describe('truncateHash', () => {
    it('returns full hash if shorter than truncation threshold', () => {
      const shortHash = 'abc123';
      const result = truncateHash(shortHash);
      expect(result).toBe('abc123');
    });

    it('truncates long hash with default prefix and suffix lengths', () => {
      const longHash =
        'abc123456789def123456789ghi123456789jkl123456789mno123456789pqr';
      const result = truncateHash(longHash);
      expect(result).toMatch(/^abc12345\.\.\..*pqr$/);
      expect(result.length).toBeLessThan(longHash.length);
    });

    it('truncates hash with custom prefix and suffix lengths', () => {
      const hash =
        'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const result = truncateHash(hash, 4, 4);
      expect(result).toBe('abcd...WXYZ');
    });

    it('handles hash exactly at threshold length plus 3 for ellipsis', () => {
      const hash = '1234567890123456789';
      const result = truncateHash(hash, 8, 8);
      expect(result).toBe(hash);
    });
  });

  describe('formatFraction', () => {
    it('formats fraction to percentage', () => {
      const fraction = { numerator: 2, denominator: 3 };
      const result = formatFraction(fraction);
      expect(result).toBe('66.67%');
    });

    it('formats fraction with zero numerator', () => {
      const fraction = { numerator: 0, denominator: 100 };
      const result = formatFraction(fraction);
      expect(result).toBe('0.00%');
    });

    it('handles zero denominator gracefully', () => {
      const fraction = { numerator: 1, denominator: 0 };
      const result = formatFraction(fraction);
      expect(result).toBe('0%');
    });

    it('formats 100% fraction correctly', () => {
      const fraction = { numerator: 1, denominator: 1 };
      const result = formatFraction(fraction);
      expect(result).toBe('100.00%');
    });

    it('formats 50% fraction correctly', () => {
      const fraction = { numerator: 1, denominator: 2 };
      const result = formatFraction(fraction);
      expect(result).toBe('50.00%');
    });
  });
});
