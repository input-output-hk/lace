import { Cardano, Serialization } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { HexBlob } from '@cardano-sdk/util';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
  withCollateralOwnershipGuard,
} from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes, Ok } from '@lace-lib/util';
import { EMPTY, from, of, Subject, switchMap } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectCardanoDappConnectorApi } from '../src/browser/store/side-effects';

import { isCborBoundToNetwork } from './support/network-binding-verdict';

import type { SigningResult } from '../src/browser/store/util';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoTransactionSignerContext,
  WithCardanoKeyAgent$,
} from '@lace-contract/cardano-context';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

vi.mock('../src/browser/store/util', async () => {
  const actual = await vi.importActual('../src/browser/store/util');
  return {
    ...actual,
    signTx$: vi.fn().mockReturnValue(of({ type: 'SIGN_TX_ACTION' })),
    signData$: vi.fn().mockReturnValue(of({ type: 'SIGN_DATA_ACTION' })),
    detectViewClosure: vi.fn().mockReturnValue(EMPTY),
  };
});

(globalThis as { chrome?: unknown }).chrome = {
  sidePanel: { setPanelBehavior: () => {} },
};

// ---------------------------------------------------------------------------
// Fixture: the same real preview-testnet wallet the cross-network regression
// test uses, so every signature below is a real Ed25519 signature.
// ---------------------------------------------------------------------------
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

const ACCOUNT_ID = AccountId('acct-1');
const WALLET_ID = WalletId('wallet-1');
const ORIGIN = 'https://malicious-dapp.com';

const TESTNET = Cardano.NetworkId.Testnet;

const fixtureBaseAddress =
  Cardano.Address.fromBech32(FIXTURE_ADDRESS).asBase()!;
const OWN_PAYMENT_KEY_HASH = fixtureBaseAddress.getPaymentCredential().hash;

const ownMainnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  fixtureBaseAddress.getPaymentCredential(),
  fixtureBaseAddress.getStakeCredential(),
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

// Raw address bytes: the two differ ONLY in the network nibble of the header.
const TESTNET_ADDRESS_BYTES =
  Cardano.Address.fromBech32(FIXTURE_ADDRESS).toBytes();
const MAINNET_ADDRESS_BYTES =
  Cardano.Address.fromBech32(ownMainnetAddress).toBytes();

// ---------------------------------------------------------------------------
// Hand-rolled CBOR fragments. Everything below is built from hex, not from
// `Transaction.fromCore`, because the whole point is to produce bytes the SDK's
// own writer would never emit.
// ---------------------------------------------------------------------------
const INPUTS = `00d9010281825820${'9'.repeat(63)}100`; // key 0: one unresolvable outpoint
const FEE = '021a00030d40'; // key 2: 200_000
const COINS = '1a0ee6b280'; // 250_000_000
const REQUIRED_SIGNERS = `0ed9010281581c${OWN_PAYMENT_KEY_HASH}`; // key 14
const legacyOutput = (addressBytes: string): string =>
  `825839${addressBytes}${COINS}`;
const tx = (body: string): string => `84${body}a0f5f6`;

/**
 * The decisive artefact. A body whose network-bearing elements each appear
 * TWICE: mainnet first, testnet second.
 *
 * - key 15 (network id): `0f 01` then `0f 00`
 * - the single output is the Babbage map form with key 0 (address) twice:
 *   the mainnet address then the testnet one
 *
 * The SDK's decoder is last-wins for both, so `toCore()` describes a pure
 * testnet transaction. A first-wins decoder over the SAME bytes describes a
 * transaction that pays the account's MAINNET address and declares mainnet.
 */
const AMBIGUOUS_BODY =
  'a6' +
  INPUTS +
  `0181a3005839${MAINNET_ADDRESS_BYTES}005839${TESTNET_ADDRESS_BYTES}01${COINS}` +
  FEE +
  REQUIRED_SIGNERS +
  '0f01' +
  '0f00';
