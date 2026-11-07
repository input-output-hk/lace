import * as v8 from '@midnight-ntwrk/ledger-v8';
import * as v9 from '@midnightntwrk/ledger-v9';
import { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
import {
  ProtocolVersion,
  WalletTransaction,
} from '@midnightntwrk/wallet-sdk-abstractions';
import { BehaviorSubject, NEVER } from 'rxjs';
import { vi } from 'vitest';

import type { DefaultConfiguration } from '@midnightntwrk/wallet-sdk/facade';

export const unproven = (version = ProtocolVersion.MinSupportedVersion) =>
  WalletTransaction.adopt(
    'Unproven',
    (version >= ProtocolVersion.V9NativeForkVersion
      ? v9
      : v8
    ).Transaction.fromParts('undeployed'),
    version,
  );

/** Real facade and ledger objects, with network and coin selection supplied as ports. */
export const createFacadeHarness = async () => {
  const state = () =>
    new BehaviorSubject({
      protocolVersion: ProtocolVersion.MinSupportedVersion,
      verifyingKey: {
        tag: 'schnorr' as const,
        value: v8.signatureVerifyingKey('01'.repeat(32)),
      },
      progress: { isStrictlyComplete: () => false },
    });
  const port = () => ({
    state: state(),
    stop: vi.fn(async () => undefined),
    revertFailedSegments: vi.fn(async () => undefined),
    revertTransaction: vi.fn(async () => undefined),
    balanceTransaction: vi.fn(),
    balanceFinalizedTransaction: vi.fn(),
    balanceUnboundTransaction: vi.fn(),
    revertUtxos: vi.fn(async (_ids: string[]) => undefined),
    balanceTransactions: vi.fn(),
    transferTransaction: vi.fn(),
    initSwap: vi.fn(),
  });
  const shielded = port();
  const unshielded = port();
  const dust = port();
  const lifecycle = {
    state: () => NEVER,
    finalized: vi.fn(async () => undefined),
    included: vi.fn(async () => undefined),
    serializeState: vi.fn(async () => ''),
    orphanBeyond: vi.fn(async () => undefined),
    balanced: vi.fn(async () => undefined),
    reverted: vi.fn(async () => undefined),
    submitted: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  };
  const proving = { prove: vi.fn() };
  const submission = {
    close: vi.fn(async () => undefined),
    submitTransaction: vi.fn(),
  };
  const wallet = await WalletFacade.init({
    configuration: { networkId: 'undeployed' } as DefaultConfiguration,
    shielded: () => shielded as never,
    unshielded: () => unshielded as never,
    dust: () => dust as never,
    transactionLifecycleService: () => lifecycle as never,
    provingService: () => proving,
    submissionService: () => submission as never,
    fetchBlockData: () => ({ fetch: vi.fn() } as never),
    validationService: () => ({} as never),
  });
  const crossFork = () => {
    for (const component of [shielded, unshielded, dust])
      component.state.next({
        ...component.state.value,
        protocolVersion: ProtocolVersion.V9NativeForkVersion,
      });
  };
  return {
    wallet,
    shielded,
    unshielded,
    dust,
    lifecycle,
    proving,
    submission,
    crossFork,
  };
};
