/* eslint-disable */
// ADVERSARIAL PROBE: the two recent additions to the
// `networkEvidence` walk in
// src/common/store/utils/network-binding.ts --
//   (a) one level of recursion into `body.subTransactions`, justified by the
//       claim that `SubTransactionBody` omits `subTransactions`;
//   (b) reading the payout `rewardAccount`s of a `treasury_withdrawals_action`,
//       on the claim that it is the only governance action with a
//       network-bearing field.
//
// Both claims are attacked here against the SDK's own SERIALIZER, not against
// the source comments: a TypeScript `Omit` is not a wire-format guarantee, so
// every depth claim below is decided by what `Transaction.fromCbor` /
// `fromCore` actually do with the bytes.
//
// NOTHING in this file pins defective behaviour as "expected". Every test
// either proves a refusal, or records a field that carries no network at all
// (a credential, a hash) and therefore cannot hide a payoff. Where a test
// records something that merely rides an existing, already-reported gap
// (a 1-lovelace testnet decoy output), it says so in a comment above it.
import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
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
import { TxSignErrorCode } from '../src/common/api-error';
import {
  cborNetworkBindingRefusal,
  networkBindingRefusal,
} from '../src/common/store/utils/network-binding';
import {
  isBoundToNetwork,
  isCborBoundToNetwork,
} from './support/network-binding-verdict';

import type { SigningResult } from '../src/browser/store/util';
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
const ownPaymentKeyHash = fixtureBaseAddress.getPaymentCredential()
  .hash as unknown as Ed25519KeyHashHex;

const keyHashCredential = (byte: string) => ({
  hash: Hash28ByteBase16(byte.repeat(56)),
  type: Cardano.CredentialType.KeyHash,
});

const addressOn = (
  networkId: Cardano.NetworkId,
  payment: string,
  stake: string,
) =>
  Cardano.BaseAddress.fromCredentials(
    networkId,
    keyHashCredential(payment),
    keyHashCredential(stake),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

const rewardAccountOn = (networkId: Cardano.NetworkId, payment: string) =>
  Cardano.RewardAddress.fromCredentials(networkId, keyHashCredential(payment))
    .toAddress()
    .toBech32() as Cardano.RewardAccount;

/** The payoff destination: an address only the attacker controls, on MAINNET. */
const attackerMainnetAddress = addressOn(Cardano.NetworkId.Mainnet, 'a', 'b');
/** The decoy: a testnet address of trivial value. */
const decoyTestnetAddress = addressOn(Cardano.NetworkId.Testnet, 'c', 'd');
const attackerMainnetRewardAccount = rewardAccountOn(
  Cardano.NetworkId.Mainnet,
  'a',
);
const decoyTestnetRewardAccount = rewardAccountOn(
  Cardano.NetworkId.Testnet,
  'c',
);

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

const captureSignTransaction = (): { signTransaction: SignTransaction } => {
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

  captured.signingResult$!.subscribe(() => undefined);

  return { signTransaction: captured.signTransaction! };
};

const VICTIM_INPUT = {
  txId: Cardano.TransactionId(`${'9'.repeat(63)}1`),
  index: 0,
};

const bodyBase = {
  inputs: [VICTIM_INPUT],
  outputs: [] as Cardano.TxOut[],
  fee: 200_000n,
  requiredExtraSignatures: [ownPaymentKeyHash],
};

const txCborOf = (body: Partial<Cardano.TxBody>): string =>
  Serialization.Transaction.fromCore({
    id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
    body: { ...bodyBase, ...body } as Cardano.TxBody,
    witness: { signatures: new Map() },
  }).toCbor();

const coreBodyOf = (txCbor: string): Cardano.TxBody =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)).toCore()
    .body;

const witnessFacts = (txCbor: string, witnessSetCbor: string) => {
  const vkeys = Serialization.TransactionWitnessSet.fromCbor(
    HexBlob(witnessSetCbor),
  ).vkeys();
  const witnesses = (vkeys?.values() ?? []).map(w => w.toCore());
  const bodyHash = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(txCbor),
  )
    .body()
    .hash();
  return witnesses.map(([vkey, signature]) => {
    const publicKey = Crypto.Ed25519PublicKey.fromHex(vkey);
    return {
      keyHash: publicKey.hash().hex() as string,
      verifiesAgainstBodyHash: publicKey.verify(
        Crypto.Ed25519Signature.fromHex(signature),
        HexBlob(bodyHash as unknown as string),
      ),
    };
  });
};

