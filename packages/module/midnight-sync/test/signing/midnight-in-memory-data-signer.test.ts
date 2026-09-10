import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { MidnightWallet } from '@lace-contract/midnight-context';
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

vi.mock('@lace-contract/midnight-context', async () => ({
  ...(await vi.importActual('@lace-contract/midnight-context')),
  midnightWallets$: of({ [testAccountId]: mockMidnightWallet }),
}));

const { MidnightInMemoryDataSigner } = await import(
  '../../src/signing/midnight-in-memory-data-signer'
);

describe('MidnightInMemoryDataSigner', () => {
  it('calls wallet.signData with the provided data and returns signature and verifyingKey', async () => {
    const signer = new MidnightInMemoryDataSigner(testAccountId);
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
    const signer = new MidnightInMemoryDataSigner(unknownAccountId);

    await expect(
      firstValueFrom(signer.signData({ data: new Uint8Array([0x01]) })),
    ).rejects.toThrow(
      `Could not load midnight wallet for account ${unknownAccountId}`,
    );
  });
});
