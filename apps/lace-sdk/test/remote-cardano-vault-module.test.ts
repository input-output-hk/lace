import { Cardano, Serialization } from '@cardano-sdk/core';
import { createInputResolver } from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import { expectCollateralGuardRefusesCaseB } from '@lace-lib/util-dev-cardano';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { RemoteSignerResultError } from '../src/cardano-remote-signer-factory';
import { createRemoteCardanoVaultModule } from '../src/remote-cardano-vault-module';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoSignerFactory,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { Mock } from 'vitest';

const accountId = 'wallet-1-0-1' as AccountId;
const extendedAccountPublicKey = 'ab'.repeat(64);
const address = Cardano.PaymentAddress(
  'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh',
);

const lazyAccount = {
  accountId,
  accountType: 'LazyInMemory',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 3,
    chainId: { ...Cardano.ChainIds.Preprod, name: 'preprod' },
    extendedAccountPublicKey,
  },
} as unknown as AnyAccount;

const wallet = {
  walletId: 'wallet-1' as WalletId,
  accounts: [lazyAccount],
} as unknown as AnyWallet;

const knownAddresses = [{ address }] as GroupedAddress[];
const utxo: Cardano.Utxo[] = [
  [
    { txId: Cardano.TransactionId('cd'.repeat(32)), index: 0, address },
    { address, value: { coins: 5_000_000n } },
  ],
];

const buildContext = (
  overrides: Partial<CardanoTransactionSignerContext> = {},
): CardanoTransactionSignerContext => ({
  wallet,
  accountId,
  knownAddresses,
  utxo,
  collateralInputResolver: createInputResolver(utxo),
  auth: { authenticate: () => undefined } as never,
  ...overrides,
});

const loadFactory = async (request: Mock): Promise<CardanoSignerFactory> =>
  (
    await createRemoteCardanoVaultModule({
      client: { request },
    }).addons.loadSignerFactory()
  ).default({} as never, {} as never) as CardanoSignerFactory;

const serializedTx = HexBytes(
  Serialization.Transaction.fromCore({
    id: Cardano.TransactionId('ef'.repeat(32)),
    body: {
      inputs: [{ txId: Cardano.TransactionId('cd'.repeat(32)), index: 0 }],
      outputs: [{ address, value: { coins: 1_000_000n } }],
      fee: 170_000n,
    },
    witness: { signatures: new Map() },
  }).toCbor(),
);

describe('createRemoteCardanoVaultModule', () => {
  it('signs only Cardano LazyInMemory accounts', async () => {
    const factory = await loadFactory(vi.fn());

    expect(factory.canSign(lazyAccount)).toBe(true);
    expect(
      factory.canSign({
        ...lazyAccount,
        accountType: 'InMemory',
      } as unknown as AnyAccount),
    ).toBe(false);
    expect(() =>
      factory.createTransactionSigner(
        buildContext({ accountId: 'other' as AccountId }),
      ),
    ).toThrow('does not support account type: unknown');
  });

  it('forwards a transaction with the public account data, stripping the chain ID to its network fields', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ serializedTx: 'signed', signatureCount: 1 });
    const factory = await loadFactory(request);

    const result = await firstValueFrom(
      factory.createTransactionSigner(buildContext()).sign({ serializedTx }),
    );

    expect(result).toEqual({ serializedTx: 'signed', signatureCount: 1 });
    expect(request).toHaveBeenCalledWith('sign-cardano-tx', {
      serializedTx,
      knownAddresses,
      utxo,
      accountIndex: 3,
      chainId: { networkId: 0, networkMagic: 1 },
      extendedAccountPublicKey,
    });
  });

  it('sends nothing until the signer observable is subscribed', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ serializedTx: 'signed', signatureCount: 1 });
    const factory = await loadFactory(request);

    const signing = factory
      .createTransactionSigner(buildContext())
      .sign({ serializedTx });
    expect(request).not.toHaveBeenCalled();

    await firstValueFrom(signing);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('surfaces a signer failure as the signing error', async () => {
    const failure = Object.assign(
      new Error('Signing is limited to test networks.'),
      { code: 'malformed-request' },
    );
    const factory = await loadFactory(vi.fn().mockRejectedValue(failure));

    await expect(
      firstValueFrom(
        factory.createTransactionSigner(buildContext()).sign({ serializedTx }),
      ),
    ).rejects.toBe(failure);
  });

  it('refuses a malformed signing result', async () => {
    const factory = await loadFactory(
      vi.fn().mockResolvedValue({ serializedTx: 'signed' }),
    );

    await expect(
      firstValueFrom(
        factory.createTransactionSigner(buildContext()).sign({ serializedTx }),
      ),
    ).rejects.toBeInstanceOf(RemoteSignerResultError);
  });

  it('is wrapped by the collateral-ownership guard: a case-(b) transaction never reaches the signer', async () => {
    const request = vi.fn();
    const factory = await loadFactory(request);

    await expectCollateralGuardRefusesCaseB({
      createSigner: ownership =>
        factory.createTransactionSigner(buildContext(ownership)),
      assertNotDelegated: () => {
        expect(request).not.toHaveBeenCalled();
      },
    });
  });

  it('forwards a data signing request and returns the signature', async () => {
    const request = vi.fn().mockResolvedValue({ signature: 'sig', key: 'key' });
    const factory = await loadFactory(request);

    const result = await firstValueFrom(
      factory
        .createDataSigner(buildContext())
        .signData({ signWith: address, payload: 'deadbeef' }),
    );

    expect(result).toEqual({ signature: 'sig', key: 'key' });
    expect(request).toHaveBeenCalledWith('sign-cardano-data', {
      signWith: address,
      payload: 'deadbeef',
      knownAddresses,
      accountIndex: 3,
      chainId: { networkId: 0, networkMagic: 1 },
      extendedAccountPublicKey,
    });
  });

  it('refuses a malformed data signing result', async () => {
    const factory = await loadFactory(
      vi.fn().mockResolvedValue({ signature: 'sig' }),
    );

    await expect(
      firstValueFrom(
        factory
          .createDataSigner(buildContext())
          .signData({ signWith: address, payload: 'deadbeef' }),
      ),
    ).rejects.toBeInstanceOf(RemoteSignerResultError);
  });
});
