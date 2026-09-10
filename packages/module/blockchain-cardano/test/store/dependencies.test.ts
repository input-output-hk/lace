import { Cardano, Serialization } from '@cardano-sdk/core';
import { Ed25519PublicKey, Ed25519Signature } from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
} from '@lace-contract/cardano-context';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { firstValueFrom, from, of, switchMap } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { initializeDependencies } from '../../src/store/dependencies';

import type { Ed25519KeyHashHex, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  SignInMemoryTransactionProps,
  WithCardanoKeyAgent$,
} from '@lace-contract/cardano-context';
import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';

// Same real preview-testnet fixture as
// cardano-context/test/signing/cardano-in-memory-signing.regression.test.ts:
// the root key is encrypted under the UTF-8 bytes of PASSWORD.
const PASSWORD = 'ComplexPassword2024!';
const FIXTURE = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey:
    'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf' as Bip32PublicKeyHex,
  encryptedRootPrivateKey: HexBytes(
    '1a671129801c208c3c5ffa99ae85cf36d5a323144a427f17bb3a1b50cc36099752ca8b045138bce43f0636f2bb45380e0912c85a0834c26f632011c39c7a71c3e8543490a8656c2ebdb40d375dca2eb9e4a652a637631890d4776d5ad7319abd1d0bd3c1836a8d914050f28c690441bdf00d2b15416e0692f057e9f2205401948235f7efa7598e7fc737fa52066299c7cfc96ebf80d78c777bafa586',
  ),
};
const FIXTURE_ADDRESS =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7' as Cardano.PaymentAddress;
const FIXTURE_REWARD_ACCOUNT =
  'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7' as Cardano.RewardAccount;

const knownAddresses: GroupedAddress[] = [
  {
    type: AddressType.External,
    index: 0,
    networkId: 0 as Cardano.NetworkId,
    accountIndex: 0,
    address: FIXTURE_ADDRESS,
    rewardAccount: FIXTURE_REWARD_ACCOUNT,
    stakeKeyDerivationPath: { role: 2, index: 0 },
  },
];

const moduleInitProps = {} as ModuleInitProps;
const moduleInitDependencies = {
  logger: dummyLogger,
} as unknown as ModuleInitDependencies;

const sign = async (
  props: Pick<SignInMemoryTransactionProps, 'tx' | 'utxo'> & {
    authSecret?: Uint8Array;
  },
) => {
  const dependencies = await initializeDependencies(
    moduleInitProps,
    moduleInitDependencies,
  );
  return firstValueFrom(
    dependencies.cardanoInMemorySigning.signTransaction({
      authSecret: props.authSecret ?? ByteArray.fromUTF8(PASSWORD),
      accountIndex: FIXTURE.accountIndex,
      chainId: FIXTURE.chainId,
      extendedAccountPublicKey: FIXTURE.extendedAccountPublicKey,
      encryptedRootPrivateKey: FIXTURE.encryptedRootPrivateKey,
      knownAddresses,
      ...props,
    }),
  );
};