const AMBIGUOUS_TX = tx(AMBIGUOUS_BODY);

// ---------------------------------------------------------------------------
// An independent, deliberately first-occurrence-wins CBOR map reader. It stands
// in for "any other consumer of these bytes" -- the node that will validate the
// witness is a different decoder implementation from the one Lace inspects with.
// ---------------------------------------------------------------------------
const readFirstWinsMap = (hex: string): Record<number, string> => {
  const buf = Buffer.from(hex, 'hex');
  let p = 0;
  const head = (): { mt: number; value: bigint | null } => {
    const ib = buf[p++];
    const mt = ib >> 5;
    const ai = ib & 31;
    if (ai < 24) return { mt, value: BigInt(ai) };
    if (ai === 24) return { mt, value: BigInt(buf[p++]) };
    if (ai === 25) {
      const v = BigInt(buf.readUInt16BE(p));
      p += 2;
      return { mt, value: v };
    }
    if (ai === 26) {
      const v = BigInt(buf.readUInt32BE(p));
      p += 4;
      return { mt, value: v };
    }
    if (ai === 27) {
      const v = buf.readBigUInt64BE(p);
      p += 8;
      return { mt, value: v };
    }
    if (ai === 31) return { mt, value: null };
    throw new Error(`unsupported additional info ${ai}`);
  };
  const skip = (): void => {
    const h = head();
    switch (h.mt) {
      case 2:
      case 3: {
        p += Number(h.value);
        return;
      }
      case 4: {
        if (h.value === null) {
          while (buf[p] !== 0xff) skip();
          p++;
          return;
        }
        for (let index = 0; index < Number(h.value); index++) skip();
        return;
      }
      case 5: {
        if (h.value === null) {
          while (buf[p] !== 0xff) {
            skip();
            skip();
          }
          p++;
          return;
        }
        for (let index = 0; index < Number(h.value); index++) {
          skip();
          skip();
        }
        return;
      }
      case 6: {
        skip();
        return;
      }
      default:
        return;
    }
  };
  const grab = (): string => {
    const start = p;
    skip();
    return buf.subarray(start, p).toString('hex');
  };

  const map = head();
  const out: Record<number, string> = {};
  const isIndefinite = map.value === null;
  const count = isIndefinite ? Number.MAX_SAFE_INTEGER : Number(map.value);
  for (let index = 0; index < count; index++) {
    if (isIndefinite && buf[p] === 0xff) break;
    const key = Number(head().value);
    const value = grab();
    if (!(key in out)) out[key] = value;
  }
  return out;
};

/** The first address (key 0) of a first-wins reading of one Babbage map output. */
const firstWinsOutputAddress = (outputsCbor: string): string => {
  // `81` (array of 1) then the output itself.
  const output = outputsCbor.slice(2);
  const addressBytes = readFirstWinsMap(output)[0];
  // Strip the byte-string head (`5839`) the reader kept.
  return Cardano.Address.fromBytes(
    HexBlob(addressBytes.slice(4)),
  ).toBech32() as string;
};

// ---------------------------------------------------------------------------
// Real signing harness, copied from sign-tx-cross-network-extension.test.ts.
// @cardano-sdk/crypto is NOT mocked.
// ---------------------------------------------------------------------------
const allAddresses = [
  {
    accountId: ACCOUNT_ID,
    address: FIXTURE_ADDRESS,
    data: {
      type: AddressType.External,
      index: 0,
      networkId: 0,
      accountIndex: 0,
      rewardAccount: FIXTURE_REWARD_ACCOUNT,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    },
  },
];

const account = {
  accountId: ACCOUNT_ID,
  walletId: WALLET_ID,
  accountIndex: 0,
  accountType: 'InMemory',
  name: 'Test Account',
  blockchainName: 'Cardano' as const,
  blockchainSpecific: {
    accountIndex: 0,
    chainId: FIXTURE.chainId,
    extendedAccountPublicKey: FIXTURE.extendedAccountPublicKey,
  },
} as unknown as AnyAccount;