/** Appends one extra key/value pair to a definite-length CBOR map, in hex. */
const appendMapEntry = (mapHex: string, entryHex: string): string => {
  const header = Number.parseInt(mapHex.slice(0, 2), 16);
  if (header >= 0xa0 && header <= 0xb7) {
    const size = header - 0xa0 + 1;
    const newHeader =
      size <= 23
        ? (0xa0 + size).toString(16).padStart(2, '0')
        : `b8${size.toString(16).padStart(2, '0')}`;
    return `${newHeader}${mapHex.slice(2)}${entryHex}`;
  }
  if (header === 0xb8) {
    const size = Number.parseInt(mapHex.slice(2, 4), 16) + 1;
    return `b8${size.toString(16).padStart(2, '0')}${mapHex.slice(
      4,
    )}${entryHex}`;
  }
  throw new Error(`Unsupported CBOR map header ${header.toString(16)}`);
};

const hexOf = (value: { toString(): string }): string =>
  value.toString() as string;

const jsonDump = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    typeof v === 'bigint' ? v.toString() : v instanceof Set ? [...v] : v,
  );

/** Any Shelley-era or Byron bech32/base58 address string. */
const ANY_ADDRESS = /(addr|addr_test|stake|stake_test)1[\da-z]{20,}/;

const subTxOf = (
  body: Partial<Cardano.SubTransactionBody>,
): Cardano.SubTransaction =>
  ({
    body: {
      inputs: [VICTIM_INPUT],
      outputs: [],
      ...body,
    },
    witness: { signatures: new Map() },
  } as unknown as Cardano.SubTransaction);

const EMPTY_WITNESS_SET_HEX = hexOf(
  Serialization.TransactionWitnessSet.fromCore({
    signatures: new Map(),
  } as unknown as Cardano.Witness).toCbor(),
);

