import { x25519 } from '@noble/curves/ed25519.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openInboxEntry } from '../../src/acc/inbox';
import { createDevDeposit } from '../../src/infra/dev-deposit';

import type { SponsorWalletContext } from '../../src/infra/dev-sponsor';
import type { FeeSponsor, PassportProver } from '@lace-contract/passport';

const mocks = vi.hoisted(() => {
  const callTx = {
    deposit_shielded: vi.fn(async (..._args: unknown[]) => ({
      public: { txId: 'shielded-tx-id', status: 'SucceedEntirely' },
    })),
    deposit_unshielded: vi.fn(async (..._args: unknown[]) => ({
      public: { txId: 'unshielded-tx-id', status: 'SucceedEntirely' },
    })),
  };
  return {
    callTx,
    providers: { kind: 'providers' },
    createMidnightProviders: vi.fn(async (_props: { sponsor: FeeSponsor }) => ({
      kind: 'providers',
    })),
    connectAccountHandle: vi.fn(async () => ({ callTx })),
    readAccountLedger: vi.fn(
      async (_address: string, _network: unknown) =>
        ({} as { indexer: object; ledgerState: { enc_key: Uint8Array } }),
    ),
  };
});

vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));
vi.mock('../../src/acc/gated-call', () => ({
  connectAccountHandle: mocks.connectAccountHandle,
}));
vi.mock('../../src/flows/account-call', () => ({
  readAccountLedger: mocks.readAccountLedger,
}));

const ADDRESS = 'ab'.repeat(32);

const localnet = {
  networkId: 'undeployed',
  indexerUrl: 'http://localhost/indexer/api/v4/graphql',
  indexerWsUrl: 'ws://localhost/indexer/api/v4/graphql/ws',
  nodeUrl: 'http://localhost/rpc',
  artefactUrl: 'http://localhost/zk/account',
};

const prover = { prove: vi.fn(), check: vi.fn() } as unknown as PassportProver;

const wallet = {
  estimateTransactionFee: vi.fn(async () => 1n),
  balanceUnboundTransaction: vi.fn(async () => 'recipe'),
  signRecipe: vi.fn(async () => 'signed'),
  finalizeRecipe: vi.fn(async () => ({
    serialize: () => new Uint8Array([9]),
  })),
  stop: vi.fn(async () => undefined),
};

const createWalletContext = vi.fn(
  async (): Promise<SponsorWalletContext> => ({
    wallet,
    signSegment: vi.fn(),
    adoptUnbalanced: () => 'adopted',
  }),
);

const createDeposit = (network = localnet) =>
  createDevDeposit({
    seedHex: '00'.repeat(31) + '01',
    network,
    prover,
    proofServerUrl: 'http://localhost',
    createWalletContext,
  });

const sponsorHandedToProviders = (): FeeSponsor =>
  mocks.createMidnightProviders.mock.calls[0][0].sponsor;