const wallet = {
  walletId: WALLET_ID,
  name: 'Test Wallet',
  type: WalletType.InMemory,
  metadata: {},
  accounts: [account],
} as unknown as AnyWallet;

const authSecret = ByteArray.fromUTF8(PASSWORD) as unknown as Parameters<
  typeof createCardanoKeyAgentFromEncryptedRoot
>[0]['authSecret'];

const withKeyAgent$: WithCardanoKeyAgent$ = use =>
  from(createCardanoKeyAgentFromEncryptedRoot({ ...FIXTURE, authSecret })).pipe(
    switchMap(use),
  );

const realSignerFactory = {
  canSign: () => true,
  createTransactionSigner: (context: CardanoTransactionSignerContext) =>
    withCollateralOwnershipGuard(
      new CardanoInMemoryTransactionSigner({
        withKeyAgent$,
        knownAddresses: context.knownAddresses,
        utxo: context.utxo,
        auth: { authenticate: () => of(true), accessAuthSecret: vi.fn() },
      }),
      context,
    ),
};

type SignTransaction = (
  txCbor: string,
  partialSign: boolean,
  origin: string,
) => Promise<string>;

const captureSignTransaction = (): SignTransaction => {
  const captured: {
    signTransaction?: SignTransaction;
    signingResult$?: Subject<SigningResult>;
  } = {};

  const connectCardanoDappConnector = vi.fn(
    (argument: {
      signTransaction: SignTransaction;
      signingResult$: Subject<SigningResult>;
    }) => {
      captured.signTransaction = argument.signTransaction;
      captured.signingResult$ = argument.signingResult$;
      return EMPTY;
    },
  );

  const actionObservables = {
    cardanoDappConnector: {
      confirmConnect$: new Subject<void>(),
      rejectConnect$: new Subject<void>(),
      confirmSignTx$: new Subject<void>(),
      rejectSignTx$: new Subject<void>(),
      confirmSignData$: new Subject<void>(),
      rejectSignData$: new Subject<void>(),
    },
    views: { viewDisconnected$: new Subject<{ payload: string }>() },
  };

  const stateObservables = {
    views: { selectOpenViews$: of([]) },
    appLock: { isUnlocked$: of(true) },
    dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
    cardanoContext: {
      selectChainId$: of(FIXTURE.chainId),
      selectAvailableAccountUtxos$: of({ [ACCOUNT_ID]: [] }),
      selectCollateralOwnershipUtxos$: of({ [ACCOUNT_ID]: [] }),
      selectAccountUnspendableUtxos$: of({}),
      selectAccountTransactionHistory$: of({}),
      selectRewardAccountDetails$: of({}),
    },
    addresses: { selectAllAddresses$: of(allAddresses) },
    cardanoDappConnector: {
      selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([account]),
      selectAll$: of([wallet]),
    },
  };

  const deps = {
    connectCardanoDappConnector,
    actions: {},
    authenticate: vi.fn().mockReturnValue(of(true)),
    accessAuthSecret: vi.fn(),
    cardanoProvider: {
      submitTx: vi.fn().mockReturnValue(of(Ok('submitted-tx-hash'))),
      resolveInput: vi.fn().mockReturnValue(of(undefined)),
    },
    signerFactory: realSignerFactory,
  };

  connectCardanoDappConnectorApi(
    actionObservables as unknown as ActionObservables<never>,
    stateObservables as unknown as StateObservables<never>,
    deps as unknown as SideEffectDependencies & WithLaceContext<never, never>,
  ).subscribe();

  captured.signingResult$!.subscribe();

  return captured.signTransaction!;
};

const decodedNetworkId = (txCbor: string): Cardano.NetworkId | undefined =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)).toCore().body
    .networkId;

