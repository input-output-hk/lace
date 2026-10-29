import { Serialization } from '@cardano-sdk/core';
import { vi } from 'vitest';

import {
  SPONSOR_ADDRESS,
  sponsorCollateral,
  sponsorFee,
  sponsorWitnessSetFor,
} from './custody-fixtures';

import type {
  CardanoCustodySponsor,
  CardanoCustodySponsorCollateral,
  CardanoCustodySponsorLease,
} from '../../src/custody/cardano-custody-sponsor';
import type { HexBlob } from '@cardano-sdk/util';

/** 2026-10-07T00:00:00Z, the clock the orchestration tests run at. */
export const NOW = 1_791_331_200_000;

export const lease: CardanoCustodySponsorLease = {
  leaseId: 'lease-1',
  expiresAt: NOW + 600_000,
  feeUtxo: sponsorFee,
  collateralUtxo: sponsorCollateral,
  sponsorAddress: SPONSOR_ADDRESS,
  maxSponsoredLovelace: 10_000_000n,
};

export const collateral: CardanoCustodySponsorCollateral = {
  collateralUtxo: sponsorCollateral,
  sponsorAddress: SPONSOR_ADDRESS,
  validitySeconds: 600,
};

export const bodyHashOf = (transaction: string) =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(transaction)).getId();

/**
 * A fee sponsor that signs every transaction with the sponsor key and logs
 * each call, in order, to `calls`.
 */
export const createSponsorFake = (calls: string[] = []) => {
  const witnessFor = async (transaction: HexBlob) =>
    sponsorWitnessSetFor(bodyHashOf(transaction));
  const sponsor = {
    lease: vi.fn(async () => {
      calls.push('lease');
      return lease;
    }),
    signLeased: vi.fn(async (_leaseId: string, transaction: HexBlob) => {
      calls.push('signLeased');
      return witnessFor(transaction);
    }),
    releaseLease: vi.fn(async (_leaseId: string) => {
      calls.push('releaseLease');
    }),
    collateral: vi.fn(async () => {
      calls.push('collateral');
      return collateral;
    }),
    signCollateral: vi.fn(async (transaction: HexBlob) => {
      calls.push('signCollateral');
      return witnessFor(transaction);
    }),
  } satisfies CardanoCustodySponsor;
  return { sponsor, calls };
};