describe('createDevDeposit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readAccountLedger.mockResolvedValue({
      indexer: {},
      ledgerState: {
        enc_key: x25519.getPublicKey(x25519.utils.randomSecretKey()),
      },
    });
  });

  it('refuses any network but the localnet', () => {
    let failure: unknown;
    try {
      createDeposit({ ...localnet, networkId: 'devnet' });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      name: 'DevDepositNetworkError',
      message: expect.stringContaining('"devnet"') as unknown,
    });
  });

  describe('depositShielded', () => {
    it("seals the coin it deposits to the account's ledger enc_key", async () => {
      const encSecret = x25519.utils.randomSecretKey();
      mocks.readAccountLedger.mockResolvedValueOnce({
        indexer: {},
        ledgerState: { enc_key: x25519.getPublicKey(encSecret) },
      });

      await createDeposit().depositShielded({
        address: ADDRESS,
        amount: 1000n,
      });

      expect(mocks.readAccountLedger).toHaveBeenCalledWith(ADDRESS, localnet);
      const [coin, entry] = mocks.callTx.deposit_shielded.mock.calls[0] as [
        { nonce: Uint8Array; color: Uint8Array; value: bigint },
        Uint8Array,
      ];
      await expect(openInboxEntry(encSecret, entry)).resolves.toEqual(coin);
    });

    it('deposits a fresh NIGHT coin of the amount unless another colour is named', async () => {
      const deposit = createDeposit();

      await deposit.depositShielded({ address: ADDRESS, amount: 5n });
      await deposit.depositShielded({
        address: ADDRESS,
        amount: 7n,
        color: '0'.repeat(63) + 'A',
      });

      const [[night], [other]] = mocks.callTx.deposit_shielded.mock
        .calls as unknown as [
        { nonce: Uint8Array; color: Uint8Array; value: bigint },
      ][];
      expect(night.color).toEqual(new Uint8Array(32));
      expect(night.value).toBe(5n);
      expect(night.nonce).toHaveLength(32);
      expect(other.color).toEqual(
        Uint8Array.from({ length: 32 }, (_, index) => (index === 31 ? 10 : 0)),
      );
      expect(other.value).toBe(7n);
      expect(other.nonce).not.toEqual(night.nonce);
    });

    it('submits through the account handle and returns the transaction id', async () => {
      const result = await createDeposit().depositShielded({
        address: ADDRESS,
        amount: 5n,
      });

      expect(mocks.connectAccountHandle).toHaveBeenCalledWith(
        mocks.providers,
        ADDRESS,
      );
      expect(mocks.createMidnightProviders).toHaveBeenCalledWith(
        expect.objectContaining({ network: localnet, prover }),
      );
      expect(result).toEqual({ txId: 'shielded-tx-id' });
    });

    it('balances the deposit in shielded tokens and dust from the dev wallet', async () => {
      await createDeposit().depositShielded({ address: ADDRESS, amount: 5n });

      await expect(
        sponsorHandedToProviders().balanceAndSign(new Uint8Array([1])),
      ).resolves.toEqual(new Uint8Array([9]));
      expect(wallet.balanceUnboundTransaction).toHaveBeenCalledWith(
        'adopted',
        expect.objectContaining({ tokenKindsToBalance: ['shielded', 'dust'] }),
      );
    });

    it('refuses an amount that is not positive or overflows 128 bits before reading the chain', async () => {
      const deposit = createDeposit();

      await expect(
        deposit.depositShielded({ address: ADDRESS, amount: 0n }),
      ).rejects.toThrow(RangeError);
      await expect(
        deposit.depositShielded({ address: ADDRESS, amount: 2n ** 128n }),
      ).rejects.toThrow(RangeError);
      expect(mocks.readAccountLedger).not.toHaveBeenCalled();
    });

    it('refuses a malformed colour', async () => {
      await expect(
        createDeposit().depositShielded({
          address: ADDRESS,
          amount: 1n,
          color: 'night',
        }),
      ).rejects.toThrow('A deposit colour must be 64 hex characters');
      expect(mocks.callTx.deposit_shielded).not.toHaveBeenCalled();
    });

    it('rejects a deposit that landed with a failing status', async () => {
      mocks.callTx.deposit_shielded.mockResolvedValueOnce({
        public: { txId: 'failed-tx-id', status: 'FailEntirely' },
      });

      await expect(
        createDeposit().depositShielded({ address: ADDRESS, amount: 1n }),
      ).rejects.toThrow(`Deposit to ${ADDRESS} failed`);
    });
  });

  describe('depositUnshielded', () => {
    it("refuses NIGHT as ledger 9's dismissal limit does, before building anything", async () => {
      await expect(
        createDeposit().depositUnshielded({ address: ADDRESS, amount: 5n }),
      ).rejects.toMatchObject({
        name: 'UnshieldedNightDepositError',
        message: expect.stringContaining(
          "Unshielded NIGHT deposits exceed ledger 9's dismissal limit",
        ) as unknown,
      });
      expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    });

    it('deposits a non-native colour, balanced in unshielded tokens and dust', async () => {
      const color = '0'.repeat(63) + '2';

      const result = await createDeposit().depositUnshielded({
        address: ADDRESS,
        amount: 9n,
        color,
      });

      expect(mocks.callTx.deposit_unshielded).toHaveBeenCalledWith(
        Uint8Array.from({ length: 32 }, (_, index) => (index === 31 ? 2 : 0)),
        9n,
      );
      expect(result).toEqual({ txId: 'unshielded-tx-id' });
      await sponsorHandedToProviders().balanceAndSign(new Uint8Array([1]));
      expect(wallet.balanceUnboundTransaction).toHaveBeenCalledWith(
        'adopted',
        expect.objectContaining({
          tokenKindsToBalance: ['unshielded', 'dust'],
        }),
      );
    });
  });

  it('stops the wallet the first deposit started', async () => {
    const deposit = createDeposit();
    await deposit.depositShielded({ address: ADDRESS, amount: 1n });
    await sponsorHandedToProviders().balanceAndSign(new Uint8Array([1]));

    await deposit.stop();

    expect(wallet.stop).toHaveBeenCalledOnce();
  });
});
