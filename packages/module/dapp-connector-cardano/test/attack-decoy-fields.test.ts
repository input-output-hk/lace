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

import { isBoundToNetwork } from './support/network-binding-verdict';

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

const mainnetAddress = (payment: string, stake: string) =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Mainnet,
    keyHashCredential(payment),
    keyHashCredential(stake),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

const testnetAddress = (payment: string, stake: string) =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    keyHashCredential(payment),
    keyHashCredential(stake),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

// The payoff destination: an address only the attacker controls, on MAINNET.
const attackerMainnetAddress = mainnetAddress('a', 'b');
// The decoy: a testnet address of trivial value that makes the walk answer
// "this body is bound to testnet".
const decoyTestnetAddress = testnetAddress('c', 'd');

const attackerMainnetRewardAccount = Cardano.RewardAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  keyHashCredential('a'),
)
  .toAddress()
  .toBech32() as Cardano.RewardAccount;

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

const captureSignTransaction = (): {
  signTransaction: SignTransaction;
  signingResults: SigningResult[];
} => {
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

  const signingResults: SigningResult[] = [];
  captured.signingResult$!.subscribe(result => signingResults.push(result));

  return { signTransaction: captured.signTransaction!, signingResults };
};

const VICTIM_MAINNET_INPUT = {
  txId: Cardano.TransactionId(`${'9'.repeat(63)}1`),
  index: 0,
};

/** Every attack body names the victim's payment key so the SDK selects it by
 *  credential hash alone, without any input needing to resolve. */
