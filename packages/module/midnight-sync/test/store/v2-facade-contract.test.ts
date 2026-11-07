import { readMidnightTransaction } from '@lace-lib/vendor/midnight-transaction-handle';
import * as v8 from '@midnight-ntwrk/ledger-v8';
import * as v9 from '@midnightntwrk/ledger-v9';
import {
  ProtocolVersion,
  WalletTransaction,
} from '@midnightntwrk/wallet-sdk-abstractions';
import { UnshieldedAddress } from '@midnightntwrk/wallet-sdk-address-format';
import { describe, expect, it, vi } from 'vitest';

import { createFacadeHarness, unproven } from '../helpers/v2-facade';

const ttl = () => new Date(Date.now() + 60_000);

const spending = (hashes: string[]) => {
  const intent = v8.Intent.new(ttl());
  intent.guaranteedUnshieldedOffer = v8.UnshieldedOffer.new(
    hashes.map(intentHash => ({
      owner: v8.signatureVerifyingKey('01'.repeat(32)),
      intentHash,
      outputNo: 0,
      type: v8.nativeToken().raw,
      value: 5n,
    })),
    [],
    [],
  );
  return v8.Transaction.fromParts('undeployed', undefined, undefined, intent);
};

describe('canary facade transaction contract', () => {
  it('releases the unshielded booking when the following shielded balance fails', async () => {
    const h = await createFacadeHarness();
    const booked = unproven();
    const failure = new Error('shielded balance failed');
    h.unshielded.balanceFinalizedTransaction.mockResolvedValue(booked);
    h.shielded.balanceTransaction.mockRejectedValue(failure);
    const original = WalletTransaction.adopt(
      'Finalized',
      v8.Transaction.fromParts('undeployed').mockProve(),
      ProtocolVersion.MinSupportedVersion,
    );
    try {
      await expect(
        h.wallet.balanceFinalizedTransaction(original, { ttl: ttl() }),
      ).rejects.toBe(failure);
      expect(h.unshielded.revertTransaction).toHaveBeenCalledExactlyOnceWith(
        booked,
      );
      expect(h.lifecycle.reverted).not.toHaveBeenCalled();
      expect(h.shielded.revertTransaction).not.toHaveBeenCalled();
      expect(h.dust.balanceTransactions).not.toHaveBeenCalled();
    } finally {
      await h.wallet.stop();
    }
  });

  it.each(['transferTransaction', 'initSwap'] as const)(
    '%s releases its own real input reservation after fee failure',
    async method => {
      const h = await createFacadeHarness();
      const raw = spending(['11'.repeat(32)]);
      const booked = WalletTransaction.adopt(
        'Unproven',
        raw,
        ProtocolVersion.MinSupportedVersion,
      );
      h.unshielded[method].mockResolvedValue(booked);
      const error = new Error('Insufficient DUST');
      h.dust.balanceTransactions.mockRejectedValue(error);
      try {
        const result =
          method === 'initSwap'
            ? h.wallet.initSwap(
                { unshielded: { [v8.nativeToken().raw]: 5n } },
                [],
                { ttl: ttl(), payFees: true },
              )
            : h.wallet.transferTransaction(
                [
                  {
                    type: 'unshielded',
                    outputs: [
                      {
                        amount: 5n,
                        type: v8.nativeToken().raw,
                        receiverAddress: new UnshieldedAddress(
                          Buffer.alloc(32),
                        ),
                      },
                    ],
                  },
                ],
                { ttl: ttl(), payFees: true },
              );
        await expect(result).rejects.toBe(error);
        expect(h.lifecycle.balanced).not.toHaveBeenCalled();
        expect(h.unshielded.revertTransaction).toHaveBeenCalledExactlyOnceWith(
          booked,
        );
        expect(h.lifecycle.reverted).not.toHaveBeenCalled();
      } finally {
        await h.wallet.stop();
      }
    },
  );

  it('unbound balancing releases only newly selected inputs and preserves the caller’s inputs', async () => {
    const h = await createFacadeHarness();
    const cost = v8.CostModel.initialCostModel();
    const provider = {
      check: vi.fn(async () => []),
      prove: vi.fn(async () => new Uint8Array()),
    };
    const originalRaw = await spending(['11'.repeat(32)]).prove(provider, cost);
    const balancedRaw = await spending([
      '11'.repeat(32),
      '22'.repeat(32),
    ]).prove(provider, cost);
    const original = WalletTransaction.adopt(
      'Unbound',
      originalRaw,
      ProtocolVersion.MinSupportedVersion,
    );
    const balanced = WalletTransaction.adopt(
      'Unbound',
      balancedRaw,
      ProtocolVersion.MinSupportedVersion,
    );
    h.unshielded.balanceUnboundTransaction.mockResolvedValue(balanced);
    const error = new Error('Insufficient DUST');
    h.dust.balanceTransactions.mockRejectedValue(error);
    try {
      await expect(
        h.wallet.balanceUnboundTransaction(original, {
          ttl: ttl(),
          tokenKindsToBalance: ['unshielded', 'dust'],
        }),
      ).rejects.toBe(error);
      expect(h.lifecycle.balanced).not.toHaveBeenCalled();
      expect(h.unshielded.revertUtxos).toHaveBeenCalledExactlyOnceWith([
        '22'.repeat(32) + '#0',
      ]);
      expect(h.unshielded.revertTransaction).not.toHaveBeenCalled();
      expect(h.lifecycle.reverted).not.toHaveBeenCalled();
      expect(provider.prove).not.toHaveBeenCalled();
    } finally {
      await h.wallet.stop();
    }
  });

  it('retains the original failure and every cleanup failure while attempting all wallets', async () => {
    const h = await createFacadeHarness();
    const tx = unproven();
    const failure = new Error('proof failed');
    const cleanupFailure = new Error('shielded release failed');
    h.proving.prove.mockRejectedValue(failure);
    h.shielded.revertTransaction.mockRejectedValue(cleanupFailure);
    try {
      await expect(h.wallet.finalizeTransaction(tx)).rejects.toMatchObject({
        errors: [failure, cleanupFailure],
      });
      expect(h.unshielded.revertTransaction).toHaveBeenCalledExactlyOnceWith(
        tx,
      );
      expect(h.dust.revertTransaction).toHaveBeenCalledExactlyOnceWith(tx);
      expect(h.lifecycle.reverted).toHaveBeenCalledOnce();
      expect(h.lifecycle.submitted).not.toHaveBeenCalled();
    } finally {
      await h.wallet.stop();
    }
  });

  it('rejects a crossing during proof and releases all bookings without submitting', async () => {
    const h = await createFacadeHarness();
    const tx = unproven();
    let finish!: (value: unknown) => void;
    h.proving.prove.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    try {
      const result = h.wallet.finalizeTransaction(tx);
      const rejected = expect(result).rejects.toMatchObject({
        _tag: '@midnightntwrk/wallet-sdk-abstractions/WalletTransaction/ProtocolVersionMismatchError',
      });
      await vi.waitFor(() => {
        expect(h.proving.prove).toHaveBeenCalledOnce();
      });
      h.crossFork();
      finish({ bind: vi.fn() });
      await rejected;
      for (const port of [h.shielded, h.unshielded, h.dust])
        expect(port.revertTransaction).toHaveBeenCalledExactlyOnceWith(tx);
      expect(h.lifecycle.submitted).not.toHaveBeenCalled();
      expect(h.submission.submitTransaction).not.toHaveBeenCalled();
    } finally {
      await h.wallet.stop();
    }
  });

  it('adopts each epoch’s bytes and refuses stale bytes after the fork', async () => {
    const h = await createFacadeHarness();
    try {
      const bytes = v8.Transaction.fromParts('undeployed').serialize();
      const before = h.wallet.adoptTransaction(bytes, 'Unproven');
      expect(readMidnightTransaction(before)).toBeInstanceOf(v8.Transaction);
      h.crossFork();
      expect(() => h.wallet.adoptTransaction(bytes, 'Unproven')).toThrow();
      const after = h.wallet.adoptTransaction(
        v9.Transaction.fromParts('undeployed').serialize(),
        'Unproven',
      );
      expect(after.protocolVersion).toBe(ProtocolVersion.V9NativeForkVersion);
      expect(readMidnightTransaction(after)).toBeInstanceOf(v9.Transaction);
      await expect(h.wallet.finalizeTransaction(before)).rejects.toMatchObject({
        _tag: '@midnightntwrk/wallet-sdk-abstractions/WalletTransaction/ProtocolVersionMismatchError',
      });
      expect(h.proving.prove).not.toHaveBeenCalled();
    } finally {
      await h.wallet.stop();
    }
  });

  it('rejects copied handles and ledger objects tagged with the wrong epoch', () => {
    const tx = unproven();
    expect(() =>
      readMidnightTransaction({ ...tx } as WalletTransaction),
    ).toThrow();
    const wrongEpoch = WalletTransaction.adopt(
      'Unproven',
      v8.Transaction.fromParts('undeployed'),
      ProtocolVersion.V9NativeForkVersion,
    );
    expect(() => readMidnightTransaction(wrongEpoch)).toThrow('does not match');
  });
});
