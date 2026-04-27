import { getTestAuthSecretDeps } from '@lace-contract/authentication-prompt';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import { HexBytes } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';

const testAccountId = 'test-account-id' as AccountId;

const testSignerAuth = signerAuthFromPrompt(getTestAuthSecretDeps(), {
  cancellable: true,
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.transaction-confirmation',
});

const mockTransaction = {
  serialize: () => new Uint8Array([0x01, 0x02]),
};

const mockMidnightWallet = {
  accountId: testAccountId,
  networkId: 'testnet',
  transferTransaction: vi.fn().mockReturnValue(of({ id: 'recipe' })),
  signRecipe: vi.fn().mockReturnValue(of({ id: 'signed-recipe' })),
  finalizeRecipe: vi.fn().mockReturnValue(of(mockTransaction)),
  state: vi.fn(),
  registerNightUtxosForDustGeneration: vi.fn(),
  balanceUnprovenTransaction: vi.fn(),
} as unknown as MidnightWallet;

vi.mock('@midnight-ntwrk/ledger-v8', () => ({
  nativeToken: () => ({ raw: 'NIGHT_RAW' }),
}));

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
  midnightWallets$: of({ [testAccountId]: mockMidnightWallet }),
  fromUnshieldedTokenType: vi.fn().mockReturnValue('tDUST'),
}));

const { MidnightInMemoryTransactionSigner } = await import(
  '../../src/signing/midnight-in-memory-transaction-signer'
);

const unshieldedTx = HexBytes.fromUTF8(
  '{"amount":"1","receiverAddress":"addr_test1","tokenKind":"unshielded","type":"tDUST"}',
);

const shieldedTx = HexBytes.fromUTF8(
  '{"amount":"1","receiverAddress":"addr_test1","tokenKind":"shielded","type":"NIGHT"}',
);

const resetWalletMocks = () => {
  const transfer = vi.mocked(
    mockMidnightWallet.transferTransaction as ReturnType<typeof vi.fn>,
  );
  const signRecipe = vi.mocked(
    mockMidnightWallet.signRecipe as ReturnType<typeof vi.fn>,
  );
  const finalizeRecipe = vi.mocked(
    mockMidnightWallet.finalizeRecipe as ReturnType<typeof vi.fn>,
  );

  transfer.mockClear();
  transfer.mockReturnValue(of({ id: 'recipe' }));
  signRecipe.mockClear();
  signRecipe.mockReturnValue(of({ id: 'signed-recipe' }));
  finalizeRecipe.mockClear();
  finalizeRecipe.mockReturnValue(of(mockTransaction));

  vi.mocked(mockMidnightWallet.state as ReturnType<typeof vi.fn>).mockReset();
  vi.mocked(
    mockMidnightWallet.registerNightUtxosForDustGeneration as ReturnType<
      typeof vi.fn
    >,
  ).mockReset();
  vi.mocked(
    mockMidnightWallet.balanceUnprovenTransaction as ReturnType<typeof vi.fn>,
  ).mockReset();
};

