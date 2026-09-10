import { Cardano, Serialization } from '@cardano-sdk/core';
import { Ok, Err } from '@lace-lib/util';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  createCombinedInputResolver,
  requiresForeignSignatures,
  requiresForeignSignaturesFromCbor,
  txInEquals,
} from '../src/common/store/utils/input-resolver';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoProvider,
  CardanoProviderContext,
} from '@lace-contract/cardano-context';

const mockTxId1 = Cardano.TransactionId(
  '0000000000000000000000000000000000000000000000000000000000000001',
);
const mockTxId2 = Cardano.TransactionId(
  '0000000000000000000000000000000000000000000000000000000000000002',
);

const mockAddress = Cardano.PaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);

const createMockTxIn = (
  txId: Cardano.TransactionId,
  index: number,
): Cardano.TxIn => ({
  txId,
  index,
});

const createMockHydratedTxIn = (
  txId: Cardano.TransactionId,
  index: number,
): Cardano.HydratedTxIn => ({
  txId,
  index,
  address: mockAddress,
});

const createMockTxOut = (lovelace: bigint): Cardano.TxOut => ({
  address: mockAddress,
  value: { coins: lovelace },
});

const createMockUtxo = (
  txId: Cardano.TransactionId,
  index: number,
  lovelace: bigint,
): Cardano.Utxo => [
  createMockHydratedTxIn(txId, index),
  createMockTxOut(lovelace),
];

