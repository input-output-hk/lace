import { getTestAuthSecretDeps } from '@lace-contract/authentication-prompt';
import { signerAuthFromPrompt } from '@lace-contract/signer';
import { HexBytes } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { AccountId } from '@lace-contract/wallet-repo';

const testAccountId = 'test-account-id' as AccountId;

const testSignerAuth = signerAuthFromPrompt(getTestAuthSecretDeps(), {
  cancellable: true,
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.transaction-confirmation',
});

vi.mock('@midnight-ntwrk/wallet-sdk-address-format', () => ({
  MidnightBech32m: { parse: vi.fn().mockReturnValue('parsed-address') },
  UnshieldedAddress: {
    codec: { decode: vi.fn().mockReturnValue('decoded-address') },
  },
  ShieldedAddress: {
    codec: { decode: vi.fn().mockReturnValue('decoded-address') },
  },
  DustAddress: {
    codec: { decode: vi.fn().mockReturnValue('decoded-dust-address') },
  },
}));

vi.mock('@lace-contract/midnight-context', async () => ({
  ...(await vi.importActual('@lace-contract/midnight-context')),
  midnightWallets$: of({}),
  fromUnshieldedTokenType: vi.fn().mockReturnValue('tDUST'),
}));

const { MidnightInMemoryTransactionSigner } = await import(
  '../../src/signing/midnight-in-memory-transaction-signer'
);

describe('MidnightInMemoryTransactionSigner with empty wallet map', () => {
  it('throws when midnight wallet is not found', async () => {
    const serializedTx = HexBytes.fromUTF8(
      '{"amount":"1","receiverAddress":"addr_test1","tokenKind":"unshielded","type":"tDUST"}',
    );

    const signer = new MidnightInMemoryTransactionSigner({
      accountId: testAccountId,
      auth: testSignerAuth,
    });
    await expect(firstValueFrom(signer.sign({ serializedTx }))).rejects.toThrow(
      'Could not load midnight wallet',
    );
  });
});
