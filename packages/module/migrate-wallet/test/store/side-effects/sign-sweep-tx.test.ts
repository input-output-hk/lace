import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signSweepTx } from '../../../src/store/side-effects/sign-sweep-tx';

import type { Serialization } from '@cardano-sdk/core';

const SCRIPTS = ['script'] as never;
const mockWitnessSet = { tag: 'witnessSet' };
const mockBody = { tag: 'body' };
const mockAux = { tag: 'aux' };
const mockTx = {
  body: () => mockBody,
  witnessSet: () => mockWitnessSet,
  auxiliaryData: () => mockAux,
  toCore: () => ({ witness: { scripts: SCRIPTS } }),
  toCbor: () => 'tx-cbor',
} as unknown as Serialization.Transaction;

const transactionCtor = vi.hoisted(() =>
  vi.fn((body: unknown, witnessSet: unknown) => ({
    toCbor: () => 'signed',
    body,
    witnessSet,
  })),
);

const fromCbor = vi.hoisted(() => vi.fn());

vi.mock('@cardano-sdk/core', () => {
  const Transaction = Object.assign(transactionCtor, { fromCbor });
  return {
    Serialization: { Transaction, TxCBOR: (value: string) => value },
  };
});

const createKeyAgent = vi.hoisted(() => vi.fn());
const applyVkeyWitnesses = vi.hoisted(() =>
  vi.fn<(witnessSet: unknown, signatures: Map<string, string>) => void>(),
);
vi.mock('@lace-contract/cardano-context', () => ({
  createCardanoKeyAgentFromEncryptedRoot: createKeyAgent,
  applyVkeyWitnesses,
}));

const FAKE_SECRET = { secret: true } as never;
const wallet = {
  blockchainSpecific: { Cardano: { encryptedRootPrivateKey: 'root-hex' } },
} as never;
const chainId = { networkMagic: 1, networkId: 0 } as never;

const signingAccount = (index: number) => ({
  accountId: `acct-${index}` as never,
  accountIndex: index,
  extendedAccountPublicKey: `xpub-${index}` as never,
});
const address = (accountIndex: number) => ({ accountIndex } as never);

const deps = (confirmed: boolean) => ({
  authenticate: vi.fn(() => of(confirmed)),
  accessAuthSecret: vi.fn((use: (s: unknown) => unknown) => use(FAKE_SECRET)),
});

/** A tx with one input, resolvable to an owner through `utxos`. */
const txWithOneInput = () => ({
  ...mockTx,
  body: () => ({
    ...mockBody,
    toCore: () => ({ inputs: [{ txId: 'tx1', index: 0 }] }),
  }),
});
const utxoOwnedBy = (accountIndex: number) =>
  [{ txId: 'tx1', index: 0 }, { address: `addr-${accountIndex}` }] as never;
const addressOwnedBy = (accountIndex: number) =>
  ({
    accountIndex,
    address: `addr-${accountIndex}`,
    rewardAccount: `stake-${accountIndex}`,
  } as never);
/** Spends account 0's input while withdrawing account 1's rewards. */
const txSpendingOneAndWithdrawingAnother = () => ({
  ...mockTx,
  body: () => ({
    ...mockBody,
    toCore: () => ({
      inputs: [{ txId: 'tx1', index: 0 }],
      withdrawals: [{ stakeAddress: 'stake-1', quantity: 5n }],
    }),
  }),
});

