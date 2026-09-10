import { Cardano, Serialization, setInConwayEra } from '@cardano-sdk/core';
import { Ed25519PublicKey, Ed25519Signature } from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  accessAuthSecret,
  clearAuthSecret,
  propagateAuthSecret,
} from '@lace-contract/authentication-prompt/src/store/auth-secret-accessor';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, from, of, switchMap } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';

import { CardanoInMemoryDataSigner } from '../../src/signing/cardano-in-memory-data-signer';
import { CardanoInMemoryTransactionSigner } from '../../src/signing/cardano-in-memory-transaction-signer';
import {
  createCardanoKeyAgentFromEncryptedRoot,
  deriveDRepKeyHash,
} from '../../src/signing/cardano-key-agent';
import { getUniqueSignerKeyHashes } from '../../src/signing/getUniqueSigners';
import { TransactionBuilder } from '../../src/tx-builder/TransactionBuilder';

import type { WithCardanoKeyAgent$ } from '../../src/signing/cardano-in-memory-transaction-signer';
import type { Ed25519KeyHashHex, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { SignerAuth } from '@lace-contract/signer';

// Real preview-testnet fixture (see LW-14969): the root key is encrypted under
// the UTF-8 bytes of PASSWORD, so the real AES-GCM decrypt only succeeds while
// the auth secret is still alive.
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

// Reproduces the factory's key-agent provider verbatim: the agent is unlocked
// under the real (zeroing) accessAuthSecret window, and `use` (the signing
// operation) runs inside that window via switchMap, so the auth-secret clone is
// zeroed only after the lazy decrypt completes.
const withKeyAgent$: WithCardanoKeyAgent$ = use =>
  accessAuthSecret(authSecret =>
    from(
      createCardanoKeyAgentFromEncryptedRoot({ ...FIXTURE, authSecret }),
    ).pipe(switchMap(use)),
  );

describe('Cardano in-memory signing — real auth-secret zeroing (LW-14969)', () => {
  afterEach(() => {
    clearAuthSecret();
  });

  it('signs data while the auth secret is alive and survives clone zeroing', async () => {
    propagateAuthSecret(AuthSecret.fromUTF8(PASSWORD));
    const auth: SignerAuth = { authenticate: () => of(true), accessAuthSecret };
    const signer = new CardanoInMemoryDataSigner({
      withKeyAgent$,
      dRepKeyHash$: from(deriveDRepKeyHash(FIXTURE)),
      knownAddresses,
      auth,
    });

    const result = await firstValueFrom(
      signer.signData({ signWith: FIXTURE_ADDRESS, payload: 'deadbeef' }),
    );

    expect(result.signature).toBeDefined();
    expect(result.key).toBeDefined();
  });

  it('produces a witness for a key required only via a native script (LW-15097)', async () => {
    propagateAuthSecret(AuthSecret.fromUTF8(PASSWORD));
    const auth: SignerAuth = { authenticate: () => of(true), accessAuthSecret };
    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses,
      utxo: [],
      auth,
    });

    const ownPaymentKeyHash = Cardano.Address.fromBech32(FIXTURE_ADDRESS)
      .asBase()!
      .getPaymentCredential().hash as unknown as Ed25519KeyHashHex;

    const tx: Cardano.Tx = {
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

    const serializedTx = HexBytes(
      Serialization.Transaction.fromCore(tx).toCbor(),
    );

    const result = await firstValueFrom(signer.sign({ serializedTx }));

    expect(result.signatureCount).toBe(1);

    // signatureCount alone would pass for a wrong key or an invalid signature.
    const signedTx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(result.serializedTx),
    );
    const txBodyHash = signedTx.body().hash();
    const [[vkeyHex, signatureHex]] = signedTx.toCore().witness.signatures;
    const publicKey = Ed25519PublicKey.fromHex(vkeyHex);

    expect(publicKey.hash().hex()).toBe(ownPaymentKeyHash);
    expect(
      publicKey.verify(Ed25519Signature.fromHex(signatureHex), txBodyHash),
    ).toBe(true);
  });
});