const createLocalInputResolver = (
  localUtxos: Cardano.Utxo[],
): Cardano.InputResolver => ({
  resolveInput: async (txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> =>
    localUtxos.find(([input]) => txInEquals(input, txIn))?.[1] ?? null,
});

const mockContext: CardanoProviderContext = {
  chainId: {
    networkId: Cardano.NetworkId.Testnet,
    networkMagic: 1,
  },
};

const createMockCardanoProvider = (
  resolveInputMock: CardanoProvider['resolveInput'],
): CardanoProvider =>
  ({
    resolveInput: resolveInputMock,
  } as unknown as CardanoProvider);

describe('input-resolver', () => {
  describe('txInEquals', () => {
    it('returns true for matching txId and index', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId1, 0);

      expect(txInEquals(txIn1, txIn2)).toBe(true);
    });

    it('returns false for different txId', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId2, 0);

      expect(txInEquals(txIn1, txIn2)).toBe(false);
    });

    it('returns false for different index', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId1, 1);

      expect(txInEquals(txIn1, txIn2)).toBe(false);
    });

    it('returns false for different txId and index', () => {
      const txIn1 = createMockTxIn(mockTxId1, 0);
      const txIn2 = createMockTxIn(mockTxId2, 1);

      expect(txInEquals(txIn1, txIn2)).toBe(false);
    });
  });

  describe('createCombinedInputResolver', () => {
    describe('local hit', () => {
      it('returns TxOut from local UTXOs when input is found locally', async () => {
        const localUtxos = [
          createMockUtxo(mockTxId1, 0, 1_000_000n),
          createMockUtxo(mockTxId1, 1, 2_000_000n),
        ];
        const resolveInputMock = vi.fn();
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toEqual(createMockTxOut(1_000_000n));
        expect(resolveInputMock).not.toHaveBeenCalled();
      });

      it('returns correct TxOut when multiple UTXOs exist for same txId', async () => {
        const localUtxos = [
          createMockUtxo(mockTxId1, 0, 1_000_000n),
          createMockUtxo(mockTxId1, 1, 2_000_000n),
          createMockUtxo(mockTxId1, 2, 3_000_000n),
        ];
        const resolveInputMock = vi.fn();
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 1),
        );

        expect(result).toEqual(createMockTxOut(2_000_000n));
        expect(resolveInputMock).not.toHaveBeenCalled();
      });
    });

    describe('local miss + remote hit', () => {
      it('falls back to CardanoProvider when input not found locally', async () => {
        const localUtxos = [createMockUtxo(mockTxId1, 0, 1_000_000n)];
        const remoteTxOut = createMockTxOut(5_000_000n);
        const resolveInputMock = vi.fn().mockReturnValue(of(Ok(remoteTxOut)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId2, 0),
        );

        expect(result).toEqual(remoteTxOut);
        expect(resolveInputMock).toHaveBeenCalledWith(
          createMockTxIn(mockTxId2, 0),
          mockContext,
        );
      });

      it('uses remote when local UTXOs array is empty', async () => {
        const localUtxos: Cardano.Utxo[] = [];
        const remoteTxOut = createMockTxOut(5_000_000n);
        const resolveInputMock = vi.fn().mockReturnValue(of(Ok(remoteTxOut)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toEqual(remoteTxOut);
        expect(resolveInputMock).toHaveBeenCalled();
      });
    });

    describe('local miss + remote miss', () => {
      it('returns null when input not found locally and remote returns null', async () => {
        const localUtxos = [createMockUtxo(mockTxId1, 0, 1_000_000n)];
        const resolveInputMock = vi.fn().mockReturnValue(of(Ok(null)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId2, 0),
        );

        expect(result).toBeNull();
      });
    });

    describe('remote error handling', () => {
      it('returns null when remote provider returns an error', async () => {
        const localUtxos: Cardano.Utxo[] = [];
        const mockError = new Error('Network error');
        const resolveInputMock = vi.fn().mockReturnValue(of(Err(mockError)));
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toBeNull();
      });

      it('returns null when observable completes without emitting', async () => {
        const localUtxos: Cardano.Utxo[] = [];
        const { EMPTY } = await import('rxjs');
        const resolveInputMock = vi.fn().mockReturnValue(EMPTY);
        const cardanoProvider = createMockCardanoProvider(resolveInputMock);

        const resolver = createCombinedInputResolver(
          localUtxos,
          cardanoProvider,
          mockContext,
        );
        const result = await resolver.resolveInput(
          createMockTxIn(mockTxId1, 0),
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('requiresForeignSignaturesFromCbor (foreign inputs)', () => {
    // Transaction with a single input: 260aed6e...61f index 1
    const VALID_TX_CBOR =
      '84a60081825820260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f01018383581d70b429738bd6cc58b5c7932d001aa2bd05cfea47020a556c8c753d44361a004c4b40582007845f8f3841996e3d8157954e2f5e2fb90465f27112fc5fe9056d916fae245b82583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba1a0463676982583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba821a00177a6ea2581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a5447742544319271044774554481a0031f9194577444f47451a0056898d4577555344431a000fc589467753484942411a000103c2581c659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7a14a57696e675269646572731a02269552021a0002e665031a01353f84081a013531740b58204107eada931c72a600a6e3305bd22c7aeb9ada7c3f6823b155f4db85de36a69aa20081825820e686ade5bc97372f271fd2abc06cfd96c24b3d9170f9459de1d8e3dd8fd385575840653324a9dddad004f05a8ac99fa2d1811af5f00543591407fb5206cfe9ac91bb1412404323fa517e0e189684cd3592e7f74862e3f16afbc262519abec958180c0481d8799fd8799fd8799fd8799f581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68ffd8799fd8799fd8799f581c042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339baffffffff581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c681b000001863784a12ed8799fd8799f4040ffd8799f581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745ffffffd8799fd87980190c8efffff5f6';

    const TX_INPUT_TXID = Cardano.TransactionId(
      '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
    );
    const TX_INPUT_INDEX = 1;

    // Empty knownAddresses to test only foreign inputs detection
    const emptyKnownAddresses: [] = [];

    it('returns false when all transaction inputs are in local UTXOs', async () => {
      const localUtxos = [
        createMockUtxo(TX_INPUT_TXID, TX_INPUT_INDEX, 5_000_000n),
      ];

      const hasForeignSignatures = await requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
        createLocalInputResolver(localUtxos),
        true,
      );

      expect(hasForeignSignatures).toBe(false);
    });

    it('returns true when transaction has inputs not in local UTXOs', async () => {
      const localUtxos = [
        createMockUtxo(mockTxId1, 0, 1_000_000n),
        createMockUtxo(mockTxId2, 0, 2_000_000n),
      ];

      const hasForeignSignatures = await requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
        createLocalInputResolver(localUtxos),
        true,
      );

      expect(hasForeignSignatures).toBe(true);
    });

    it('returns true when local UTXOs is empty', async () => {
      const localUtxos: Cardano.Utxo[] = [];

      const hasForeignSignatures = await requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
        createLocalInputResolver(localUtxos),
        true,
      );

      expect(hasForeignSignatures).toBe(true);
    });

    it('returns true when some inputs are local and some are foreign', async () => {
      const localUtxos = [createMockUtxo(TX_INPUT_TXID, 0, 1_000_000n)];

      const hasForeignSignatures = await requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
        createLocalInputResolver(localUtxos),
        true,
      );

      expect(hasForeignSignatures).toBe(true);
    });

    it('returns false when UTXO has same txId and index (different value is ok)', async () => {
      const localUtxos = [
        createMockUtxo(TX_INPUT_TXID, TX_INPUT_INDEX, 999_999n),
      ];

      const hasForeignSignatures = await requiresForeignSignaturesFromCbor(
        VALID_TX_CBOR,
        localUtxos,
        emptyKnownAddresses,
        createLocalInputResolver(localUtxos),
        true,
      );

      expect(hasForeignSignatures).toBe(false);
    });
  });

  describe('requiresForeignSignatures (native scripts)', () => {
    const OWN_ADDRESS = Cardano.PaymentAddress(
      'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7',
    );
    const OWN_REWARD_ACCOUNT = Cardano.RewardAccount(
      'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7',
    );
    const ownPaymentKeyHash = Cardano.Address.fromBech32(OWN_ADDRESS)
      .asBase()!
      .getPaymentCredential().hash as unknown as Ed25519KeyHashHex;
    const ownStakeKeyHash = Cardano.RewardAccount.toHash(
      OWN_REWARD_ACCOUNT,
    ) as unknown as Ed25519KeyHashHex;
    const foreignKeyHash = 'f'.repeat(56) as unknown as Ed25519KeyHashHex;

    const knownAddresses = [
      { address: OWN_ADDRESS, rewardAccount: OWN_REWARD_ACCOUNT },
    ] as GroupedAddress[];

    const requireSig = (keyHash: Ed25519KeyHashHex): Cardano.NativeScript => ({
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireSignature,
      keyHash,
    });
    const allOf = (
      ...scripts: Cardano.NativeScript[]
    ): Cardano.NativeScript => ({
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireAllOf,
      scripts,
    });
    const anyOf = (
      ...scripts: Cardano.NativeScript[]
    ): Cardano.NativeScript => ({
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireAnyOf,
      scripts,
    });
    const nOf = (
      required: number,
      ...scripts: Cardano.NativeScript[]
    ): Cardano.NativeScript => ({
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireNOf,
      required,
      scripts,
    });
    const guard = (credential: Cardano.Credential): Cardano.NativeScript => ({
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireGuard,
      credential,
    });
    const timelock: Cardano.NativeScript = {
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireTimeAfter,
      slot: Cardano.Slot(0),
    };

    const localUtxo = createMockUtxo(mockTxId1, 0, 5_000_000n);

    const makeTx = (scripts?: Cardano.Script[]): Cardano.Tx => ({
      id: Cardano.TransactionId(`${'0'.repeat(63)}9`),
      body: {
        inputs: [createMockTxIn(mockTxId1, 0)],
        outputs: [],
        fee: 0n,
      },
      witness: { signatures: new Map(), scripts },
    });

    const gate = async (
      scripts?: Cardano.Script[],
      signerWitnessesScriptKeys = true,
    ): Promise<boolean> =>
      requiresForeignSignatures(
        makeTx(scripts),
        [localUtxo],
        knownAddresses,
        createLocalInputResolver([localUtxo]),
        signerWitnessesScriptKeys,
      );

    it('returns false for a RequireSignature script over an own payment key', async () => {
      expect(await gate([requireSig(ownPaymentKeyHash)])).toBe(false);
    });

    it('returns false for a RequireSignature script over an own stake key', async () => {
      expect(await gate([requireSig(ownStakeKeyHash)])).toBe(false);
    });

    it('returns true for a RequireSignature script over a foreign key', async () => {
      expect(await gate([requireSig(foreignKeyHash)])).toBe(true);
    });

    it('returns false for a RequireAllOf script with only own keys', async () => {
      expect(
        await gate([
          allOf(requireSig(ownPaymentKeyHash), requireSig(ownStakeKeyHash)),
        ]),
      ).toBe(false);
    });

    it('returns true for a RequireAllOf script with a foreign child', async () => {
      expect(
        await gate([
          allOf(requireSig(ownPaymentKeyHash), requireSig(foreignKeyHash)),
        ]),
      ).toBe(true);
    });

    it('returns false for a RequireAnyOf script with one own branch', async () => {
      expect(
        await gate([
          anyOf(requireSig(foreignKeyHash), requireSig(ownPaymentKeyHash)),
        ]),
      ).toBe(false);
    });

    it('returns true for a RequireAnyOf script with only foreign branches', async () => {
      expect(await gate([anyOf(requireSig(foreignKeyHash))])).toBe(true);
    });

    it('returns false for a RequireNOf script with exactly n satisfiable children', async () => {
      expect(
        await gate([
          nOf(
            2,
            requireSig(ownPaymentKeyHash),
            requireSig(ownStakeKeyHash),
            requireSig(foreignKeyHash),
          ),
        ]),
      ).toBe(false);
    });

    it('returns true for a RequireNOf script with fewer than n satisfiable children', async () => {
      expect(
        await gate([
          nOf(
            3,
            requireSig(ownPaymentKeyHash),
            requireSig(ownStakeKeyHash),
            requireSig(foreignKeyHash),
          ),
        ]),
      ).toBe(true);
    });

    it('returns false for a RequireGuard script over an own key hash', async () => {
      expect(
        await gate([
          guard({
            type: Cardano.CredentialType.KeyHash,
            hash: ownPaymentKeyHash as unknown as Cardano.Credential['hash'],
          }),
        ]),
      ).toBe(false);
    });

    it('returns true for a RequireGuard script over a foreign key hash', async () => {
      expect(
        await gate([
          guard({
            type: Cardano.CredentialType.KeyHash,
            hash: foreignKeyHash as unknown as Cardano.Credential['hash'],
          }),
        ]),
      ).toBe(true);
    });

    it('returns true for a RequireGuard script over a non-key credential', async () => {
      expect(
        await gate([
          guard({
            type: Cardano.CredentialType.ScriptHash,
            hash: foreignKeyHash as unknown as Cardano.Credential['hash'],
          }),
        ]),
      ).toBe(true);
    });

    it('returns false for a pure timelock script', async () => {
      expect(await gate([timelock])).toBe(false);
    });

    it('returns false for an empty scripts array', async () => {
      expect(await gate([])).toBe(false);
    });

    it('returns false when the witness set has no scripts', async () => {
      expect(await gate()).toBe(false);
    });

    describe('signer cannot witness script keys', () => {
      it('returns true for a signature-bearing script even over an own key', async () => {
        expect(await gate([requireSig(ownPaymentKeyHash)], false)).toBe(true);
      });

      it('returns false for a pure timelock script', async () => {
        expect(await gate([timelock], false)).toBe(false);
      });

      it('returns false for a RequireAnyOf script with a timelock branch', async () => {
        expect(
          await gate([anyOf(timelock, requireSig(ownPaymentKeyHash))], false),
        ).toBe(false);
      });
    });

    describe('foreign input script exemption', () => {
      const ownScript = requireSig(ownPaymentKeyHash);
      const ownScriptAddress = Cardano.EnterpriseAddress.fromCredentials(
        Cardano.NetworkId.Testnet,
        {
          type: Cardano.CredentialType.ScriptHash,
          hash: Serialization.NativeScript.fromCore(ownScript).hash(),
        },
      )
        .toAddress()
        .toBech32() as Cardano.PaymentAddress;

      const resolverReturning = (
        txOut: Cardano.TxOut | null,
      ): Cardano.InputResolver => ({
        resolveInput: vi.fn().mockResolvedValue(txOut),
      });

      const gateWithResolver = async (
        scripts: Cardano.Script[],
        inputResolver: Cardano.InputResolver | undefined,
        signerWitnessesScriptKeys = true,
      ): Promise<boolean> =>
        requiresForeignSignatures(
          makeTx(scripts),
          [],
          knownAddresses,
          inputResolver,
          signerWitnessesScriptKeys,
        );

      it('returns false when an unknown input resolves to the address of an own-satisfiable script', async () => {
        const resolver = resolverReturning({
          address: ownScriptAddress,
          value: { coins: 5_000_000n },
        });

        expect(await gateWithResolver([ownScript], resolver)).toBe(false);
      });

      it('returns true when an unknown input cannot be resolved', async () => {
        expect(
          await gateWithResolver([ownScript], resolverReturning(null)),
        ).toBe(true);
      });

      it('returns true when an unknown input resolves to a key hash address', async () => {
        const resolver = resolverReturning({
          address: OWN_ADDRESS,
          value: { coins: 5_000_000n },
        });

        expect(await gateWithResolver([ownScript], resolver)).toBe(true);
      });

      it('returns true when the signer cannot witness script keys', async () => {
        const timelockAddress = Cardano.EnterpriseAddress.fromCredentials(
          Cardano.NetworkId.Testnet,
          {
            type: Cardano.CredentialType.ScriptHash,
            hash: Serialization.NativeScript.fromCore(timelock).hash(),
          },
        )
          .toAddress()
          .toBech32() as Cardano.PaymentAddress;
        const resolver = resolverReturning({
          address: timelockAddress,
          value: { coins: 5_000_000n },
        });

        expect(await gateWithResolver([timelock], resolver, false)).toBe(true);
      });

      it('returns true without resolving when a script needs a foreign key', async () => {
        const resolver = resolverReturning({
          address: ownScriptAddress,
          value: { coins: 5_000_000n },
        });

        expect(
          await gateWithResolver([requireSig(foreignKeyHash)], resolver),
        ).toBe(true);
        expect(resolver.resolveInput).not.toHaveBeenCalled();
      });

      it('resolves a repeated unknown input only once', async () => {
        const resolver = resolverReturning({
          address: ownScriptAddress,
          value: { coins: 5_000_000n },
        });
        const txIn = createMockTxIn(mockTxId2, 0);
        const tx: Cardano.Tx = {
          ...makeTx([ownScript]),
          body: {
            inputs: [txIn, { ...txIn }],
            collaterals: [{ ...txIn }],
            outputs: [],
            fee: 0n,
          },
        };

        expect(
          await requiresForeignSignatures(
            tx,
            [],
            knownAddresses,
            resolver,
            true,
          ),
        ).toBe(false);
        expect(resolver.resolveInput).toHaveBeenCalledTimes(1);
      });

      it('returns true without resolving when unknown inputs exceed the resolution cap', async () => {
        const resolver = resolverReturning({
          address: ownScriptAddress,
          value: { coins: 5_000_000n },
        });
        const tx: Cardano.Tx = {
          ...makeTx([ownScript]),
          body: {
            inputs: Array.from({ length: 31 }, (_, index) =>
              createMockTxIn(mockTxId2, index),
            ),
            outputs: [],
            fee: 0n,
          },
        };

        expect(
          await requiresForeignSignatures(
            tx,
            [],
            knownAddresses,
            resolver,
            true,
          ),
        ).toBe(true);
        expect(resolver.resolveInput).not.toHaveBeenCalled();
      });

      describe('without an input resolver (pre-consent local-only mode)', () => {
        it('optimistically exempts unknown inputs when an own-satisfiable script exists', async () => {
          expect(await gateWithResolver([ownScript], undefined)).toBe(false);
        });

        it('still rejects unknown inputs when no own-satisfiable script exists', async () => {
          expect(
            await requiresForeignSignatures(
              makeTx(),
              [],
              knownAddresses,
              undefined,
              true,
            ),
          ).toBe(true);
        });
      });
    });
  });
});