describe('signSweepTx', () => {
  beforeEach(() => {
    transactionCtor.mockClear();
    createKeyAgent.mockClear();
    applyVkeyWitnesses.mockClear();
    fromCbor.mockReset();
  });

  it('rebuilds the tx with the signing account vkeys after one confirm', async () => {
    createKeyAgent.mockResolvedValue({
      signTransaction: vi.fn(async () => new Map([['pk0', 'sig0']])),
    });
    const dependencies = deps(true);

    const signed = await firstValueFrom(
      signSweepTx(
        {
          wallet,
          chainId,
          signingAccounts: [signingAccount(0)],
          addresses: [address(0)],
          utxos: [],
          dependencies: dependencies as never,
        },
        mockTx,
      ),
    );

    expect(applyVkeyWitnesses).toHaveBeenCalledTimes(1);
    expect(applyVkeyWitnesses.mock.calls[0][0]).toBe(mockWitnessSet);
    expect([...applyVkeyWitnesses.mock.calls[0][1]]).toEqual([['pk0', 'sig0']]);
    expect(signed.toCbor).toBeTypeOf('function');
  });

  // The bug this pins: preserve mode sends one transaction per source account,
  // but the loop ran over every account in the sweep. An account asked to sign a
  // transaction it owns no input of resolves an empty txInKeyPathMap, so every
  // input reads as third-party, ledgerjs picks MULTISIG, and the device returns
  // witnesses the transaction never required — rejected on submit as
  // InvalidWitnessesUTXOW, with the fee short by exactly those bytes.
  it('signs only with the accounts that own the transaction inputs', async () => {
    const signTx = vi.fn(async () => new Map([['pk0', 'sig0']]));
    createKeyAgent.mockResolvedValue({ signTransaction: signTx });

    await firstValueFrom(
      signSweepTx(
        {
          wallet,
          chainId,
          signingAccounts: [signingAccount(0), signingAccount(1)],
          addresses: [addressOwnedBy(0), addressOwnedBy(1)],
          utxos: [utxoOwnedBy(0)],
          dependencies: deps(true) as never,
        },
        txWithOneInput() as never,
      ),
    );

    expect(createKeyAgent).toHaveBeenCalledTimes(1);
    expect(createKeyAgent.mock.calls[0][0]).toMatchObject({ accountIndex: 0 });
  });

  // A withdrawal needs the stake key's signature, so the account it belongs to
  // must sign even when it supplied no input. Filtering on inputs alone left
  // that signature missing: `assertTransactionFullySigned` threw before submit,
  // and the retry rebuilt the identical plan and failed identically — for good.
  // In a chunked consolidation the earlier chunks are already on-chain by then,
  // so the plan strands part-way through.
  it('signs with the owner of a withdrawal even when it owns no input', async () => {
    const signTx = vi.fn(async () => new Map([['pk', 'sig']]));
    createKeyAgent.mockResolvedValue({ signTransaction: signTx });

    await firstValueFrom(
      signSweepTx(
        {
          wallet,
          chainId,
          signingAccounts: [signingAccount(0), signingAccount(1)],
          addresses: [addressOwnedBy(0), addressOwnedBy(1)],
          utxos: [utxoOwnedBy(0)],
          dependencies: deps(true) as never,
        },
        txSpendingOneAndWithdrawingAnother() as never,
      ),
    );

    expect(
      createKeyAgent.mock.calls
        .map(call => (call[0] as { accountIndex: number }).accountIndex)
        .sort(),
    ).toEqual([0, 1]);
  });

  it('merges a signature map per account, each keyed by its own accountIndex', async () => {
    const signTx0 = vi.fn(
      async (_body: unknown, _context: { knownAddresses: unknown[] }) =>
        new Map([['pk0', 'sig0']]),
    );
    const signTx1 = vi.fn(
      async (_body: unknown, _context: { knownAddresses: unknown[] }) =>
        new Map([['pk1', 'sig1']]),
    );
    createKeyAgent
      .mockResolvedValueOnce({ signTransaction: signTx0 })
      .mockResolvedValueOnce({ signTransaction: signTx1 });

    await firstValueFrom(
      signSweepTx(
        {
          wallet,
          chainId,
          signingAccounts: [signingAccount(0), signingAccount(1)],
          addresses: [address(0), address(1)],
          utxos: [],
          dependencies: deps(true) as never,
        },
        mockTx,
      ),
    );

    // Each agent signs with only its own account's known addresses.
    expect(signTx0.mock.calls[0][1].knownAddresses).toEqual([address(0)]);
    expect(signTx1.mock.calls[0][1].knownAddresses).toEqual([address(1)]);
    // vkeys set once with the union of both accounts' signatures.
    expect(applyVkeyWitnesses).toHaveBeenCalledTimes(1);
    expect([...applyVkeyWitnesses.mock.calls[0][1]]).toEqual([
      ['pk0', 'sig0'],
      ['pk1', 'sig1'],
    ]);
  });

  it('throws and signs nothing when the auth prompt is cancelled', async () => {
    const dependencies = deps(false);

    await expect(
      firstValueFrom(
        signSweepTx(
          {
            wallet,
            chainId,
            signingAccounts: [signingAccount(0)],
            addresses: [address(0)],
            utxos: [],
            dependencies: dependencies as never,
          },
          mockTx,
        ),
      ),
    ).rejects.toThrow();

    expect(dependencies.accessAuthSecret).not.toHaveBeenCalled();
    expect(createKeyAgent).not.toHaveBeenCalled();
    expect(applyVkeyWitnesses).not.toHaveBeenCalled();
  });

  // The device ceremony is its own authorisation, so this path must never
  // raise the app-lock prompt or open an AuthSecret window. Every account
  // signs the ORIGINAL tx and the vkey maps merge once — chaining the device
  // signer would lose earlier witnesses (its sign() replaces the vkey set).
  it('signs the original tx once per account on-device and merges the vkey maps', async () => {
    const vkeysByCbor = new Map([
      ['device-signed-0', new Map([['pk0', 'sig0']])],
      ['device-signed-1', new Map([['pk1', 'sig1']])],
    ]);
    fromCbor.mockImplementation((cbor: string) => ({
      toCore: () => ({
        witness: { signatures: vkeysByCbor.get(cbor) ?? new Map() },
      }),
    }));
    const sign = vi
      .fn()
      .mockReturnValueOnce(of({ serializedTx: 'device-signed-0' }))
      .mockReturnValueOnce(of({ serializedTx: 'device-signed-1' }));
    const createTransactionSigner = vi.fn(() => ({ sign }));
    const dependencies = {
      ...deps(true),
      signerFactory: { createTransactionSigner },
    };

    await firstValueFrom(
      signSweepTx(
        {
          wallet: { blockchainSpecific: { Cardano: {} } } as never,
          chainId,
          signingAccounts: [signingAccount(0), signingAccount(1)],
          addresses: [address(0), address(1)],
          utxos: [],
          dependencies: dependencies as never,
        },
        mockTx,
      ),
    );

    // Both accounts sign the ORIGINAL body, never each other's output.
    expect(sign).toHaveBeenCalledTimes(2);
    expect(sign).toHaveBeenNthCalledWith(1, { serializedTx: 'tx-cbor' });
    expect(sign).toHaveBeenNthCalledWith(2, { serializedTx: 'tx-cbor' });
    // Each signer gets its own account's addresses only.
    expect(
      (createTransactionSigner.mock.calls as unknown[][])[0]?.[0],
    ).toMatchObject({
      accountId: 'acct-0',
      knownAddresses: [address(0)],
    });
    expect(
      (createTransactionSigner.mock.calls as unknown[][])[1]?.[0],
    ).toMatchObject({
      accountId: 'acct-1',
      knownAddresses: [address(1)],
    });
    // One rebuild carrying BOTH accounts' witnesses.
    expect(applyVkeyWitnesses).toHaveBeenCalledTimes(1);
    const merged = applyVkeyWitnesses.mock.calls[0]?.[1];
    expect([...merged.entries()]).toEqual([
      ['pk0', 'sig0'],
      ['pk1', 'sig1'],
    ]);
    expect(dependencies.authenticate).not.toHaveBeenCalled();
    expect(dependencies.accessAuthSecret).not.toHaveBeenCalled();
  });

  it('errors a device sweep with no signing accounts instead of submitting unwitnessed', async () => {
    const createTransactionSigner = vi.fn();
    await expect(
      firstValueFrom(
        signSweepTx(
          {
            wallet: { blockchainSpecific: { Cardano: {} } } as never,
            chainId,
            signingAccounts: [],
            addresses: [],
            utxos: [],
            dependencies: {
              ...deps(true),
              signerFactory: { createTransactionSigner },
            } as never,
          },
          mockTx,
        ),
      ),
    ).rejects.toThrow('at least one account');
    expect(createTransactionSigner).not.toHaveBeenCalled();
  });
});