describe('Cardano in-memory signing — native script witnesses', () => {
  afterEach(() => {
    clearAuthSecret();
    // TransactionBuilder flips the global inConwayEra flag on construction; reset
    // it so the builder end-to-end case does not affect CBOR encoding elsewhere.
    setInConwayEra(false);
  });

  const auth: SignerAuth = { authenticate: () => of(true), accessAuthSecret };

  const ownKeyHash = Cardano.Address.fromBech32(FIXTURE_ADDRESS)
    .asBase()!
    .getPaymentCredential().hash as unknown as Ed25519KeyHashHex;
  const foreignKeyHash = 'f'.repeat(56) as unknown as Ed25519KeyHashHex;
  const stakeKeyHash = Cardano.RewardAccount.toHash(
    FIXTURE_REWARD_ACCOUNT,
  ) as unknown as Ed25519KeyHashHex;

  const requireSig = (keyHash: Ed25519KeyHashHex): Cardano.NativeScript => ({
    __type: Cardano.ScriptType.Native,
    kind: Cardano.NativeScriptKind.RequireSignature,
    keyHash,
  });

  const buildScriptTxCbor = (scripts: Cardano.Script[]): HexBytes => {
    const tx: Cardano.Tx = {
      id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
      body: {
        inputs: [
          { txId: Cardano.TransactionId(`${'0'.repeat(63)}2`), index: 0 },
        ],
        outputs: [{ address: FIXTURE_ADDRESS, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: { signatures: new Map(), scripts },
    };
    return HexBytes(Serialization.Transaction.fromCore(tx).toCbor());
  };

  const signSerializedTx = async (serializedTx: HexBytes) => {
    propagateAuthSecret(AuthSecret.fromUTF8(PASSWORD));
    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses,
      utxo: [],
      auth,
    });
    return firstValueFrom(signer.sign({ serializedTx }));
  };

  // Decodes the produced witnesses and returns each vkey's key hash, after
  // asserting the given key produced a witness that actually verifies against
  // the tx body hash (not merely a witness of the right count).
  const verifyWitnessFor = (
    serializedTx: HexBytes,
    keyHash: Ed25519KeyHashHex,
  ): Ed25519KeyHashHex[] => {
    const signedTx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(serializedTx),
    );
    const txBodyHash = signedTx.body().hash();
    const decoded = [...signedTx.toCore().witness.signatures].map(
      ([vkeyHex, signatureHex]) => {
        const publicKey = Ed25519PublicKey.fromHex(vkeyHex);
        return {
          publicKey,
          signatureHex,
          keyHash: publicKey.hash().hex(),
        };
      },
    );
    const match = decoded.find(d => d.keyHash === keyHash);
    expect(match).toBeDefined();
    expect(
      match!.publicKey.verify(
        Ed25519Signature.fromHex(match!.signatureHex),
        txBodyHash,
      ),
    ).toBe(true);
    return decoded.map(d => d.keyHash);
  };

  const verifyOwnWitness = (serializedTx: HexBytes): Ed25519KeyHashHex[] =>
    verifyWitnessFor(serializedTx, ownKeyHash);

  it('witnesses the wallet key nested under RequireAllOf', async () => {
    const result = await signSerializedTx(
      buildScriptTxCbor([
        {
          __type: Cardano.ScriptType.Native,
          kind: Cardano.NativeScriptKind.RequireAllOf,
          scripts: [requireSig(ownKeyHash)],
        },
      ]),
    );
    verifyOwnWitness(result.serializedTx);
  });

  it('witnesses the wallet key nested under RequireAnyOf beside a foreign signer', async () => {
    const result = await signSerializedTx(
      buildScriptTxCbor([
        {
          __type: Cardano.ScriptType.Native,
          kind: Cardano.NativeScriptKind.RequireAnyOf,
          scripts: [requireSig(foreignKeyHash), requireSig(ownKeyHash)],
        },
      ]),
    );
    verifyOwnWitness(result.serializedTx);
  });

  it('witnesses the wallet key nested under RequireNOf', async () => {
    const result = await signSerializedTx(
      buildScriptTxCbor([
        {
          __type: Cardano.ScriptType.Native,
          kind: Cardano.NativeScriptKind.RequireNOf,
          required: 1,
          scripts: [requireSig(foreignKeyHash), requireSig(ownKeyHash)],
        },
      ]),
    );
    verifyOwnWitness(result.serializedTx);
  });

  it('witnesses the wallet key referenced by a RequireGuard KeyHash credential', async () => {
    const result = await signSerializedTx(
      buildScriptTxCbor([
        {
          __type: Cardano.ScriptType.Native,
          kind: Cardano.NativeScriptKind.RequireGuard,
          credential: {
            type: Cardano.CredentialType.KeyHash,
            hash: ownKeyHash as unknown as Cardano.Credential['hash'],
          },
        },
      ]),
    );
    verifyOwnWitness(result.serializedTx);
  });

  it('witnesses the wallet key nested deep (RequireAnyOf inside RequireAllOf)', async () => {
    const result = await signSerializedTx(
      buildScriptTxCbor([
        {
          __type: Cardano.ScriptType.Native,
          kind: Cardano.NativeScriptKind.RequireAllOf,
          scripts: [
            {
              __type: Cardano.ScriptType.Native,
              kind: Cardano.NativeScriptKind.RequireAnyOf,
              scripts: [requireSig(foreignKeyHash), requireSig(ownKeyHash)],
            },
          ],
        },
      ]),
    );
    verifyOwnWitness(result.serializedTx);
  });

  it('produces only witnesses the fee estimate already budgeted for', async () => {
    // The regression this fix targets: fee estimation (getUniqueSignerKeyHashes)
    // and signing must agree. Signing must never produce a witness the estimate
    // did not count (that would underpay), and must still witness the own key.
    const scripts: Cardano.Script[] = [
      {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireNOf,
        required: 1,
        scripts: [requireSig(foreignKeyHash), requireSig(ownKeyHash)],
      },
    ];
    const serializedTx = buildScriptTxCbor(scripts);
    const estimatedSigners = getUniqueSignerKeyHashes(
      Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(serializedTx),
      ).toCore(),
      [],
    );

    const result = await signSerializedTx(serializedTx);
    const producedKeyHashes = verifyOwnWitness(result.serializedTx);

    for (const keyHash of producedKeyHashes) {
      expect(estimatedSigners.has(keyHash)).toBe(true);
    }
    expect(producedKeyHashes).toContain(ownKeyHash);
  });

  it('witnesses the wallet stake key required via a native script', async () => {
    const result = await signSerializedTx(
      buildScriptTxCbor([requireSig(stakeKeyHash)]),
    );

    const producedKeyHashes = verifyWitnessFor(
      result.serializedTx,
      stakeKeyHash,
    );
    expect(producedKeyHashes).toContain(stakeKeyHash);
  });

  it('witnesses both the payment and stake keys required together, within the fee estimate', async () => {
    const serializedTx = buildScriptTxCbor([
      {
        __type: Cardano.ScriptType.Native,
        kind: Cardano.NativeScriptKind.RequireAllOf,
        scripts: [requireSig(ownKeyHash), requireSig(stakeKeyHash)],
      },
    ]);
    const estimatedSigners = getUniqueSignerKeyHashes(
      Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(serializedTx),
      ).toCore(),
      [],
    );

    const result = await signSerializedTx(serializedTx);
    verifyWitnessFor(result.serializedTx, ownKeyHash);
    const producedKeyHashes = verifyWitnessFor(
      result.serializedTx,
      stakeKeyHash,
    );

    expect(result.signatureCount).toBe(2);
    expect(new Set(producedKeyHashes)).toEqual(
      new Set([ownKeyHash, stakeKeyHash]),
    );
    for (const keyHash of producedKeyHashes) {
      expect(estimatedSigners.has(keyHash)).toBe(true);
    }
  });

  it('does not witness a DRep-key-hash script key that fee estimation still counts (known divergence)', async () => {
    const dRepKeyHash = await deriveDRepKeyHash(FIXTURE);
    const serializedTx = buildScriptTxCbor([requireSig(dRepKeyHash)]);
    const estimatedSigners = getUniqueSignerKeyHashes(
      Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(serializedTx),
      ).toCore(),
      [],
    );

    // Fee estimation adds the raw script key hash regardless of credential kind,
    // so the DRep key is budgeted for...
    expect(estimatedSigners.has(dRepKeyHash)).toBe(true);

    // ...but signing matches script keys only against the wallet's payment and
    // stake credentials, so a DRep-only script yields no witness. The estimate
    // over-counts here (safe for fees, but the tx cannot actually be satisfied).
    const result = await signSerializedTx(serializedTx);
    expect(result.signatureCount).toBe(0);
  });

  it('signs a TransactionBuilder-produced tx whose attached native script requires the wallet stake key', async () => {
    // The lace-sdk-public builder path: attachScript must copy the script into
    // both the built witness set (so signing sees it) and the fee-estimation
    // context (so the fee budgets the extra signer). A builder regression that
    // dropped the script from the witness set would leave the stake key
    // unwitnessed here.
    const protocolParameters = {
      minFeeCoefficient: 44,
      minFeeConstant: 155381,
      prices: { memory: 0.0577, steps: 0.0000721 },
      coinsPerUtxoByte: 4310,
      poolDeposit: 2_000_000,
      stakeKeyDeposit: 2_000_000,
      dRepDeposit: 500_000_000,
      maxTxSize: 16384,
      maxValueSize: 4096,
      collateralPercentage: 150,
      maxCollateralInputs: 3,
      minFeeRefScriptCostPerByte: '15',
    } as unknown as ConstructorParameters<typeof TransactionBuilder>[1];

    // A single owned UTxO to balance against; its payment key is the input
    // signer, while the attached script adds the stake key as a distinct signer.
    const availableUtxos: Cardano.Utxo[] = [
      [
        {
          txId: Cardano.TransactionId(`${'0'.repeat(63)}3`),
          index: 0,
          address: FIXTURE_ADDRESS,
        },
        { address: FIXTURE_ADDRESS, value: { coins: 10_000_000n } },
      ],
    ];

    const builtTx = await new TransactionBuilder(
      Cardano.NetworkMagics.Preprod,
      protocolParameters,
    )
      .setChangeAddress(FIXTURE_ADDRESS)
      .setUnspentOutputs(availableUtxos)
      .transferValue(FIXTURE_ADDRESS, { coins: 2_000_000n })
      .attachScript(requireSig(stakeKeyHash))
      .build();

    const builtCore = builtTx.toCore();
    expect(builtCore.witness.scripts).toHaveLength(1);

    const estimatedSigners = getUniqueSignerKeyHashes(
      builtCore,
      availableUtxos,
    );
    expect(estimatedSigners.has(stakeKeyHash)).toBe(true);

    propagateAuthSecret(AuthSecret.fromUTF8(PASSWORD));
    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses,
      utxo: availableUtxos,
      auth,
    });
    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes(builtTx.toCbor()) }),
    );

    // The stake key required only via the attached script is witnessed and
    // verifies, and every produced witness was budgeted by fee estimation.
    const producedKeyHashes = verifyWitnessFor(
      result.serializedTx,
      stakeKeyHash,
    );
    for (const keyHash of producedKeyHashes) {
      expect(estimatedSigners.has(keyHash)).toBe(true);
    }
  });
});
