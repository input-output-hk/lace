/* eslint-disable */
// ADVERSARIAL PROBE: address-form and encoding evasion against the
// network-binding rule. Every case below drives the real production
// signTransaction wrapper with real Ed25519 signing.
import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
  withCollateralOwnershipGuard,
} from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes, Ok } from '@lace-lib/util';
import { HexBlob } from '@cardano-sdk/util';
import { EMPTY, from, of, Subject, switchMap } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectCardanoDappConnectorApi } from '../src/browser/store/side-effects';
import { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import { isBoundToNetwork } from './support/network-binding-verdict';

import type { SigningResult } from '../src/browser/store/util';
import type { SenderContext } from '../src/browser/types';
import type { CardanoDappConnectorApiDependencies } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import type { Ed25519KeyHashHex, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
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
import type { Runtime } from 'webextension-polyfill';

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

const fixtureBaseAddress =
  Cardano.Address.fromBech32(FIXTURE_ADDRESS).asBase()!;
const ownPaymentCredential = fixtureBaseAddress.getPaymentCredential();
const ownStakeCredential = fixtureBaseAddress.getStakeCredential();
const ownPaymentKeyHash =
  ownPaymentCredential.hash as unknown as Ed25519KeyHashHex;

const attackerCredential = {
  hash: Hash28ByteBase16('a'.repeat(56)),
  type: Cardano.CredentialType.KeyHash,
};
const attackerScriptCredential = {
  hash: Hash28ByteBase16('b'.repeat(56)),
  type: Cardano.CredentialType.ScriptHash,
};

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

const captureSignTransaction = (
  localUtxos: Cardano.Utxo[] = [],
): {
  signTransaction: SignTransaction;
  createWalletApi: () => CardanoDappConnectorApi;
} => {
  const captured: {
    signTransaction?: SignTransaction;
    signingResult$?: Subject<SigningResult>;
    connectorParams?: CardanoDappConnectorApiDependencies;
  } = {};

  const connectCardanoDappConnector = vi.fn(
    (argument: {
      signTransaction: SignTransaction;
      signingResult$: Subject<SigningResult>;
    }) => {
      captured.signTransaction = argument.signTransaction;
      captured.signingResult$ = argument.signingResult$;
      captured.connectorParams =
        argument as unknown as CardanoDappConnectorApiDependencies;
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
      selectAvailableAccountUtxos$: of({ [ACCOUNT_ID]: localUtxos }),
      selectCollateralOwnershipUtxos$: of({ [ACCOUNT_ID]: localUtxos }),
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

  captured.signingResult$!.subscribe(() => {});

  return {
    signTransaction: captured.signTransaction!,
    createWalletApi: () =>
      new CardanoDappConnectorApi({
        ...captured.connectorParams!,
        userConfirmationRequest: async () => ({
          outcome: 'confirmed' as const,
        }),
      }),
  };
};

// ---------------------------------------------------------------------------
// tx construction helpers
// ---------------------------------------------------------------------------

const ATTACK_INPUT = {
  txId: Cardano.TransactionId(`${'9'.repeat(63)}1`),
  index: 0,
};

const buildTx = (body: Partial<Cardano.TxBody>): string =>
  Serialization.Transaction.fromCore({
    id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
    body: {
      inputs: [ATTACK_INPUT],
      outputs: [],
      fee: 200_000n,
      requiredExtraSignatures: [ownPaymentKeyHash],
      ...body,
    } as Cardano.TxBody,
    witness: { signatures: new Map() },
  }).toCbor();

const bech32 = (a: { toAddress: () => Cardano.Address }): string =>
  a.toAddress().toBech32();

const base = (n: Cardano.NetworkId, p = attackerCredential) =>
  bech32(
    Cardano.BaseAddress.fromCredentials(n, p, attackerCredential),
  ) as Cardano.PaymentAddress;
const enterprise = (n: Cardano.NetworkId, p = attackerCredential) =>
  bech32(
    Cardano.EnterpriseAddress.fromCredentials(n, p),
  ) as Cardano.PaymentAddress;
const pointer = (n: Cardano.NetworkId) =>
  bech32(
    Cardano.PointerAddress.fromCredentials(n, attackerCredential, {
      slot: 1n,
      txIndex: Cardano.TxIndex(2),
      certIndex: Cardano.CertIndex(3),
    }),
  ) as Cardano.PaymentAddress;
const reward = (n: Cardano.NetworkId, p = attackerCredential) =>
  bech32(Cardano.RewardAddress.fromCredentials(n, p)) as Cardano.RewardAccount;

const ownMainnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  ownPaymentCredential,
  ownStakeCredential,
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

// raw-byte address: bypasses every SDK constructor so the header nibble is ours
const rawAddressBech32 = (bytes: Buffer): string =>
  Cardano.Address.fromBytes(HexBlob.fromBytes(bytes)).toBech32();

const BYRON_ROOT = Hash28ByteBase16('c'.repeat(56));

const byronAddress = (attrs: { magic?: number }): string =>
  Cardano.ByronAddress.fromCredentials(BYRON_ROOT, attrs, 0)
    .toAddress()
    .toBase58();

// CRC-32 (IEEE, reflected) -- needed to hand-build Byron bytes the SDK's own
// packParts refuses to emit (it drops a falsy `magic`).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf: Buffer): number => {
  let c = 0xff_ff_ff_ff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xff_ff_ff_ff) >>> 0;
};

/** Byron address raw bytes with `magic` written unconditionally (even 0). */
const byronBytes = (magic: number | undefined): Buffer => {
  const w = new Serialization.CborWriter();
  w.writeStartArray(3);
  w.writeByteString(Buffer.from(BYRON_ROOT, 'hex'));
  w.writeStartMap(magic === undefined ? 0 : 1);
  if (magic !== undefined) {
    w.writeInt(2);
    w.writeByteString(new Serialization.CborWriter().writeInt(magic).encode());
  }
  w.writeInt(0);
  const inner = Buffer.from(w.encodeAsHex(), 'hex');
  const outer = new Serialization.CborWriter();
  outer.writeStartArray(2);
  outer.writeTag(24);
  outer.writeByteString(inner);
  outer.writeInt(crc32(inner));
  return Buffer.from(outer.encode());
};

const cborByteStringHeader = (length: number): string =>
  length < 24
    ? (0x40 + length).toString(16).padStart(2, '0')
    : length < 256
    ? `58${length.toString(16).padStart(2, '0')}`
    : `59${length.toString(16).padStart(4, '0')}`;

/** Replace one CBOR byte string inside a serialized tx, byte for byte. */
const spliceByteString = (
  txCbor: string,
  oldBytes: Buffer,
  newBytes: Buffer,
): string => {
  const needle =
    cborByteStringHeader(oldBytes.length) + oldBytes.toString('hex');
  if (!txCbor.includes(needle))
    throw new Error(`splice target not found: ${needle}`);
  return txCbor.replace(
    needle,
    cborByteStringHeader(newBytes.length) + newBytes.toString('hex'),
  );
};

/** (key, encodedValue) pairs of a serialized tx body map, in wire order. */
const bodyEntries = (txCbor: string): [bigint, string][] => {
  const bodyHex = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(txCbor),
  )
    .body()
    .toCbor();
  const reader = new Serialization.CborReader(HexBlob(bodyHex));
  reader.readStartMap();
  const entries: [bigint, string][] = [];
  while (reader.peekState() !== Serialization.CborReaderState.EndMap)
    entries.push([
      reader.readInt(),
      Buffer.from(reader.readEncodedValue()).toString('hex'),
    ]);
  return entries;
};

const assembleBody = (entries: [bigint, string][]): string => {
  const w = new Serialization.CborWriter();
  w.writeStartMap(entries.length);
  for (const [key, value] of entries) {
    w.writeInt(key);
    w.writeEncodedValue(Buffer.from(value, 'hex'));
  }
  return w.encodeAsHex();
};

/**
 * `firstTx`'s body with `secondTx`'s entry for `key` inserted straight after
 * its own -- a body whose CBOR states that field twice.
 */
const withDuplicateBodyKey = (
  firstTx: string,
  secondTx: string,
  key: bigint,
): string => {
  const entries = bodyEntries(firstTx);
  const second = bodyEntries(secondTx).find(([k]) => k === key);
  const at = entries.findIndex(([k]) => k === key);
  if (!second || at < 0) throw new Error(`key ${key} missing`);
  entries.splice(at + 1, 0, second);
  const originalBody = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(firstTx),
  )
    .body()
    .toCbor();
  return firstTx.replace(originalBody, assembleBody(entries));
};