describe('LW-15469 attack: decode differential in isCborBoundToNetwork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Question 1: is `toCore()` lossy relative to what the signer commits to?
  // -------------------------------------------------------------------------
  describe('1. lossy toCore()', () => {
    it('the signer commits to the WIRE bytes, never to the toCore() projection', () => {
      const parsed = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(AMBIGUOUS_TX),
      );
      // TransactionBody.toCbor() short-circuits to #originalBytes, and
      // hash() hashes toCbor() -- so the signed digest is over the attacker's
      // bytes verbatim, including every byte toCore() never looked at.
      expect(parsed.body().toCbor()).toBe(AMBIGUOUS_BODY);
      expect(parsed.toCbor()).toBe(AMBIGUOUS_TX);
    });

    it('drops unknown body map keys entirely while keeping them in the signed bytes', () => {
      // Key 99 carries a full mainnet output list. `default: reader.skipValue()`
      // (non-strict is the default, and the check passes no options).
      const body = `a5${INPUTS}0181${legacyOutput(
        TESTNET_ADDRESS_BYTES,
      )}${FEE}0f001863${`81${legacyOutput(MAINNET_ADDRESS_BYTES)}`}`;
      const cbor = tx(body);
      const core = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(cbor),
      ).toCore();

      expect(core.body.outputs.map(o => o.address)).toEqual([FIXTURE_ADDRESS]);
      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(true);
      // ... yet key 99 and its mainnet payload are inside the hashed body.
      expect(
        Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor))
          .body()
          .toCbor(),
      ).toContain(MAINNET_ADDRESS_BYTES);
    });

    it('drops unknown transaction-output map keys the same way', () => {
      const body = `a4${INPUTS}0181a3005839${TESTNET_ADDRESS_BYTES}01${COINS}045839${MAINNET_ADDRESS_BYTES}${FEE}0f00`;
      const cbor = tx(body);

      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(true);
      expect(
        Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor))
          .body()
          .toCbor(),
      ).toContain(MAINNET_ADDRESS_BYTES);
    });

    it('re-encoding from toCore() does NOT reproduce the input for any hostile shape', () => {
      const shapes: Record<string, string> = {
        canonical: tx(
          `a4${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f00`,
        ),
        duplicateNetworkId: tx(
          `a5${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f010f00`,
        ),
        duplicateOutputAddress: AMBIGUOUS_TX,
        unknownBodyKey: tx(
          `a5${INPUTS}0181${legacyOutput(
            TESTNET_ADDRESS_BYTES,
          )}${FEE}0f00181801`,
        ),
        indefiniteBodyMap: tx(
          `bf${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f00ff`,
        ),
      };

      const reproduced = Object.fromEntries(
        Object.entries(shapes).map(([name, cbor]) => [
          name,
          Serialization.Transaction.fromCore(
            Serialization.Transaction.fromCbor(
              Serialization.TxCBOR(cbor),
            ).toCore(),
          ).toCbor() === cbor,
        ]),
      );

      // Only the SDK's own canonical output survives the round trip. Every
      // other accepted shape decodes to a core value that re-encodes to
      // DIFFERENT bytes -- i.e. `toCore()` is not injective over what the
      // decoder accepts, and the difference is exactly what the check cannot see.
      expect(reproduced).toEqual({
        canonical: true,
        duplicateNetworkId: false,
        duplicateOutputAddress: false,
        unknownBodyKey: false,
        indefiniteBodyMap: false,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Question 2: ambiguous / hostile CBOR.
  // -------------------------------------------------------------------------
  describe('2. ambiguous and hostile CBOR', () => {
    it('refuses a duplicate map key in either order, though the decoder still resolves it LAST-wins', () => {
      const mainnetFirst = tx(
        `a5${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f010f00`,
      );
      const testnetFirst = tx(
        `a5${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f000f01`,
      );

      // The decoder differential is untouched — it is what the refusal exists
      // for, not something the refusal removed.
      expect(decodedNetworkId(mainnetFirst)).toBe(Cardano.NetworkId.Testnet);
      expect(decodedNetworkId(testnetFirst)).toBe(Cardano.NetworkId.Mainnet);

      expect(isCborBoundToNetwork(mainnetFirst, TESTNET)).toBe(false);
      expect(isCborBoundToNetwork(testnetFirst, TESTNET)).toBe(false);
    });

    it('refuses a non-canonical encoding of the SAME key, which comparing key BYTES would miss', () => {
      // `180f` is a non-canonical encoding of 15, which a strict CBOR decoder
      // rejects and this one folds onto key 15.
      const cbor = tx(
        `a5${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}180f010f00`,
      );
      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(false);
      expect(decodedNetworkId(cbor)).toBe(Cardano.NetworkId.Testnet);
    });

    it('refuses a duplicated address key INSIDE an output map', () => {
      const core = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(AMBIGUOUS_TX),
      ).toCore();
      expect(core.body.outputs).toHaveLength(1);
      expect(core.body.outputs[0].address).toBe(FIXTURE_ADDRESS);
      expect(core.body.networkId).toBe(Cardano.NetworkId.Testnet);
      expect(isCborBoundToNetwork(AMBIGUOUS_TX, TESTNET)).toBe(false);
    });

    it("refuses an output-map duplicate that is the body's ONLY one, so the verdict rests on the DEPTH of the walk", () => {
      // AMBIGUOUS_BODY states `0f` twice as well, so a walk that only read the
      // body's own key set would refuse it and the test above would pass for
      // the wrong reason. Here the body map's keys are distinct.
      const nestedOnly = tx(
        `a3${INPUTS}0181a3005839${MAINNET_ADDRESS_BYTES}005839${TESTNET_ADDRESS_BYTES}01${COINS}${FEE}`,
      );

      expect(
        Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(nestedOnly),
        ).toCore().body.outputs[0].address,
      ).toBe(FIXTURE_ADDRESS);
      expect(isCborBoundToNetwork(nestedOnly, TESTNET)).toBe(false);
    });

    it('a first-wins reader of the SAME bytes sees a mainnet transaction', () => {
      const first = readFirstWinsMap(AMBIGUOUS_BODY);
      expect(first[15]).toBe('01'); // network id = mainnet
      expect(firstWinsOutputAddress(first[1])).toBe(ownMainnetAddress);
    });

    it('duplicated OUTPUT LISTS are appended, not replaced — that direction is safe', () => {
      const cbor = tx(
        `a5${INPUTS}0181${legacyOutput(
          MAINNET_ADDRESS_BYTES,
        )}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f00`,
      );
      const core = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(cbor),
      ).toCore();
      expect(core.body.outputs.map(o => o.address)).toEqual([
        ownMainnetAddress,
        FIXTURE_ADDRESS,
      ]);
      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(false);
    });

    it('never lets a decoder exception escape — every malformed input refuses', () => {
      const hostile: Record<string, string> = {
        empty: '',
        nonHex: 'zzzz',
        truncated: AMBIGUOUS_TX.slice(0, 40),
        feeAsBignumTag: tx(
          `a4${INPUTS}0181${legacyOutput(
            TESTNET_ADDRESS_BYTES,
          )}02c24300030d400f00`,
        ),
        setTagOnOutputs: tx(
          `a4${INPUTS}01d9010281${legacyOutput(
            TESTNET_ADDRESS_BYTES,
          )}${FEE}0f00`,
        ),
        hugeArrayHeader: tx(
          `a5${INPUTS}0181${legacyOutput(
            TESTNET_ADDRESS_BYTES,
          )}${FEE}0f0018639bffffffffffffffff`,
        ),
        noEvidenceAtAll: tx(`a2${INPUTS}${FEE}`),
      };

      for (const [name, cbor] of Object.entries(hostile)) {
        expect(() => isCborBoundToNetwork(cbor, TESTNET), name).not.toThrow();
        expect(isCborBoundToNetwork(cbor, TESTNET), name).toBe(false);
      }
    });

    // The check calls `Serialization.Transaction.fromCbor(cbor)` with no
    // options, so the decoder runs non-strict. These two record exactly what
    // `{ strict: true }` would and would not buy.
    it('strict decoding WOULD refuse the unknown-key shapes', () => {
      const unknownKeyShapes = [
        tx(
          `a5${INPUTS}0181${legacyOutput(
            TESTNET_ADDRESS_BYTES,
          )}${FEE}0f001863${`81${legacyOutput(MAINNET_ADDRESS_BYTES)}`}`,
        ),
        tx(
          `a4${INPUTS}0181a3005839${TESTNET_ADDRESS_BYTES}01${COINS}045839${MAINNET_ADDRESS_BYTES}${FEE}0f00`,
        ),
      ];

      for (const cbor of unknownKeyShapes) {
        expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(true);
        expect(() =>
          Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor), {
            strict: true,
          }).toCore(),
        ).toThrow(/Unknown transaction (body|output) map key/);
      }
    });

    it('refuses deep nesting under an unknown body key, which the decoder happily skips', () => {
      // The decoder does not descend into a key it does not know, so nesting
      // there is free for an attacker and unbounded.
      const deeplyNested = tx(
        `a5${INPUTS}0181${legacyOutput(
          TESTNET_ADDRESS_BYTES,
        )}${FEE}0f001863${'9f'.repeat(500)}${'ff'.repeat(500)}`,
      );

      expect(
        Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(deeplyNested),
        ).toCbor(),
      ).toBe(deeplyNested);
      expect(isCborBoundToNetwork(deeplyNested, TESTNET)).toBe(false);
    });

    it('strict decoding would NOT refuse the duplicate-key shapes', () => {
      expect(
        Serialization.Transaction.fromCbor(Serialization.TxCBOR(AMBIGUOUS_TX), {
          strict: true,
        }).toCore().body.networkId,
      ).toBe(Cardano.NetworkId.Testnet);
    });

    it('accepts shapes an SDK writer would never emit, and returns them verbatim', () => {
      const accepted: Record<string, string> = {
        indefiniteBodyMap: tx(
          `bf${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f00ff`,
        ),
        indefiniteOutputsArray: tx(
          `a4${INPUTS}019f${legacyOutput(TESTNET_ADDRESS_BYTES)}ff${FEE}0f00`,
        ),
        trailingGarbage: `${tx(
          `a4${INPUTS}0181${legacyOutput(TESTNET_ADDRESS_BYTES)}${FEE}0f00`,
        )}ffffffff`,
      };

      for (const [name, cbor] of Object.entries(accepted)) {
        expect(isCborBoundToNetwork(cbor, TESTNET), name).toBe(true);
        expect(
          Serialization.Transaction.fromCbor(
            Serialization.TxCBOR(cbor),
          ).toCbor(),
          name,
        ).toBe(cbor);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Question 3: does the real signing path mint a witness over bytes whose
  // network the check misread? It refuses before it reaches a key, and on the
  // NETWORK rule rather than on unresolvable inputs.
  // -------------------------------------------------------------------------
  describe('3. end-to-end through the real signing path', () => {
    it.each([true, false])(
      'refuses the ambiguous body with partialSign=%s, and on the NETWORK rule',
      async partialSign => {
        const signTransaction = captureSignTransaction();
        await expect(
          signTransaction(AMBIGUOUS_TX, partialSign, ORIGIN),
        ).rejects.toThrow(/^Part of the transaction could not be read/);
      },
      30_000,
    );

    it('the refused bytes, read first-wins, are a mainnet transaction paying the account', () => {
      // Why the refusal is not pedantry: a witness would have covered blake2b
      // over these bytes verbatim, and this is what they say.
      const first = readFirstWinsMap(AMBIGUOUS_BODY);
      expect(first[15]).toBe('01');
      expect(firstWinsOutputAddress(first[1])).toBe(ownMainnetAddress);
    });
  });
});