describe('LW-15469 adversarial round 3: subTransactions depth and treasury withdrawals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // CANARIES. Without these a green file proves only that the harness
  // is broken.
  // ================================================================
  it('canary: a bare mainnet output is refused', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [
        { address: attackerMainnetAddress, value: { coins: 250_000_000n } },
      ],
    });
    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  it('canary: a legitimate testnet body still signs', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
    });
    expect(
      witnessFacts(txCbor, await signTransaction(txCbor, true, ORIGIN)),
    ).toEqual([{ keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true }]);
  });

  // ================================================================
  // DEPTH. "SubTransactionBody omits subTransactions, so one level is
  // the whole depth" is a TYPE claim. These decide it on the WIRE.
  // ================================================================

  it('DEPTH/wire: hand-built CBOR carrying key 23 INSIDE a sub transaction body is rejected by the decoder', async () => {
    const { signTransaction } = captureSignTransaction();

    // The payoff, one level deeper than the walk descends.
    const innerSub = subTxOf({
      outputs: [
        { address: attackerMainnetAddress, value: { coins: 250_000_000n } },
      ],
      networkId: Cardano.NetworkId.Mainnet,
    });
    // The level the walk DOES descend into: same-network, nothing to see.
    const outerSub = subTxOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1n } }],
    });

    const cleanSubBodyHex = hexOf(
      Serialization.SubTransactionBody.fromCore(outerSub.body).toCbor(),
    );
    const nestedSetHex = hexOf(
      Serialization.CborSet.fromCore(
        [innerSub],
        Serialization.SubTransaction.fromCore,
      ).toCbor(),
    );
    // CBOR uint 23 is the single byte 0x17: sub_transactions, one level down.
    const tamperedSubBodyHex = appendMapEntry(
      cleanSubBodyHex,
      `17${nestedSetHex}`,
    );

    const cleanFrameHex = hexOf(
      Serialization.SubTransaction.fromCore(outerSub).toCbor(),
    );
    expect(cleanFrameHex).toContain(cleanSubBodyHex);
    const tamperedFrameHex = cleanFrameHex.replace(
      cleanSubBodyHex,
      tamperedSubBodyHex,
    );

    const outerSetHex = hexOf(
      Serialization.CborSet.fromCore(
        [outerSub],
        Serialization.SubTransaction.fromCore,
      ).toCbor(),
    );
    expect(outerSetHex).toContain(cleanFrameHex);
    const tamperedSetHex = outerSetHex.replace(cleanFrameHex, tamperedFrameHex);

    const topBodyHex = hexOf(
      Serialization.TransactionBody.fromCore({
        ...bodyBase,
        outputs: [
          { address: decoyTestnetAddress, value: { coins: 1_000_000n } },
        ],
      } as Cardano.TxBody).toCbor(),
    );
    const txCbor = `84${appendMapEntry(
      topBodyHex,
      `17${tamperedSetHex}`,
    )}${EMPTY_WITNESS_SET_HEX}f5f6`;

    // The payoff really is in those bytes...
    expect(txCbor).toContain(
      Buffer.from(
        Cardano.Address.fromBech32(attackerMainnetAddress).toBytes(),
        'hex',
      ).toString('hex'),
    );
    // ... and the SDK refuses to decode them at all, because key 23 is on the
    // sub-transaction body's top-level-only list. There is no depth-2 core
    // body for the walk to miss.
    expect(() =>
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)),
    ).toThrow(/sub transaction body: 23/);

    expect(cborNetworkBindingRefusal(txCbor, Cardano.NetworkId.Testnet)).toBe(
      'undecodable',
    );
    expect(isCborBoundToNetwork(txCbor, Cardano.NetworkId.Testnet)).toBe(false);
    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toThrow();
  });

  it('DEPTH/fromCore: a nested subTransactions on a sub body is silently DROPPED by the serializer', () => {
    // A JS caller can put the key there even though the type omits it. If the
    // encoder honoured it, the walk would miss the payoff; it does not encode
    // it, so the payoff never reaches the signed bytes.
    const nestedPayoff = subTxOf({
      outputs: [
        { address: attackerMainnetAddress, value: { coins: 250_000_000n } },
      ],
    });
    const outerSub = {
      body: {
        inputs: [VICTIM_INPUT],
        outputs: [{ address: decoyTestnetAddress, value: { coins: 1n } }],
        subTransactions: [nestedPayoff],
      },
      witness: { signatures: new Map() },
    } as unknown as Cardano.SubTransaction;

    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      subTransactions: [outerSub],
    } as Partial<Cardano.TxBody>);

    const mainnetAddressBytes = Buffer.from(
      Cardano.Address.fromBech32(attackerMainnetAddress).toBytes(),
      'hex',
    ).toString('hex');
    expect(txCbor).not.toContain(mainnetAddressBytes);

    const body = coreBodyOf(txCbor);
    expect(
      (body.subTransactions?.[0]?.body as { subTransactions?: unknown })
        .subTransactions,
    ).toBeUndefined();
    expect(jsonDump(body)).not.toContain(attackerMainnetAddress);
  });

  it.each([
    ['fee (2)', '02', '1a000186a0'],
    ['collateral_inputs (13)', '0d', 'd9010280'],
    ['collateral_return (16)', '10', '82f6f6'],
    ['total_collateral (17)', '11', '1a004c4b40'],
    ['an unassigned key (30)', '181e', '4101'],
  ])(
    'DEPTH/wire: %s inside a sub transaction body is rejected (no smuggling one level down)',
    (_label, keyHex, valueHex) => {
      const outerSub = subTxOf({
        outputs: [{ address: decoyTestnetAddress, value: { coins: 1n } }],
      });
      const cleanSubBodyHex = hexOf(
        Serialization.SubTransactionBody.fromCore(outerSub.body).toCbor(),
      );
      const cleanFrameHex = hexOf(
        Serialization.SubTransaction.fromCore(outerSub).toCbor(),
      );
      const tamperedFrameHex = cleanFrameHex.replace(
        cleanSubBodyHex,
        appendMapEntry(cleanSubBodyHex, `${keyHex}${valueHex}`),
      );
      const outerSetHex = hexOf(
        Serialization.CborSet.fromCore(
          [outerSub],
          Serialization.SubTransaction.fromCore,
        ).toCbor(),
      );
      const topBodyHex = hexOf(
        Serialization.TransactionBody.fromCore({
          ...bodyBase,
          outputs: [
            { address: decoyTestnetAddress, value: { coins: 1_000_000n } },
          ],
        } as Cardano.TxBody).toCbor(),
      );
      const txCbor = `84${appendMapEntry(
        topBodyHex,
        `17${outerSetHex.replace(cleanFrameHex, tamperedFrameHex)}`,
      )}${EMPTY_WITNESS_SET_HEX}f5f6`;

      expect(() =>
        Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)),
      ).toThrow();
      expect(cborNetworkBindingRefusal(txCbor, Cardano.NetworkId.Testnet)).toBe(
        'undecodable',
      );
    },
  );

  it('DEPTH: an empty subTransactions array encodes to no key 23 and cannot blind the walk', () => {
    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      subTransactions: [],
    } as Partial<Cardano.TxBody>);
    const body = coreBodyOf(txCbor);
    expect(body.subTransactions).toBeUndefined();
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);
    expect(isBoundToNetwork(body, Cardano.NetworkId.Mainnet)).toBe(false);

    // And the same, straight at the core entry point, where a caller can hand
    // the rule the empty array the wire cannot carry.
    expect(
      networkBindingRefusal(
        { ...bodyBase, outputs: [], subTransactions: [] } as Cardano.TxBody,
        Cardano.NetworkId.Testnet,
      ),
    ).toBe('states-no-network');
  });

  // ================================================================
  // The recursion's own coverage: every network-bearing sub-body field
  // must be caught THROUGH the recursion, behind a testnet decoy.
  // ================================================================
  it.each([
    [
      'outputs[].address',
      {
        outputs: [
          { address: attackerMainnetAddress, value: { coins: 250_000_000n } },
        ],
      },
    ],
    ['networkId', { outputs: [], networkId: Cardano.NetworkId.Mainnet }],
    [
      'withdrawals[].stakeAddress',
      {
        outputs: [],
        withdrawals: [
          { stakeAddress: attackerMainnetRewardAccount, quantity: 1n },
        ],
      },
    ],
    [
      'directDeposits[].stakeAddress',
      {
        outputs: [],
        directDeposits: [
          { stakeAddress: attackerMainnetRewardAccount, quantity: 1n },
        ],
      },
    ],
    [
      'proposalProcedures[].rewardAccount',
      {
        outputs: [],
        proposalProcedures: [
          {
            deposit: 1n,
            rewardAccount: attackerMainnetRewardAccount,
            anchor: {
              url: 'https://x/a',
              dataHash: Crypto.Hash32ByteBase16('0'.repeat(64)),
            },
            governanceAction: {
              __typename: Cardano.GovernanceActionType.info_action,
            },
          },
        ],
      },
    ],
    [
      'proposalProcedures[].governanceAction (treasury withdrawals)',
      {
        outputs: [],
        proposalProcedures: [
          {
            deposit: 1n,
            rewardAccount: decoyTestnetRewardAccount,
            anchor: {
              url: 'https://x/a',
              dataHash: Crypto.Hash32ByteBase16('0'.repeat(64)),
            },
            governanceAction: {
              __typename:
                Cardano.GovernanceActionType.treasury_withdrawals_action,
              withdrawals: new Set([
                {
                  rewardAccount: attackerMainnetRewardAccount,
                  coin: 1_000_000_000_000n,
                },
              ]),
              policyHash: null,
            },
          },
        ],
      },
    ],
  ])(
    'RECURSION: a mainnet %s inside a sub transaction is refused behind a testnet decoy',
    async (_label, subBody) => {
      const { signTransaction } = captureSignTransaction();
      const txCbor = txCborOf({
        // The decoy the walk would otherwise be satisfied by.
        outputs: [
          { address: decoyTestnetAddress, value: { coins: 1_000_000n } },
        ],
        subTransactions: [
          subTxOf(subBody as Partial<Cardano.SubTransactionBody>),
        ],
      } as Partial<Cardano.TxBody>);

      const body = coreBodyOf(txCbor);
      // The payoff survived the wire round-trip into the signed bytes.
      expect(jsonDump(body.subTransactions?.[0]?.body)).toMatch(
        /(addr1|stake1)|"networkId":1/,
      );
      // Mutation witness: strip the sub transaction and the very same body is
      // judged bound. So the refusal below is caused by the recursion and by
      // nothing else - drop the recursion and this case goes green-on-attack.
      expect(
        isBoundToNetwork(
          { ...body, subTransactions: undefined },
          Cardano.NetworkId.Testnet,
        ),
      ).toBe(true);
      expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);
      await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject(
        { name: 'TxSignError', code: TxSignErrorCode.ProofGeneration },
      );
    },
  );

  // ================================================================
  // TREASURY: "the only governance action carrying a network-bearing
  // field". Decided against the DECODED action, not the source comment.
  // ================================================================
  const governanceActions: [string, Cardano.GovernanceAction][] = [
    ['info_action', { __typename: Cardano.GovernanceActionType.info_action }],
    [
      'no_confidence',
      {
        __typename: Cardano.GovernanceActionType.no_confidence,
        governanceActionId: null,
      },
    ],
    [
      'parameter_change_action',
      {
        __typename: Cardano.GovernanceActionType.parameter_change_action,
        governanceActionId: null,
        protocolParamUpdate: { maxTxSize: 16_384 },
        policyHash: null,
      } as unknown as Cardano.GovernanceAction,
    ],
    [
      'hard_fork_initiation_action',
      {
        __typename: Cardano.GovernanceActionType.hard_fork_initiation_action,
        governanceActionId: null,
        protocolVersion: { major: 10, minor: 0 },
      } as unknown as Cardano.GovernanceAction,
    ],
    [
      'update_committee',
      {
        __typename: Cardano.GovernanceActionType.update_committee,
        governanceActionId: null,
        membersToBeRemoved: new Set([keyHashCredential('b')]),
        membersToBeAdded: new Set([
          { coldCredential: keyHashCredential('a'), epoch: 500 },
        ]),
        newQuorumThreshold: { numerator: 1, denominator: 2 },
      } as unknown as Cardano.GovernanceAction,
    ],
    [
      'new_constitution',
      {
        __typename: Cardano.GovernanceActionType.new_constitution,
        governanceActionId: null,
        constitution: {
          anchor: {
            url: 'https://malicious-dapp.com/c',
            dataHash: Crypto.Hash32ByteBase16('0'.repeat(64)),
          },
          scriptHash: null,
        },
      } as unknown as Cardano.GovernanceAction,
    ],
  ];

  const proposalWith = (
    governanceAction: Cardano.GovernanceAction,
    rewardAccount: Cardano.RewardAccount,
  ) =>
    ({
      deposit: 100_000_000_000n,
      rewardAccount,
      anchor: {
        url: 'https://malicious-dapp.com/a',
        dataHash: Crypto.Hash32ByteBase16('0'.repeat(64)),
      },
      governanceAction,
    } as unknown as Cardano.ProposalProcedure);

  it.each(governanceActions)(
    'TREASURY/completeness: %s has no address slot on the wire, so it can hide no payoff',
    (_label, governanceAction) => {
      const txCbor = txCborOf({
        proposalProcedures: [
          proposalWith(governanceAction, decoyTestnetRewardAccount),
        ],
      } as Partial<Cardano.TxBody>);
      const body = coreBodyOf(txCbor);
      const decoded = body.proposalProcedures![0]!.governanceAction;

      expect(decoded.__typename).toBe(governanceAction.__typename);
      // The decoded action contains no bech32 address of any form: the only
      // network-bearing string in the whole procedure is the deposit-return
      // account, which the walk already reads.
      expect(jsonDump(decoded)).not.toMatch(ANY_ADDRESS);
      // Nothing beyond the deposit-return account contributes evidence.
      expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);
      expect(isBoundToNetwork(body, Cardano.NetworkId.Mainnet)).toBe(false);
    },
  );

  it('TREASURY/completeness: only treasury_withdrawals_action holds an address, and the walk reads it', () => {
    const treasury = {
      __typename: Cardano.GovernanceActionType.treasury_withdrawals_action,
      withdrawals: new Set([
        {
          rewardAccount: attackerMainnetRewardAccount,
          coin: 1_000_000_000_000n,
        },
      ]),
      policyHash: null,
    } as unknown as Cardano.GovernanceAction;

    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      proposalProcedures: [proposalWith(treasury, decoyTestnetRewardAccount)],
    } as Partial<Cardano.TxBody>);
    const body = coreBodyOf(txCbor);

    // It is the one action type whose decoded form DOES carry an address.
    expect(jsonDump(body.proposalProcedures![0]!.governanceAction)).toMatch(
      ANY_ADDRESS,
    );
    // Mutation witness: swap the action for one with no address slot and the
    // same body is judged bound, so only the treasury-payout read refuses it.
    const withoutTreasury = coreBodyOf(
      txCborOf({
        outputs: [
          { address: decoyTestnetAddress, value: { coins: 1_000_000n } },
        ],
        proposalProcedures: [
          proposalWith(
            { __typename: Cardano.GovernanceActionType.info_action },
            decoyTestnetRewardAccount,
          ),
        ],
      } as Partial<Cardano.TxBody>),
    );
    expect(isBoundToNetwork(withoutTreasury, Cardano.NetworkId.Testnet)).toBe(
      true,
    );
    // Two same-network decoys in front of it (output + deposit account) do not
    // cover it.
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);
  });

  it('TREASURY: multiple payouts - one mainnet account among testnet ones still refuses', () => {
    const treasury = {
      __typename: Cardano.GovernanceActionType.treasury_withdrawals_action,
      withdrawals: new Set([
        {
          rewardAccount: rewardAccountOn(Cardano.NetworkId.Testnet, 'd'),
          coin: 1n,
        },
        {
          rewardAccount: rewardAccountOn(Cardano.NetworkId.Testnet, 'e'),
          coin: 1n,
        },
        {
          rewardAccount: attackerMainnetRewardAccount,
          coin: 1_000_000_000_000n,
        },
      ]),
      policyHash: null,
    } as unknown as Cardano.GovernanceAction;

    const body = coreBodyOf(
      txCborOf({
        outputs: [
          { address: decoyTestnetAddress, value: { coins: 1_000_000n } },
        ],
        proposalProcedures: [proposalWith(treasury, decoyTestnetRewardAccount)],
      } as Partial<Cardano.TxBody>),
    );
    const decoded = body.proposalProcedures![0]!
      .governanceAction as Cardano.TreasuryWithdrawalsAction;
    expect([...decoded.withdrawals]).toHaveLength(3);
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);
  });

  it('TREASURY: an all-testnet payout set is not turned into a false refusal', () => {
    const treasury = {
      __typename: Cardano.GovernanceActionType.treasury_withdrawals_action,
      withdrawals: new Set([
        {
          rewardAccount: rewardAccountOn(Cardano.NetworkId.Testnet, 'd'),
          coin: 7n,
        },
      ]),
      policyHash: null,
    } as unknown as Cardano.GovernanceAction;
    const body = coreBodyOf(
      txCborOf({
        proposalProcedures: [proposalWith(treasury, decoyTestnetRewardAccount)],
      } as Partial<Cardano.TxBody>),
    );
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);
  });

  // ================================================================
  // WHOLE-BODY COMPLETENESS. Not read off the source comments: a body
  // with every field the SDK can encode is round-tripped, and every
  // place an address string surfaces in the DECODED core is collected
  // by path. If a future SDK surfaces one at a new path, this goes red.
  // ================================================================
  const addressPaths = (value: unknown, path = ''): string[] => {
    if (typeof value === 'string') return ANY_ADDRESS.test(value) ? [path] : [];
    if (value instanceof Set || Array.isArray(value))
      return [...(value as Iterable<unknown>)].flatMap(v =>
        addressPaths(v, `${path}[]`),
      );
    if (value instanceof Map)
      return [...value.entries()].flatMap(([k, v]) => [
        ...addressPaths(k, `${path}{key}`),
        ...addressPaths(v, `${path}{value}`),
      ]);
    if (value && typeof value === 'object')
      return Object.entries(value).flatMap(([k, v]) =>
        addressPaths(v, path ? `${path}.${k}` : k),
      );
    return [];
  };

  const poolParameters = (
    rewardAccount: Cardano.RewardAccount,
    owners: Cardano.RewardAccount[],
  ) =>
    ({
      id: Cardano.PoolId.fromKeyHash(
        Hash28ByteBase16('f'.repeat(56)) as unknown as Ed25519KeyHashHex,
      ),
      rewardAccount,
      owners,
      pledge: 1n,
      cost: 340_000_000n,
      margin: { numerator: 1, denominator: 50 },
      relays: [
        { __typename: 'RelayByName', hostname: 'x.invalid', port: 3001 },
      ],
      vrf: '0'.repeat(64),
    } as unknown as Cardano.PoolParameters);

  const maximalBody = () =>
    ({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      collaterals: [VICTIM_INPUT],
      referenceInputs: [VICTIM_INPUT],
      collateralReturn: {
        address: decoyTestnetAddress,
        value: { coins: 1n },
      },
      totalCollateral: 5_000_000n,
      networkId: Cardano.NetworkId.Testnet,
      validityInterval: { invalidBefore: 1, invalidHereafter: 2 },
      auxiliaryDataHash: Crypto.Hash32ByteBase16('1'.repeat(64)),
      scriptIntegrityHash: Crypto.Hash32ByteBase16('2'.repeat(64)),
      mint: new Map([
        [Cardano.AssetId(`${'e'.repeat(56)}${'f'.repeat(8)}`), -1_000n],
      ]),
      donation: 1n,
      treasuryValue: 1n,
      withdrawals: [{ stakeAddress: decoyTestnetRewardAccount, quantity: 1n }],
      directDeposits: [
        { stakeAddress: decoyTestnetRewardAccount, quantity: 1n },
      ],
      accountBalanceIntervals: [
        {
          credential: keyHashCredential('a'),
          interval: { inclusiveLowerBound: 1n },
        },
      ],
      votingProcedures: [
        {
          voter: {
            __typename: Cardano.VoterType.dRepKeyHash,
            credential: keyHashCredential('a'),
          },
          votes: [
            {
              actionId: {
                id: Cardano.TransactionId(`${'7'.repeat(63)}1`),
                actionIndex: 0,
              },
              votingProcedure: { vote: Cardano.Vote.yes, anchor: null },
            },
          ],
        },
      ],
      certificates: [
        {
          __typename: Cardano.CertificateType.PoolRegistration,
          poolParameters: poolParameters(decoyTestnetRewardAccount, [
            decoyTestnetRewardAccount,
          ]),
        },
        {
          __typename: Cardano.CertificateType.StakeDelegation,
          stakeCredential: keyHashCredential('a'),
          poolId: Cardano.PoolId.fromKeyHash(
            Hash28ByteBase16('f'.repeat(56)) as unknown as Ed25519KeyHashHex,
          ),
        },
      ],
      proposalProcedures: [
        proposalWith(
          {
            __typename:
              Cardano.GovernanceActionType.treasury_withdrawals_action,
            withdrawals: new Set([
              { rewardAccount: decoyTestnetRewardAccount, coin: 1n },
            ]),
            policyHash: null,
          } as unknown as Cardano.GovernanceAction,
          decoyTestnetRewardAccount,
        ),
      ],
      subTransactions: [
        subTxOf({
          outputs: [{ address: decoyTestnetAddress, value: { coins: 1n } }],
          withdrawals: [
            { stakeAddress: decoyTestnetRewardAccount, quantity: 1n },
          ],
        }),
      ],
    } as unknown as Partial<Cardano.TxBody>);

  it('COMPLETENESS: every address the decoded core surfaces sits at a path the walk reads', () => {
    const body = coreBodyOf(
      txCborOf(maximalBody() as unknown as Partial<Cardano.TxBody>),
    );

    // Paths, deduplicated. Each one is read by `networkEvidence`; the file
    // will go red if the SDK ever surfaces an address somewhere new.
    expect([...new Set(addressPaths(body))].sort()).toEqual(
      [
        'certificates[].poolParameters.owners[]',
        'certificates[].poolParameters.rewardAccount',
        'collateralReturn.address',
        'directDeposits[].stakeAddress',
        'outputs[].address',
        'proposalProcedures[].governanceAction.withdrawals[].rewardAccount',
        'proposalProcedures[].rewardAccount',
        'subTransactions[].body.outputs[].address',
        'subTransactions[].body.withdrawals[].stakeAddress',
        'withdrawals[].stakeAddress',
      ].sort(),
    );

    // And a body saturated with same-network elements is still accepted: the
    // completeness above is not bought with a blanket refusal.
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);
  });

  it('pool owners carry NO independent network: the decoder re-derives them from the pool rewardAccount', () => {
    // The wire holds 28-byte owner key hashes only. `PoolParams.toCore`
    // rebuilds each owner reward account using the POOL reward account's
    // network id, so mainnet owners cannot be smuggled past a testnet pool
    // account - and, equally, reading `owners` adds no evidence the pool
    // reward account has not already stated.
    const body = coreBodyOf(
      txCborOf({
        certificates: [
          {
            __typename: Cardano.CertificateType.PoolRegistration,
            poolParameters: poolParameters(decoyTestnetRewardAccount, [
              attackerMainnetRewardAccount,
            ]),
          },
        ],
      } as unknown as Partial<Cardano.TxBody>),
    );
    const decoded = (
      body.certificates![0]! as Cardano.PoolRegistrationCertificate
    ).poolParameters;

    // The attacker's 28-byte owner credential survives; its NETWORK does not.
    // It comes back stamped with the pool reward account's testnet tag.
    expect(decoded.owners).toEqual([
      rewardAccountOn(Cardano.NetworkId.Testnet, 'a'),
    ]);
    expect(decoded.owners).not.toContain(attackerMainnetRewardAccount);
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);

    // The converse: a MAINNET pool reward account drags its owners with it.
    const mainnetPool = coreBodyOf(
      txCborOf({
        outputs: [
          { address: decoyTestnetAddress, value: { coins: 1_000_000n } },
        ],
        certificates: [
          {
            __typename: Cardano.CertificateType.PoolRegistration,
            poolParameters: poolParameters(attackerMainnetRewardAccount, [
              attackerMainnetRewardAccount,
            ]),
          },
        ],
      } as unknown as Partial<Cardano.TxBody>),
    );
    expect(isBoundToNetwork(mainnetPool, Cardano.NetworkId.Testnet)).toBe(
      false,
    );
  });

  // ================================================================
  // Sub-body-only fields the walk does NOT read. Recorded here as
  // credential/hash-only: they cannot carry a network, so leaving them
  // unread costs no veto.
  // ================================================================
  it('requiredTopLevelGuards (sub body key 24) is credentials and datums only - no address survives the round trip', () => {
    const outerSub = subTxOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1n } }],
      requiredTopLevelGuards: [
        { credential: keyHashCredential('a'), datum: null },
      ],
    } as unknown as Partial<Cardano.SubTransactionBody>);

    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      subTransactions: [outerSub],
    } as Partial<Cardano.TxBody>);
    const subBody = coreBodyOf(txCbor).subTransactions![0]!.body as {
      requiredTopLevelGuards?: unknown;
    };

    expect(subBody.requiredTopLevelGuards).toEqual([
      { credential: keyHashCredential('a'), datum: null },
    ]);
    // A credential is 28 bytes and identical on every network - which is the
    // whole reason this rule exists - so there is nothing here to read.
    expect(jsonDump(subBody.requiredTopLevelGuards)).not.toMatch(ANY_ADDRESS);
  });

  it('accountBalanceIntervals (key 26) is credentials and amounts only - no address survives the round trip', () => {
    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      accountBalanceIntervals: [
        {
          credential: keyHashCredential('a'),
          interval: { inclusiveLowerBound: 1n },
        },
      ],
    } as unknown as Partial<Cardano.TxBody>);
    const body = coreBodyOf(txCbor);
    expect(body.accountBalanceIntervals).toHaveLength(1);
    expect(jsonDump(body.accountBalanceIntervals)).not.toMatch(ANY_ADDRESS);
  });

  // ================================================================
  // The sub transaction's own witness and auxiliary data sit inside the
  // TOP-LEVEL body hash but outside the walk. Recorded, with the reason
  // it is not a payoff.
  // ================================================================
  it('a sub transaction auxiliaryData is inside the signed body hash and unread by the walk, yet moves no funds', async () => {
    const { signTransaction } = captureSignTransaction();
    const outerSub = {
      body: {
        inputs: [VICTIM_INPUT],
        outputs: [{ address: decoyTestnetAddress, value: { coins: 1n } }],
      },
      witness: { signatures: new Map() },
      auxiliaryData: {
        blob: new Map([
          [
            674n,
            Uint8Array.from(
              Buffer.from(
                Cardano.Address.fromBech32(attackerMainnetAddress).toBytes(),
                'hex',
              ),
            ),
          ],
        ]),
      },
    } as unknown as Cardano.SubTransaction;

    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      subTransactions: [outerSub],
    } as Partial<Cardano.TxBody>);
    const bare = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      subTransactions: [
        subTxOf({
          outputs: [{ address: decoyTestnetAddress, value: { coins: 1n } }],
        }),
      ],
    } as Partial<Cardano.TxBody>);

    // It IS in the signed bytes: the body hash moves when it is added.
    expect(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor))
        .body()
        .hash(),
    ).not.toBe(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(bare))
        .body()
        .hash(),
    );
    // ... and the wallet signs it. The attacker's MAINNET address bytes are
    // literally in the signed hash and the walk never looks at them - but a
    // metadatum is not a ledger destination, so no value can land there. It
    // is an unread field that cannot hold a payoff, not a missed veto.
    expect(
      isBoundToNetwork(coreBodyOf(txCbor), Cardano.NetworkId.Testnet),
    ).toBe(true);
    expect(
      witnessFacts(txCbor, await signTransaction(txCbor, true, ORIGIN)),
    ).toEqual([{ keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true }]);
  });
});