// ---------------------------------------------------------------------------
// outcome helpers -- "a real witness came back" is the only evidence of bypass
// ---------------------------------------------------------------------------

type Outcome =
  | { kind: 'refused'; code?: string; name?: string; message: string }
  | {
      kind: 'signed';
      witnesses: {
        vkeyHash: string;
        isOwnPaymentKey: boolean;
        verifies: boolean;
      }[];
    };

const attempt = async (
  signTransaction: SignTransaction,
  txCbor: string,
  partialSign = true,
): Promise<Outcome> => {
  let witnessSetCbor: string;
  try {
    witnessSetCbor = await signTransaction(txCbor, partialSign, ORIGIN);
  } catch (error) {
    const error_ = error as { name?: string; code?: string; message?: string };
    return {
      kind: 'refused',
      name: error_?.name,
      code: error_?.code,
      message: String(error_?.message ?? error),
    };
  }

  const bodyHash = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(txCbor),
  ).getId();
  const signatures =
    Serialization.TransactionWitnessSet.fromCbor(
      HexBlob(witnessSetCbor),
    ).toCore().signatures ?? new Map();

  return {
    kind: 'signed',
    witnesses: [...signatures].map(([vkey, signature]) => {
      const publicKey = Crypto.Ed25519PublicKey.fromHex(vkey);
      return {
        vkeyHash: publicKey.hash().hex(),
        isOwnPaymentKey:
          publicKey.hash().hex().toLowerCase() ===
          String(ownPaymentKeyHash).toLowerCase(),
        verifies: publicKey.verify(
          Crypto.Ed25519Signature.fromHex(signature),
          HexBlob(bodyHash),
        ),
      };
    }),
  };
};