describe('blockchain-cardano dependencies — cardanoInMemorySigning.signTransaction', () => {
  it('signs a transaction that spends a known address (no scripts involved)', async () => {
    const inputTxId = Cardano.TransactionId(`${'0'.repeat(63)}5`);
    const utxo: Cardano.Utxo = [
      { txId: inputTxId, index: 0, address: FIXTURE_ADDRESS },
      { address: FIXTURE_ADDRESS, value: { coins: 5_000_000n } },
    ];
    const coreTx: Cardano.Tx = {
      id: Cardano.TransactionId(`${'0'.repeat(63)}6`),
      body: {
        inputs: [{ txId: inputTxId, index: 0 }],
        outputs: [{ address: FIXTURE_ADDRESS, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    };

    const result = await sign({
      tx: Serialization.Transaction.fromCore(coreTx),
      utxo: [utxo],
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value.toCore().witness.signatures.size).toBe(
      1,
    );
  });

  it('produces a witness for a key required only via a native script', async () => {
    const ownPaymentKeyHash = Cardano.Address.fromBech32(FIXTURE_ADDRESS)
      .asBase()!
      .getPaymentCredential().hash as unknown as Ed25519KeyHashHex;

    const coreTx: Cardano.Tx = {
      id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
      body: {
        inputs: [
          { txId: Cardano.TransactionId(`${'0'.repeat(63)}2`), index: 0 },
        ],
        outputs: [{ address: FIXTURE_ADDRESS, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: {
        signatures: new Map(),
        scripts: [
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireSignature,
            keyHash: ownPaymentKeyHash,
          },
        ],
      },
    };

    // Empty utxo: the input above never resolves to a known address, so the
    // only route to a witness is via the native script.
    const result = await sign({
      tx: Serialization.Transaction.fromCore(coreTx),
      utxo: [],
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const signatures = result.value.toCore().witness.signatures;
    expect(signatures.size).toBe(1);

    // A signature count of 1 would pass for a wrong key or an invalid signature.
    const txBodyHash = result.value.body().hash();
    const [[vkeyHex, signatureHex]] = signatures;
    const publicKey = Ed25519PublicKey.fromHex(vkeyHex);

    expect(publicKey.hash().hex()).toBe(ownPaymentKeyHash);
    expect(
      publicKey.verify(Ed25519Signature.fromHex(signatureHex), txBodyHash),
    ).toBe(true);
  });

  it('returns a SIGNING_FAILED error when the auth secret cannot decrypt the root key', async () => {
    // Must actually require a key derivation (owned input below), otherwise
    // the agent never touches the encrypted root key and no error surfaces.
    const inputTxId = Cardano.TransactionId(`${'0'.repeat(63)}7`);
    const utxo: Cardano.Utxo = [
      { txId: inputTxId, index: 0, address: FIXTURE_ADDRESS },
      { address: FIXTURE_ADDRESS, value: { coins: 5_000_000n } },
    ];
    const coreTx: Cardano.Tx = {
      id: Cardano.TransactionId(`${'0'.repeat(63)}3`),
      body: {
        inputs: [{ txId: inputTxId, index: 0 }],
        outputs: [{ address: FIXTURE_ADDRESS, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    };

    const result = await sign({
      tx: Serialization.Transaction.fromCore(coreTx),
      utxo: [utxo],
      authSecret: ByteArray.fromUTF8('wrong-password'),
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.code).toBe('SIGNING_FAILED');
  });

  // This path and the real send-flow signer build their own independent
  // InMemoryKeyAgent, so comparing their witnesses guards against drift.
  it('produces the same witness as the real in-memory signer for the same native-script tx', async () => {
    const ownPaymentKeyHash = Cardano.Address.fromBech32(FIXTURE_ADDRESS)
      .asBase()!
      .getPaymentCredential().hash as unknown as Ed25519KeyHashHex;

    const coreTx: Cardano.Tx = {
      id: Cardano.TransactionId(`${'0'.repeat(63)}8`),
      body: {
        inputs: [
          { txId: Cardano.TransactionId(`${'0'.repeat(63)}9`), index: 0 },
        ],
        outputs: [{ address: FIXTURE_ADDRESS, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: {
        signatures: new Map(),
        scripts: [
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireSignature,
            keyHash: ownPaymentKeyHash,
          },
        ],
      },
    };

    const feeEstimateResult = await sign({
      tx: Serialization.Transaction.fromCore(coreTx),
      utxo: [],
    });
    expect(feeEstimateResult.isOk()).toBe(true);
    if (!feeEstimateResult.isOk()) return;

    const authSecret = ByteArray.fromUTF8(PASSWORD) as unknown as Parameters<
      typeof createCardanoKeyAgentFromEncryptedRoot
    >[0]['authSecret'];
    const withKeyAgent$: WithCardanoKeyAgent$ = use =>
      from(
        createCardanoKeyAgentFromEncryptedRoot({ ...FIXTURE, authSecret }),
      ).pipe(switchMap(use));
    const realSigner = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses,
      utxo: [],
      auth: { authenticate: () => of(true), accessAuthSecret: vi.fn() },
    });

    const realSignerResult = await firstValueFrom(
      realSigner.sign({
        serializedTx: HexBytes(
          Serialization.Transaction.fromCore(coreTx).toCbor(),
        ),
      }),
    );

    const realSignerTx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(realSignerResult.serializedTx),
    );

    expect([...realSignerTx.toCore().witness.signatures]).toEqual([
      ...feeEstimateResult.value.toCore().witness.signatures,
    ]);
    expect(realSignerResult.signatureCount).toBe(1);
  });
});
