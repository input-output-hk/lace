import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type {
  MidnightWallet,
  MidnightWalletsByAccountId,
} from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';

const testAccountId = 'test-account-id' as AccountId;

const mockMidnightWallet = {
  accountId: testAccountId,
  signData: vi
    .fn()
    .mockReturnValue(
      of({ signature: 'mock-signature', verifyingKey: 'mock-verifying-key' }),
    ),
} as unknown as MidnightWallet;

const wallets$ = of({ [testAccountId]: mockMidnightWallet });

const { MidnightInMemoryDataSigner } = await import(
  '../../src/signing/midnight-in-memory-data-signer'
);

describe('MidnightInMemoryDataSigner', () => {
  it('calls wallet.signData with the provided data and returns signature and verifyingKey', async () => {
    const signer = new MidnightInMemoryDataSigner(testAccountId, wallets$);
    const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

    const result = await firstValueFrom(signer.signData({ data }));

    expect(mockMidnightWallet.signData).toHaveBeenCalledWith(data);
    expect(result).toEqual({
      signature: 'mock-signature',
      verifyingKey: 'mock-verifying-key',
    });
  });

  it('throws when the wallet is not found for the given accountId', async () => {
    const unknownAccountId = 'unknown-account' as AccountId;
    const signer = new MidnightInMemoryDataSigner(unknownAccountId, wallets$);

    await expect(
      firstValueFrom(signer.signData({ data: new Uint8Array([0x01]) })),
    ).rejects.toThrow(
      `Could not load midnight wallet for account ${unknownAccountId}`,
    );
  });
});

describe('instance-bound data signing', () => {
  it('signs through its injected engine and refuses after removal without global fallback', async () => {
    const engine = (signature: string) => ({
      ...mockMidnightWallet,
      signData: vi.fn(() => of({ signature, verifyingKey: signature })),
    });
    const first = engine('aa');
    const second = engine('bb');
    const registryA = new BehaviorSubject<MidnightWalletsByAccountId>({
      [testAccountId]: first,
    });
    const registryB = new BehaviorSubject<MidnightWalletsByAccountId>({
      [testAccountId]: second,
    });
    const signerA = new MidnightInMemoryDataSigner(testAccountId, registryA);
    const signerB = new MidnightInMemoryDataSigner(testAccountId, registryB);
    const request = { data: new Uint8Array([1]) };
    expect((await firstValueFrom(signerA.signData(request))).signature).toBe(
      'aa',
    );
    expect((await firstValueFrom(signerB.signData(request))).signature).toBe(
      'bb',
    );
    registryA.next({});
    await expect(firstValueFrom(signerA.signData(request))).rejects.toThrow(
      'Could not load midnight wallet',
    );
    expect((await firstValueFrom(signerB.signData(request))).signature).toBe(
      'bb',
    );
    expect(first.signData).toHaveBeenCalledTimes(1);
  });
});