describe('MidnightInMemoryTransactionSigner', () => {
  beforeEach(() => {
    resetWalletMocks();
  });

  it('signs unshielded transaction through wallet SDK pipeline', async () => {
    const signer = new MidnightInMemoryTransactionSigner({
      accountId: testAccountId,
      auth: testSignerAuth,
    });
    const result = await firstValueFrom(
      signer.sign({ serializedTx: unshieldedTx, flowType: 'send' }),
    );

    expect(result.serializedTx).toBeDefined();
    expect(mockMidnightWallet.transferTransaction).toHaveBeenCalled();
    expect(mockMidnightWallet.signRecipe).toHaveBeenCalled();
    expect(mockMidnightWallet.finalizeRecipe).toHaveBeenCalled();
  });

  it('signs shielded transaction without explicit signRecipe', async () => {
    const signer = new MidnightInMemoryTransactionSigner({
      accountId: testAccountId,
      auth: testSignerAuth,
    });
    const result = await firstValueFrom(
      signer.sign({ serializedTx: shieldedTx, flowType: 'send' }),
    );

    expect(result.serializedTx).toBeDefined();
    expect(mockMidnightWallet.transferTransaction).toHaveBeenCalled();
    expect(mockMidnightWallet.finalizeRecipe).toHaveBeenCalled();
    expect(mockMidnightWallet.signRecipe).not.toHaveBeenCalled();
  });

  it('handles dust-designation flow', async () => {
    const dustTx = HexBytes.fromUTF8(
      '{"amount":"0","receiverAddress":"dust_addr","tokenKind":"unshielded","type":"tDUST"}',
    );

    const mockState = {
      unshielded: {
        availableCoins: [
          {
            utxo: { type: 'NIGHT_RAW' },
            meta: { registeredForDustGeneration: false },
          },
        ],
      },
    };

    vi.mocked(
      mockMidnightWallet.state as ReturnType<typeof vi.fn>,
    ).mockReturnValue(of(mockState));
    vi.mocked(
      mockMidnightWallet.registerNightUtxosForDustGeneration as ReturnType<
        typeof vi.fn
      >,
    ).mockReturnValue(of({ id: 'dust-recipe' }));

    const signer = new MidnightInMemoryTransactionSigner({
      accountId: testAccountId,
      auth: testSignerAuth,
    });
    const result = await firstValueFrom(
      signer.sign({ serializedTx: dustTx, flowType: 'dust-designation' }),
    );

    expect(result.serializedTx).toBeDefined();
    expect(mockMidnightWallet.state).toHaveBeenCalled();
    expect(
      mockMidnightWallet.registerNightUtxosForDustGeneration,
    ).toHaveBeenCalled();
    expect(mockMidnightWallet.finalizeRecipe).toHaveBeenCalled();
    expect(mockMidnightWallet.transferTransaction).not.toHaveBeenCalled();
    expect(
      mockMidnightWallet.balanceUnprovenTransaction,
    ).not.toHaveBeenCalled();
  });

  it('dust-designation balances unproven tx when NIGHT is already registered for dust', async () => {
    const dustTx = HexBytes.fromUTF8(
      '{"amount":"0","receiverAddress":"dust_addr","tokenKind":"unshielded","type":"tDUST"}',
    );

    const mockState = {
      unshielded: {
        availableCoins: [
          {
            utxo: { type: 'NIGHT_RAW' },
            meta: { registeredForDustGeneration: true },
          },
        ],
      },
    };

    const unprovenTx = { id: 'unproven-tx' };
    const balancedRecipe = { id: 'balanced-recipe' };

    vi.mocked(
      mockMidnightWallet.state as ReturnType<typeof vi.fn>,
    ).mockReturnValue(of(mockState));
    vi.mocked(
      mockMidnightWallet.registerNightUtxosForDustGeneration as ReturnType<
        typeof vi.fn
      >,
    ).mockReturnValue(of({ transaction: unprovenTx }));
    vi.mocked(
      mockMidnightWallet.balanceUnprovenTransaction as ReturnType<typeof vi.fn>,
    ).mockReturnValue(of(balancedRecipe));

    const signer = new MidnightInMemoryTransactionSigner({
      accountId: testAccountId,
      auth: testSignerAuth,
    });
    const result = await firstValueFrom(
      signer.sign({ serializedTx: dustTx, flowType: 'dust-designation' }),
    );

    expect(result.serializedTx).toBeDefined();
    expect(mockMidnightWallet.balanceUnprovenTransaction).toHaveBeenCalledWith(
      unprovenTx,
      expect.objectContaining({ tokenKindsToBalance: ['dust'] }),
    );
    expect(mockMidnightWallet.finalizeRecipe).toHaveBeenCalledWith(
      balancedRecipe,
    );
    expect(mockMidnightWallet.transferTransaction).not.toHaveBeenCalled();
  });

  it('throws AuthenticationCancelledError when user cancels', async () => {
    const cancellingAuth = signerAuthFromPrompt(
      {
        authenticate: () => of(false), // User cancels
        accessAuthSecret: getTestAuthSecretDeps().accessAuthSecret,
      },
      {
        cancellable: true,
        confirmButtonLabel: 'authentication-prompt.confirm-button-label',
        message: 'authentication-prompt.message.transaction-confirmation',
      },
    );

    const signer = new MidnightInMemoryTransactionSigner({
      accountId: testAccountId,
      auth: cancellingAuth,
    });

    await expect(
      firstValueFrom(
        signer.sign({ serializedTx: unshieldedTx, flowType: 'send' }),
      ),
    ).rejects.toThrow(AuthenticationCancelledError);
  });
});