const log = (label: string, outcome: Outcome): Outcome => {
  console.log(`[${label}] ${JSON.stringify(outcome)}`);
  return outcome;
};

const networkIdOf = (address: string): number | 'unreadable' => {
  const id = Cardano.Address.fromString(address)?.getNetworkId();
  return id === undefined ? 'unreadable' : id;
};

// ---------------------------------------------------------------------------

describe('LW-15469 adversarial: address-form and encoding evasion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- positive control ------------------------------------------------------
  // Without this, every "refused" below could be a broken harness.
  it('CONTROL: a testnet-bound body DOES yield a real, verifying own-key witness', async () => {
    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'CONTROL testnet',
      await attempt(
        signTransaction,
        buildTx({
          outputs: [
            {
              address: base(Cardano.NetworkId.Testnet),
              value: { coins: 250_000_000n },
            },
          ],
        }),
      ),
    );

    expect(outcome.kind).toBe('signed');
    if (outcome.kind !== 'signed') return;
    expect(outcome.witnesses).toHaveLength(1);
    expect(outcome.witnesses[0].isOwnPaymentKey).toBe(true);
    expect(outcome.witnesses[0].verifies).toBe(true);
  });

  // -- Byron / bootstrap -----------------------------------------------------
  it('Byron mainnet (no protocol-magic attribute) is refused', async () => {
    const address = byronAddress({}) as Cardano.PaymentAddress;
    expect(networkIdOf(address)).toBe(Cardano.NetworkId.Mainnet);

    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'byron no-magic',
      await attempt(
        signTransaction,
        buildTx({ outputs: [{ address, value: { coins: 250_000_000n } }] }),
      ),
    );
    expect(outcome.kind).toBe('refused');
  });

  it('Byron carrying mainnet PROTOCOL MAGIC reads as testnet and IS signed -- but the same attribute makes it a bootstrap-testnet address on chain', async () => {
    const address = byronAddress({
      magic: 764_824_073,
    }) as Cardano.PaymentAddress;
    // getNetworkId() keys off attribute PRESENCE, not its value:
    expect(networkIdOf(address)).toBe(Cardano.NetworkId.Testnet);

    const txCbor = buildTx({
      outputs: [{ address, value: { coins: 250_000_000n } }],
    });
    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'byron magic=mainnet-magic',
      await attempt(signTransaction, txCbor),
    );

    expect(outcome.kind).toBe('signed');

    // Why it is NOT a mainnet payoff: the bytes that were signed still carry
    // attribute key 2, which is exactly what a ledger reads as NetworkTestnet.
    const signedOut = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(txCbor),
    )
      .body()
      .outputs()[0]
      .address();
    expect(signedOut.asByron()!.getAttributes().magic).toBe(764_824_073);
  });

  it('Byron with magic=0: SDK props say testnet, the toCore() re-render says mainnet -- refused (re-render, not signed bytes, is what the rule classifies)', async () => {
    const withMagic0 = byronBytes(0);
    const withoutMagic = byronBytes(undefined);

    // The differential, measured directly:
    expect(
      Cardano.Address.fromBytes(HexBlob.fromBytes(withMagic0)).getNetworkId(),
    ).toBe(Cardano.NetworkId.Testnet);
    expect(
      networkIdOf(
        Cardano.Address.fromBytes(HexBlob.fromBytes(withMagic0)).toBase58(),
      ),
    ).toBe(Cardano.NetworkId.Mainnet);

    const txCbor = spliceByteString(
      buildTx({
        outputs: [
          {
            address: byronAddress({}) as Cardano.PaymentAddress,
            value: { coins: 250_000_000n },
          },
        ],
      }),
      withoutMagic,
      withMagic0,
    );
    // the spliced bytes really do decode to the magic-0 form
    expect(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor))
        .body()
        .outputs()[0]
        .address()
        .getNetworkId(),
    ).toBe(Cardano.NetworkId.Testnet);

    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'byron magic=0 spliced',
      await attempt(signTransaction, txCbor),
    );
    expect(outcome.kind).toBe('refused');
  });

  // -- Shelley address types 4,5,6,7,14,15 -----------------------------------
  it.each([
    ['enterprise key (type 6)', enterprise(Cardano.NetworkId.Mainnet)],
    [
      'enterprise script (type 7)',
      enterprise(Cardano.NetworkId.Mainnet, attackerScriptCredential),
    ],
    ['pointer key (type 4)', pointer(Cardano.NetworkId.Mainnet)],
    [
      'base script-payment (type 1)',
      base(Cardano.NetworkId.Mainnet, attackerScriptCredential),
    ],
    ['own mainnet base (type 0)', ownMainnetAddress],
  ])('mainnet output in %s form is refused', async (label, address) => {
    expect(networkIdOf(address)).toBe(Cardano.NetworkId.Mainnet);
    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      `mainnet output ${label}`,
      await attempt(
        signTransaction,
        buildTx({
          outputs: [
            {
              address: address as Cardano.PaymentAddress,
              value: { coins: 250_000_000n },
            },
          ],
        }),
      ),
    );
    expect(outcome.kind).toBe('refused');
  });

  it.each([
    ['reward key (type 14)', reward(Cardano.NetworkId.Mainnet)],
    [
      'reward script (type 15)',
      reward(Cardano.NetworkId.Mainnet, attackerScriptCredential),
    ],
  ])(
    'mainnet %s in withdrawals is refused even beside a testnet output decoy',
    async (label, stakeAddress) => {
      expect(networkIdOf(stakeAddress)).toBe(Cardano.NetworkId.Mainnet);
      const { signTransaction } = captureSignTransaction();
      const outcome = log(
        `mainnet withdrawal ${label}`,
        await attempt(
          signTransaction,
          buildTx({
            outputs: [
              {
                address: base(Cardano.NetworkId.Testnet),
                value: { coins: 1_000_000n },
              },
            ],
            withdrawals: [
              {
                stakeAddress: stakeAddress as Cardano.RewardAccount,
                quantity: 1n,
              },
            ],
          }),
        ),
      );
      expect(outcome.kind).toBe('refused');
    },
  );

  it('mixed body: testnet decoy output + mainnet payoff output is refused', async () => {
    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'mixed decoy+payoff',
      await attempt(
        signTransaction,
        buildTx({
          outputs: [
            {
              address: base(Cardano.NetworkId.Testnet),
              value: { coins: 1_000_000n },
            },
            {
              address: enterprise(
                Cardano.NetworkId.Mainnet,
              ) as Cardano.PaymentAddress,
              value: { coins: 250_000_000n },
            },
          ],
        }),
      ),
    );
    expect(outcome.kind).toBe('refused');
  });

  // -- header-nibble / unreadable forms --------------------------------------
  it('base address with an out-of-range network nibble (2) is refused', async () => {
    const cred = Buffer.from('aa'.repeat(28), 'hex');
    const address = rawAddressBech32(
      Buffer.concat([Buffer.from([0x02]), cred, cred]),
    );
    expect(networkIdOf(address)).toBe(2);

    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'nibble=2',
      await attempt(
        signTransaction,
        buildTx({
          outputs: [
            {
              address: address as Cardano.PaymentAddress,
              value: { coins: 250_000_000n },
            },
          ],
        }),
      ),
    );
    expect(outcome.kind).toBe('refused');
  });

  it('an output address whose type nibble is undefined (9) is refused by BOTH entry points', async () => {
    const cred = Buffer.from('aa'.repeat(28), 'hex');
    const good = Buffer.concat([Buffer.from([0x60]), cred]); // enterprise testnet
    const bad = Buffer.concat([Buffer.from([0x90]), cred]); // type 9 -- no decoder
    const txCbor = spliceByteString(
      buildTx({
        outputs: [
          {
            address: rawAddressBech32(good) as Cardano.PaymentAddress,
            value: { coins: 250_000_000n },
          },
        ],
      }),
      good,
      bad,
    );
    expect(() =>
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)),
    ).toThrow();

    const { signTransaction, createWalletApi } = captureSignTransaction();
    const viaWrapper = log(
      'undecodable via wrapper',
      await attempt(signTransaction, txCbor),
    );
    expect(viaWrapper.kind).toBe('refused');

    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };
    let apiError:
      | { name?: string; code?: string; message?: string }
      | undefined;
    try {
      await createWalletApi().signTx(txCbor, true, sender);
    } catch (error) {
      apiError = error as { name?: string; code?: string; message?: string };
    }
    console.log(
      `[undecodable via CIP-30 API] ${JSON.stringify({
        name: apiError?.name,
        code: apiError?.code,
        message: apiError?.message,
      })}`,
    );
    expect(apiError).toBeDefined();
  });

  // -- the "at least one element must speak" half ----------------------------
  it('a body with no network-bearing element at all is refused', async () => {
    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'no evidence',
      await attempt(signTransaction, buildTx({ outputs: [] })),
    );
    expect(outcome.kind).toBe('refused');
  });

  // -- walk completeness -----------------------------------------------------
  it('REGRESSION: a mainnet reward account inside a treasury-withdrawals governance action IS visited by the walk, and refuses', async () => {
    const mainnetTarget = reward(Cardano.NetworkId.Mainnet);
    const txCbor = buildTx({
      outputs: [
        {
          address: base(Cardano.NetworkId.Testnet),
          value: { coins: 1_000_000n },
        },
      ],
      proposalProcedures: [
        {
          deposit: 100_000_000n,
          rewardAccount: reward(Cardano.NetworkId.Testnet),
          anchor: {
            url: 'https://x',
            dataHash: Crypto.Hash32ByteBase16('0'.repeat(64)),
          },
          governanceAction: {
            __typename:
              Cardano.GovernanceActionType.treasury_withdrawals_action,
            withdrawals: new Set([
              { rewardAccount: mainnetTarget, coin: 1_000_000n },
            ]),
            policyHash: null,
          },
        },
      ] as unknown as Cardano.TxBody['proposalProcedures'],
    });

    const body = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(txCbor),
    ).toCore().body;
    // the mainnet reward account survives the round trip ...
    const action = body.proposalProcedures![0].governanceAction as {
      withdrawals: Set<{ rewardAccount: string }>;
    };
    const targets = [...action.withdrawals].map(w => w.rewardAccount);
    console.log(`[gov withdrawal targets] ${JSON.stringify(targets)}`);
    expect(targets).toContain(mainnetTarget);
    // ... and the rule now sees it disagree with the served network
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);

    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'gov treasury-withdrawal',
      await attempt(signTransaction, txCbor),
    );
    expect(outcome.kind).toBe('refused');
  });

  // -- CBOR encoding evasion -------------------------------------------------
  it('ENCODING: a duplicated network_id key (15) -- mainnet first, testnet second -- is refused', async () => {
    const withMainnetId = buildTx({
      outputs: [],
      networkId: Cardano.NetworkId.Mainnet,
    });
    expect(withMainnetId.includes('0f01')).toBe(true);

    // bump the body map size by one, then append a second `15: 0` entry
    const bodyMapHeader = Number.parseInt(withMainnetId.slice(2, 4), 16);
    expect(bodyMapHeader).toBeGreaterThanOrEqual(0xa0);
    expect(bodyMapHeader).toBeLessThan(0xb7);
    const txCbor =
      withMainnetId.slice(0, 2) +
      (bodyMapHeader + 1).toString(16) +
      withMainnetId.slice(4).replace('0f01', '0f010f00');

    const decoded = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(txCbor),
    ).toCore().body;
    console.log(`[dup network_id] decoded networkId = ${decoded.networkId}`);
    expect(decoded.networkId).toBe(Cardano.NetworkId.Testnet);
    expect(isBoundToNetwork(decoded, Cardano.NetworkId.Testnet)).toBe(true);

    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'dup network_id',
      await attempt(signTransaction, txCbor),
    );
    expect(outcome.kind).toBe('refused');
  });

  // Three keys with DIFFERENT duplicate-key semantics in the decoder (push for
  // 1, replace for 5 and 16). All three must refuse, so the verdict cannot
  // depend on which semantics the decoder happens to apply.
  it.each([
    ['1 = outputs', 1n],
    ['16 = collateral_return', 16n],
    ['5 = withdrawals', 5n],
  ])(
    'ENCODING: duplicated body key %s -- mainnet first, testnet second -- is refused',
    async (label, key) => {
      const mainnetTx = buildTx(
        key === 1n
          ? {
              outputs: [
                {
                  address: enterprise(
                    Cardano.NetworkId.Mainnet,
                  ) as Cardano.PaymentAddress,
                  value: { coins: 250_000_000n },
                },
              ],
            }
          : key === 16n
          ? {
              outputs: [],
              collateralReturn: {
                address: enterprise(
                  Cardano.NetworkId.Mainnet,
                ) as Cardano.PaymentAddress,
                value: { coins: 250_000_000n },
              },
            }
          : {
              outputs: [],
              withdrawals: [
                {
                  stakeAddress: reward(Cardano.NetworkId.Mainnet),
                  quantity: 5_000_000n,
                },
              ],
            },
      );
      const testnetTx = buildTx(
        key === 1n
          ? {
              outputs: [
                {
                  address: base(Cardano.NetworkId.Testnet),
                  value: { coins: 1_000_000n },
                },
              ],
            }
          : key === 16n
          ? {
              outputs: [],
              collateralReturn: {
                address: base(Cardano.NetworkId.Testnet),
                value: { coins: 1_000_000n },
              },
            }
          : {
              outputs: [],
              withdrawals: [
                {
                  stakeAddress: reward(Cardano.NetworkId.Testnet),
                  quantity: 1n,
                },
              ],
            },
      );

      const txCbor = withDuplicateBodyKey(mainnetTx, testnetTx, key);
      const decoded = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(txCbor),
      ).toCore().body;
      console.log(
        `[dup key ${label}] decoded = ${JSON.stringify(
          {
            outputs: decoded.outputs.map(o => o.address),
            collateralReturn: decoded.collateralReturn?.address,
            withdrawals: decoded.withdrawals?.map(w => w.stakeAddress),
          },
          (_k, v) => (typeof v === 'bigint' ? String(v) : v),
        )}`,
      );

      // The mainnet element is still in the bytes that get hashed and signed.
      const mainnetBytes = Cardano.Address.fromString(
        key === 5n
          ? reward(Cardano.NetworkId.Mainnet)
          : enterprise(Cardano.NetworkId.Mainnet),
      )!.toBytes();
      expect(txCbor).toContain(String(mainnetBytes));

      const { signTransaction } = captureSignTransaction();
      const outcome = log(
        `dup key ${label}`,
        await attempt(signTransaction, txCbor),
      );
      expect(outcome.kind).toBe('refused');
    },
  );

  // -- network MAGIC is not bound --------------------------------------------
  it('GAP: the rule binds NetworkId only -- a foreign testnet body is signed while the wallet is on preprod (magic 1)', async () => {
    expect(FIXTURE.chainId.networkMagic).toBe(1);
    const { signTransaction } = captureSignTransaction();
    const outcome = log(
      'cross-testnet',
      await attempt(
        signTransaction,
        buildTx({
          outputs: [
            {
              address: base(Cardano.NetworkId.Testnet),
              value: { coins: 250_000_000n },
            },
          ],
        }),
      ),
    );
    expect(outcome.kind).toBe('signed');
  });
});
