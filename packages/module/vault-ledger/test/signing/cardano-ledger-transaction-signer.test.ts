import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { HardwareWalletId } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoLedgerTransactionSigner } from '../../src/signing/cardano-ledger-transaction-signer';

import type { CardanoLedgerSignerFactoryDependencies } from '../../src/signing/cardano-ledger-signer-factory';
import type * as CardanoSdkCore from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { HardwareWalletLedger } from '@lace-contract/wallet-repo';

const hoisted = vi.hoisted(() => {
  const mockTxBody = {
    toCore: vi.fn().mockReturnValue({ inputs: [], outputs: [], fee: 0n }),
  };
  const mockWitnessSet = { setVkeys: vi.fn() };
  const mockTransaction = {
    body: vi.fn().mockReturnValue(mockTxBody),
    auxiliaryData: vi.fn().mockReturnValue({}),
    witnessSet: vi.fn().mockReturnValue(mockWitnessSet),
    toCore: vi.fn().mockReturnValue({ witness: { scripts: [] } }),
  };
  const mockSignedTx = { toCbor: vi.fn().mockReturnValue('signed-tx-cbor') };
  return {
    mockTxBody,
    mockTransaction,
    signTransaction: vi.fn().mockResolvedValue(new Map()),
    TransactionCtor: Object.assign(vi.fn().mockReturnValue(mockSignedTx), {
      fromCbor: vi.fn().mockReturnValue(mockTransaction),
    }),
  };
});

vi.mock('@cardano-sdk/core', async importOriginal => {
  const actual = await importOriginal<typeof CardanoSdkCore>();
  return {
    ...actual,
    Serialization: {
      Transaction: hoisted.TransactionCtor,
      TxCBOR: vi.fn((cbor: string) => cbor),
      CborSet: { fromCore: vi.fn() },
      VkeyWitness: { fromCore: vi.fn() },
    },
  };
});

const walletId = HardwareWalletId({
  kind: 'usb',
  vendorId: 0x2c_97,
  productId: 0x00_11,
  serialNumber: null,
});

const wallet = { walletId } as unknown as HardwareWalletLedger;

const createKeyAgent = vi
  .fn()
  .mockResolvedValue({ signTransaction: hoisted.signTransaction });

const dependencies = {
  transport: { createKeyAgent, getXpub: vi.fn() },
} as unknown as CardanoLedgerSignerFactoryDependencies;

const baseProps = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
  knownAddresses: [] as GroupedAddress[],
  utxo: [] as Cardano.Utxo[],
  wallet,
};

const OWN_ADDRESS =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7' as Cardano.PaymentAddress;
const OWN_REWARD_ACCOUNT =
  'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7' as Cardano.RewardAccount;

const ownGroupedAddress: GroupedAddress = {
  type: AddressType.External,
  index: 0,
  networkId: 0 as Cardano.NetworkId,
  accountIndex: 0,
  address: OWN_ADDRESS,
  rewardAccount: OWN_REWARD_ACCOUNT,
  stakeKeyDerivationPath: { role: 2, index: 0 },
};

const ownPaymentKeyHash = Cardano.Address.fromBech32(OWN_ADDRESS)
  .asBase()!
  .getPaymentCredential().hash;

describe('CardanoLedgerTransactionSigner', () => {
  beforeEach(() => {
    hoisted.signTransaction.mockClear().mockResolvedValue(new Map());
    createKeyAgent
      .mockClear()
      .mockResolvedValue({ signTransaction: hoisted.signTransaction });
    hoisted.mockTransaction.toCore.mockReturnValue({
      witness: { scripts: [] },
    });
  });

  it('resolves the device, signs, and returns assembled CBOR with signature count', async () => {
    hoisted.signTransaction.mockResolvedValue(new Map([['pubkey1', 'sig1']]));

    const signer = new CardanoLedgerTransactionSigner(baseProps, dependencies);
    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(createKeyAgent).toHaveBeenCalledTimes(1);
    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(1);
  });

  it('does not pass native scripts to the key agent (Ledger SDK does not accept them)', async () => {
    const scripts = [
      { kind: 0, keyHash: 'own-key-hash' },
    ] as unknown as Cardano.Script[];
    hoisted.mockTransaction.toCore.mockReturnValue({ witness: { scripts } });

    const signer = new CardanoLedgerTransactionSigner(baseProps, dependencies);
    await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(hoisted.signTransaction).toHaveBeenCalledWith(expect.anything(), {
      knownAddresses: baseProps.knownAddresses,
      txInKeyPathMap: {},
    });
    const [, context] = hoisted.signTransaction.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(context).not.toHaveProperty('scripts');
  });

  it('rejects before any device interaction when a native script requires an own key the device cannot witness', async () => {
    hoisted.mockTransaction.toCore.mockReturnValue({
      witness: {
        scripts: [
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireSignature,
            keyHash: ownPaymentKeyHash,
          },
        ],
      },
    });

    const signer = new CardanoLedgerTransactionSigner(
      { ...baseProps, knownAddresses: [ownGroupedAddress] },
      dependencies,
    );

    await expect(
      firstValueFrom(signer.sign({ serializedTx: HexBytes('tx-cbor-hex') })),
    ).rejects.toThrow(
      "Ledger cannot witness keys required only by the transaction's native scripts: role 0 index 0",
    );
    expect(createKeyAgent).not.toHaveBeenCalled();
    expect(hoisted.signTransaction).not.toHaveBeenCalled();
  });
});