const bodyBase = {
  inputs: [VICTIM_MAINNET_INPUT],
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

/**
 * What a passing attack has to show: a real Ed25519 witness whose vkey hashes
 * to the account's payment credential and which verifies against the body hash
 * of the exact bytes the dApp submitted.
 */
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

describe('LW-15469 adversarial: decoy bodies hiding the payoff in unwalked fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // Canary: the direct attack must still be refused, or a green run here
  // would only prove the harness is broken.
  // ------------------------------------------------------------------
  it('canary: a bare mainnet output is still refused', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [
        { address: attackerMainnetAddress, value: { coins: 250_000_000n } },
      ],
      networkId: Cardano.NetworkId.Mainnet,
    });

    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  it('canary: a body with no network-bearing element at all is refused', async () => {
    const { signTransaction } = captureSignTransaction();
    // Whole victim input consumed as fee: value destruction, no destination.
    const txCbor = txCborOf({ outputs: [], fee: 1_000_000_000n });

    expect(
      isBoundToNetwork(coreBodyOf(txCbor), Cardano.NetworkId.Testnet),
    ).toBe(false);
    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
    });
  });

  it('canary: a legitimate testnet body still signs (the rule is not a blanket refusal)', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
    });

    const witnessSet = await signTransaction(txCbor, true, ORIGIN);
    expect(witnessFacts(txCbor, witnessSet)).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });

  // ------------------------------------------------------------------
  // Baseline for the field table: each element the walk DOES read catches a
  // mainnet value on its own, and Byron addresses report the same network the
  // ledger derives from their magic attribute.
  // ------------------------------------------------------------------
  it.each([
    [
      'withdrawals[].stakeAddress',
      {
        withdrawals: [
          {
            stakeAddress: attackerMainnetRewardAccount,
            quantity: 250_000_000n,
          },
        ],
      },
    ],
    [
      'directDeposits[].stakeAddress',
      {
        directDeposits: [
          { stakeAddress: attackerMainnetRewardAccount, quantity: 1n },
        ],
      },
    ],
    [
      'collateralReturn.address',
      {
        collateralReturn: {
          address: attackerMainnetAddress,
          value: { coins: 1n },
        },
      },
    ],
    [
      'proposalProcedures[].rewardAccount',
      {
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
      'outputs[].address (Byron, mainnet: no magic attribute)',
      {
        outputs: [
          {
            address: Cardano.ByronAddress.fromCredentials(
              Hash28ByteBase16('a'.repeat(56)),
              {},
              0,
            )
              .toAddress()
              .toBase58(),
            value: { coins: 1n },
          },
        ],
      },
    ],
  ])('read field %s catches a mainnet value on its own', (_label, patch) => {
    const body = coreBodyOf(txCborOf(patch as Partial<Cardano.TxBody>));
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);
    expect(isBoundToNetwork(body, Cardano.NetworkId.Mainnet)).toBe(true);
  });

  it('a Byron output with a testnet magic attribute reads as testnet', () => {
    const byronTestnet = Cardano.ByronAddress.fromCredentials(
      Hash28ByteBase16('a'.repeat(56)),
      { magic: 2 },
      0,
    )
      .toAddress()
      .toBase58();
    const body = coreBodyOf(
      txCborOf({ outputs: [{ address: byronTestnet, value: { coins: 1n } }] }),
    );
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);
  });

  // ------------------------------------------------------------------
  // subTransactions (TxBody key 23). The nested body
  // is a full TxBody with its own outputs and its own networkId, and the
  // witness covers all of it, so the walk now descends one level. One level
  // is the whole depth: SubTransactionBody omits `subTransactions`.
  // ------------------------------------------------------------------
  it('REGRESSION: a mainnet payoff inside subTransactions is refused, testnet decoy output notwithstanding', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      subTransactions: [
        {
          body: {
            inputs: [VICTIM_MAINNET_INPUT],
            outputs: [
              {
                address: attackerMainnetAddress,
                value: { coins: 250_000_000n },
              },
            ],
            networkId: Cardano.NetworkId.Mainnet,
          },
          witness: { signatures: new Map() },
        },
      ],
    } as Partial<Cardano.TxBody>);

    const body = coreBodyOf(txCbor);
    // The payoff survived the wire round-trip and sits in the signed bytes.
    expect(body.subTransactions?.[0]?.body.outputs[0]?.address).toBe(
      attackerMainnetAddress,
    );
    expect(body.subTransactions?.[0]?.body.networkId).toBe(
      Cardano.NetworkId.Mainnet,
    );
    // ... and the walk still calls the body testnet-bound.
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);

    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  // ------------------------------------------------------------------
  // proposalProcedures[].governanceAction. The
  // procedure's own `rewardAccount` says only where the DEPOSIT returns; a
  // treasury-withdrawals action names who gets PAID, and the walk now reads
  // those too.
  // ------------------------------------------------------------------
  it('REGRESSION: mainnet reward accounts inside a treasury-withdrawals governance action are refused', async () => {
    const { signTransaction } = captureSignTransaction();
    const decoyTestnetRewardAccount = Cardano.RewardAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      keyHashCredential('c'),
    )
      .toAddress()
      .toBech32() as Cardano.RewardAccount;

    const txCbor = txCborOf({
      proposalProcedures: [
        {
          deposit: 100_000_000_000n,
          rewardAccount: decoyTestnetRewardAccount,
          anchor: {
            url: 'https://malicious-dapp.com/a',
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
    } as Partial<Cardano.TxBody>);

    const body = coreBodyOf(txCbor);
    const action = body.proposalProcedures?.[0]
      ?.governanceAction as Cardano.TreasuryWithdrawalsAction;
    expect([...action.withdrawals][0]?.rewardAccount).toBe(
      attackerMainnetRewardAccount,
    );
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);

    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  // ------------------------------------------------------------------
  // ATTACK 3 - a transaction-body map key the SDK's decoder does not know.
  // `TransactionBody.fromCbor` skips unknown keys but keeps the ORIGINAL
  // bytes, and the signer hashes those bytes. Whatever is in that key is
  // invisible to the walk and inside the signature.
  // ------------------------------------------------------------------
  it('ATTACK 3: an unknown body map key is invisible to the walk but inside the signed hash', async () => {
    const { signTransaction } = captureSignTransaction();
    const decoyCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
    });
    const decoyTx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(decoyCbor),
    );
    // Key 24 is unassigned in every TxBody CDDL the SDK decodes. The payload
    // stands in for whatever a future era assigns there.
    const payload = Buffer.from(
      Cardano.Address.fromBech32(attackerMainnetAddress).toBytes(),
      'hex',
    );
    const byteStringHeader =
      payload.length < 24
        ? (0x40 + payload.length).toString(16).padStart(2, '0')
        : `58${payload.length.toString(16).padStart(2, '0')}`;
    const entryHex = `1818${byteStringHeader}${payload.toString('hex')}`;
    const smuggledBody = appendMapEntry(
      decoyTx.body().toCbor() as unknown as string,
      entryHex,
    );
    const txCbor = `84${smuggledBody}${decoyTx.witnessSet().toCbor()}f5f6`;

    const body = coreBodyOf(txCbor);
    // Nothing in the decoded view mentions the smuggled key at all.
    expect(
      JSON.stringify(body, (_key: string, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ).not.toContain(payload.toString('hex'));
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);

    const witnessSet = await signTransaction(txCbor, true, ORIGIN);
    const facts = witnessFacts(txCbor, witnessSet);
    expect(facts).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
    // The signature covers bytes that include the smuggled key: the body hash
    // differs from the decoy's, and the signature is over the smuggled one.
    expect(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor))
        .body()
        .hash(),
    ).not.toBe(decoyTx.body().hash());
  });

  // ------------------------------------------------------------------
  // ATTACK 4 - certificates other than pool registration. Every one of them
  // decodes to bare credentials, so none of them adds network evidence; a
  // 1-lovelace testnet decoy output is enough to carry the whole body.
  // ------------------------------------------------------------------
  it('ATTACK 4: non-pool-registration certificates add no evidence and ride a 1-lovelace decoy', async () => {
    const { signTransaction } = captureSignTransaction();
    const certificates = [
      {
        __typename: Cardano.CertificateType.StakeDeregistration,
        stakeCredential: fixtureBaseAddress.getStakeCredential(),
      },
      {
        __typename: Cardano.CertificateType.AuthorizeCommitteeHot,
        coldCredential: fixtureBaseAddress.getPaymentCredential(),
        hotCredential: keyHashCredential('a'),
      },
      {
        __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
        dRepCredential: fixtureBaseAddress.getPaymentCredential(),
        deposit: 500_000_000n,
        anchor: null,
      },
    ] as unknown as Cardano.Certificate[];

    const certificatesOnly = txCborOf({ certificates });
    // On their own the certificates prove nothing, so the rule refuses.
    expect(
      isBoundToNetwork(coreBodyOf(certificatesOnly), Cardano.NetworkId.Testnet),
    ).toBe(false);

    const txCbor = txCborOf({
      certificates,
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
    });
    expect(
      isBoundToNetwork(coreBodyOf(txCbor), Cardano.NetworkId.Testnet),
    ).toBe(true);

    // Both the payment key AND the stake key sign: the certificates pull the
    // stake credential into the witness set on top of the required signer.
    const witnessSet = await signTransaction(txCbor, true, ORIGIN);
    expect(witnessFacts(txCbor, witnessSet)).toEqual([
      {
        keyHash: fixtureBaseAddress.getStakeCredential().hash as string,
        verifiesAgainstBodyHash: true,
      },
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });

  // ------------------------------------------------------------------
  // ATTACK 5 - mint/burn and treasury donation: value moved or destroyed
  // with no address anywhere near it.
  // ------------------------------------------------------------------
  it('ATTACK 5: a burn plus a treasury donation ride the same 1-lovelace decoy', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
      mint: new Map([
        [Cardano.AssetId(`${'e'.repeat(56)}${'f'.repeat(8)}`), -1_000n],
      ]),
      donation: 900_000_000n,
      treasuryValue: 1n,
    } as Partial<Cardano.TxBody>);

    const body = coreBodyOf(txCbor);
    expect(body.donation).toBe(900_000_000n);
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(true);

    const witnessSet = await signTransaction(txCbor, true, ORIGIN);
    expect(witnessFacts(txCbor, witnessSet)).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });

  // ------------------------------------------------------------------
  // ATTACK 6 - votingProcedures. A Voter is a bare credential, so the
  // victim's DRep/committee vote on a MAINNET governance action carries no
  // network evidence at all.
  // ------------------------------------------------------------------
  it('ATTACK 6: a vote cast with the victim key carries no network evidence', async () => {
    const { signTransaction } = captureSignTransaction();
    const votingProcedures = [
      {
        voter: {
          __typename: Cardano.VoterType.dRepKeyHash,
          credential: fixtureBaseAddress.getPaymentCredential(),
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
    ] as unknown as Cardano.VotingProcedures;

    expect(
      isBoundToNetwork(
        coreBodyOf(txCborOf({ votingProcedures })),
        Cardano.NetworkId.Testnet,
      ),
    ).toBe(false);

    const txCbor = txCborOf({
      votingProcedures,
      outputs: [{ address: decoyTestnetAddress, value: { coins: 1_000_000n } }],
    });
    expect(
      isBoundToNetwork(coreBodyOf(txCbor), Cardano.NetworkId.Testnet),
    ).toBe(true);

    const witnessSet = await signTransaction(txCbor, true, ORIGIN);
    expect(witnessFacts(txCbor, witnessSet)).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });

  // ------------------------------------------------------------------
  // ATTACK 7 - collateralReturn as the decoy. It is the one element the walk
  // reads that the Shelley/Babbage UTXO `WrongNetwork` rule does not cover
  // (it checks `outputsTxBodyL`, not the collateral return), so a testnet
  // collateralReturn may be the only testnet-tagged thing a mainnet node will
  // take.
  // ------------------------------------------------------------------
  it('ATTACK 7: a testnet collateralReturn alone satisfies the rule', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [],
      collateralReturn: {
        address: decoyTestnetAddress,
        value: { coins: 1_000_000n },
      },
      totalCollateral: 5_000_000n,
    } as Partial<Cardano.TxBody>);

    expect(
      isBoundToNetwork(coreBodyOf(txCbor), Cardano.NetworkId.Testnet),
    ).toBe(true);

    const witnessSet = await signTransaction(txCbor, true, ORIGIN);
    expect(witnessFacts(txCbor, witnessSet)).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });

  // ------------------------------------------------------------------
  // The two composed. `collateralReturn` is the only element the
  // walk reads that the Shelley UTXO `WrongNetwork` rule does not, so it is
  // the only testnet-tagged thing that can appear in a body a mainnet node
  // would still accept; the payoff goes in the nested body the walk skips.
  // Outer outputs are empty, so nothing testnet-tagged is network-checked.
  // ------------------------------------------------------------------
  it('REGRESSION: a testnet collateralReturn decoy no longer covers a mainnet payoff nested in a sub transaction', async () => {
    const { signTransaction } = captureSignTransaction();
    const txCbor = txCborOf({
      outputs: [],
      collateralReturn: {
        address: decoyTestnetAddress,
        value: { coins: 1_000_000n },
      },
      subTransactions: [
        {
          body: {
            inputs: [VICTIM_MAINNET_INPUT],
            outputs: [
              {
                address: attackerMainnetAddress,
                value: { coins: 250_000_000n },
              },
            ],
            withdrawals: [
              {
                stakeAddress: attackerMainnetRewardAccount,
                quantity: 10_000_000n,
              },
            ],
            networkId: Cardano.NetworkId.Mainnet,
          },
          witness: { signatures: new Map() },
        },
      ],
    } as Partial<Cardano.TxBody>);

    const body = coreBodyOf(txCbor);
    expect(body.outputs).toEqual([]);
    expect(body.subTransactions?.[0]?.body.outputs[0]?.address).toBe(
      attackerMainnetAddress,
    );
    expect(isBoundToNetwork(body, Cardano.NetworkId.Testnet)).toBe(false);

    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  // ------------------------------------------------------------------
  // ATTACK 8 - the network id is one bit. Every Cardano testnet shares
  // NetworkId 0, so a preprod-connected wallet signs a preview-valid body and
  // the other way round; the rule compares networkId, not the chain.
  // ------------------------------------------------------------------
  it('ATTACK 8: testnet is one bit - a preprod wallet signs a preview body', async () => {
    expect(FIXTURE.chainId.networkMagic).toBe(1); // preprod
    const { signTransaction } = captureSignTransaction();
    // Identical bytes are valid on preview (magic 2): addresses carry no magic.
    const txCbor = txCborOf({
      outputs: [
        { address: testnetAddress('a', 'b'), value: { coins: 250_000_000n } },
      ],
      networkId: Cardano.NetworkId.Testnet,
    });

    const witnessSet = await signTransaction(txCbor, true, ORIGIN);
    expect(witnessFacts(txCbor, witnessSet)).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });
});
