import {
  BITCOIN_TOKEN_ID,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { DappId } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { viewsActions } from '@lace-contract/views';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { Err, HexBytes, Ok } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinAPIErrorCode } from '../../src/api-error';
import { promptBitcoinAuthorizeDapp } from '../../src/store/authorize-dapp-util';
import {
  closeRequestedPopup,
  connectBitcoinDappConnectorApi,
  initializeLaceExtensionSideEffects,
  resolveForeignPsbtInputs,
} from '../../src/store/side-effects';
import { bitcoinDappConnectorActions } from '../../src/store/slice';
import { signMessage$, signPsbt$ } from '../../src/store/util';

import type {
  BuildSendTxFunction,
  ConfirmSendTxFunction,
  SubmitRawTxFunction,
  SignBitcoinMessageFunction,
  SignBitcoinPsbtFunction,
} from '../../src/store/dependencies/bitcoin-dapp-connector-api';
import type { BitcoinConfirmationRequest } from '../../src/store/dependencies/create-confirmation-callback';
import type { BitcoinSigningResult } from '../../src/store/util';
import type { BitcoinUnsignedTxDto } from '@lace-contract/bitcoin-context';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

(globalThis as { chrome?: unknown }).chrome = {
  sidePanel: { setPanelBehavior: () => {} },
};

vi.mock('../../src/store/util', async () => {
  const actual = await vi.importActual('../../src/store/util');
  return {
    ...actual,
    signMessage$: vi.fn().mockReturnValue(of({ type: 'SIGN_MESSAGE_ACTION' })),
    signPsbt$: vi.fn().mockReturnValue(of({ type: 'SIGN_PSBT_ACTION' })),
  };
});

const ORIGIN = 'https://test-dapp.com';
const ACCOUNT_ID = AccountId('account-1');
const WALLET_ID = WalletId('wallet-1');
const PUBKEY_HEX =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const PUBKEY = Buffer.from(PUBKEY_HEX, 'hex');

const p2wpkh = bitcoin.payments.p2wpkh({
  pubkey: PUBKEY,
  network: bitcoin.networks.bitcoin,
});
const OWN_ADDRESS = p2wpkh.address!;

const RECIPIENT_ADDRESS = bitcoin.payments.p2wpkh({
  pubkey: Buffer.from(`03${PUBKEY_HEX.slice(2)}`, 'hex'),
  network: bitcoin.networks.bitcoin,
}).address!;

const mockDapp: Dapp = {
  id: DappId(ORIGIN),
  name: 'Test DApp',
  origin: ORIGIN,
  imageUrl: `${ORIGIN}/favicon.ico`,
};

const account = {
  accountId: ACCOUNT_ID,
  walletId: WALLET_ID,
  blockchainName: 'Bitcoin',
  accountType: 'InMemory',
} as unknown as AnyAccount;

const wallet = {
  walletId: WALLET_ID,
  accounts: [account],
} as unknown as AnyWallet;

const ownAddressEntry = {
  address: OWN_ADDRESS,
  accountId: ACCOUNT_ID,
  blockchainName: 'Bitcoin',
  data: {
    network: BitcoinNetwork.Mainnet,
    addressType: 'NativeSegWit',
    account: 0,
    chain: 'external',
    index: 0,
    publicKeyHex: PUBKEY_HEX,
  },
};

const btcToken = {
  tokenId: BITCOIN_TOKEN_ID,
  accountId: ACCOUNT_ID,
  blockchainName: 'Bitcoin',
};

const upsertActivities = vi.fn((payload: unknown) => ({
  type: 'activities/upsertActivities',
  payload,
}));

const actions = {
  ...bitcoinDappConnectorActions,
  ...viewsActions,
  activities: { upsertActivities },
} as never;

type UpsertActivitiesPayload = {
  accountId: string;
  activities: {
    activityId: string;
    tokenBalanceChanges: { tokenId: string; amount: string }[];
  }[];
};

const lastUpsertedActivity = () => {
  const calls = upsertActivities.mock.calls;
  const payload = calls[calls.length - 1][0] as UpsertActivitiesPayload;
  return payload.activities[0];
};

const createOwnedPsbt = (sighashType?: number) => {
  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  psbt.addInput({
    hash: Buffer.alloc(32, 1),
    index: 0,
    witnessUtxo: { script: p2wpkh.output!, value: 10_000 },
    ...(sighashType === undefined ? {} : { sighashType }),
  });
  psbt.addOutput({ address: OWN_ADDRESS, value: 9000 });
  return psbt;
};

const signedRawTxFor = (psbt: bitcoin.Psbt) => {
  const transaction = bitcoin.Transaction.fromBuffer(
    psbt.data.globalMap.unsignedTx.toBuffer(),
  );
  transaction.ins[0].witness = [Buffer.alloc(72, 2), PUBKEY];
  return transaction.toHex();
};

const flushAsync = async (turns = 5) => {
  for (let turn = 0; turn < turns; turn += 1) {
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
};

type ConnectorArgument = {
  authorizedDapps$: Observable<unknown>;
  isUnlocked$: Observable<boolean>;
  addresses$: Observable<unknown>;
  accountUtxos$: Observable<unknown>;
  activeNetworkId$: Observable<unknown>;
  getAccountIdForOrigin: (origin: string) => unknown;
  signMessage: SignBitcoinMessageFunction;
  signPsbt: SignBitcoinPsbtFunction;
  buildSendTx: BuildSendTxFunction;
  confirmSendTx: ConfirmSendTxFunction;
  submitRawTx: SubmitRawTxFunction;
  handleRequests: (
    request$: Observable<BitcoinConfirmationRequest>,
  ) => Observable<unknown>;
};

describe('side-effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signMessage$).mockReturnValue(
      of({ type: 'SIGN_MESSAGE_ACTION' }) as never,
    );
    vi.mocked(signPsbt$).mockReturnValue(
      of({ type: 'SIGN_PSBT_ACTION' }) as never,
    );
  });

  describe('connectBitcoinDappConnectorApi', () => {
    const createActionObservables = () => ({
      bitcoinDappConnector: {
        confirmSignMessage$: new Subject<void>(),
        rejectSignMessage$: new Subject<void>(),
        confirmSignPsbt$: new Subject<void>(),
        rejectSignPsbt$: new Subject<void>(),
      },
      views: { viewDisconnected$: new Subject<{ payload: string }>() },
      txExecutor: {
        txPhaseCompleted$: new Subject<{
          payload: { executionId: string; result: unknown };
        }>(),
      },
    });

    const createStateObservables = () => ({
      views: { selectOpenViews$: of([]) },
      appLock: { isUnlocked$: of(true) },
      dappConnector: { selectAuthorizedDapps$: of({ Bitcoin: [] }) },
      addresses: { selectAllAddresses$: of([ownAddressEntry]) },
      network: {
        selectActiveNetworkId$: of(() => BitcoinNetworkId('mainnet')),
      },
      tokens: {
        selectTokensGroupedByAccount$: of({
          [ACCOUNT_ID]: { fungible: [btcToken], nfts: [] },
        }),
      },
      wallets: {
        selectActiveNetworkAccounts$: of([account]),
        selectAll$: of([wallet]),
      },
      bitcoinDappConnector: {
        selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
      },
    });

    const createDependencies = () => {
      const requestSubject = new Subject<BitcoinConfirmationRequest>();
      const connectBitcoinDappConnector = vi.fn(
        (argument: ConnectorArgument): Observable<unknown> =>
          argument.handleRequests(requestSubject),
      );
      return {
        connectBitcoinDappConnector,
        actions,
        accessAuthSecret: vi.fn(),
        authenticate: vi.fn(),
        bitcoinProvider: { getRawTransaction: vi.fn() },
        signerFactory: {
          canSign: vi.fn(),
          createDataSigner: vi.fn(),
          createTransactionSigner: vi.fn(),
        },
        requestSubject,
        getConnectorArgument: (): ConnectorArgument =>
          connectBitcoinDappConnector.mock.calls[0][0],
      };
    };

    const runSideEffect = (
      overrides: {
        actionObservables?: ReturnType<typeof createActionObservables>;
        stateObservables?: Record<string, unknown>;
        dependencies?: ReturnType<typeof createDependencies>;
        onEmission?: (emission: unknown) => void;
      } = {},
    ) => {
      const actionObservables =
        overrides.actionObservables ?? createActionObservables();
      const stateObservables =
        overrides.stateObservables ?? createStateObservables();
      const dependencies = overrides.dependencies ?? createDependencies();
      const emissions: unknown[] = [];
      const subscription = connectBitcoinDappConnectorApi(
        actionObservables as never,
        stateObservables as never,
        dependencies as never,
      ).subscribe(emission => {
        emissions.push(emission);
        overrides.onEmission?.(emission);
      });
      return {
        actionObservables,
        stateObservables,
        dependencies,
        emissions,
        subscription,
      };
    };

    it('wires the connector with the state observables and callbacks', async () => {
      const { dependencies } = runSideEffect();
      expect(dependencies.connectBitcoinDappConnector).toHaveBeenCalledTimes(1);

      const argument = dependencies.getConnectorArgument();
      expect(argument.signMessage).toBeInstanceOf(Function);
      expect(argument.signPsbt).toBeInstanceOf(Function);
      expect(argument.buildSendTx).toBeInstanceOf(Function);
      expect(argument.confirmSendTx).toBeInstanceOf(Function);
      expect(argument.submitRawTx).toBeInstanceOf(Function);
      expect(argument.handleRequests).toBeInstanceOf(Function);
      await expect(firstValueFrom(argument.activeNetworkId$)).resolves.toBe(
        BitcoinNetworkId('mainnet'),
      );
      await expect(firstValueFrom(argument.accountUtxos$)).resolves.toEqual({});
      await expect(firstValueFrom(argument.isUnlocked$)).resolves.toBe(true);
    });

    it('resolves the session account for an origin from the latest mapping', () => {
      const { dependencies } = runSideEffect();
      const argument = dependencies.getConnectorArgument();
      expect(argument.getAccountIdForOrigin(ORIGIN)).toBe(ACCOUNT_ID);
      expect(argument.getAccountIdForOrigin('https://other.com')).toBe(
        undefined,
      );
    });

    it('routes signMessage requests to the signMessage$ flow', () => {
      const { dependencies, emissions } = runSideEffect();
      dependencies.requestSubject.next({
        resolve: vi.fn(),
        type: 'signMessage',
        requestingDapp: mockDapp,
        address: OWN_ADDRESS,
        message: 'hello',
        signatureType: 'ecdsa',
      });

      expect(signMessage$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signMessage',
          }) as BitcoinConfirmationRequest,
          actions,
        }),
      );
      expect(emissions).toContainEqual({ type: 'SIGN_MESSAGE_ACTION' });
    });

    it('routes signPsbt requests to the signPsbt$ flow', () => {
      const { dependencies, emissions } = runSideEffect();
      dependencies.requestSubject.next({
        resolve: vi.fn(),
        type: 'signPsbt',
        requestingDapp: mockDapp,
        psbtsBase64: ['cHNidP8BAAoAAAAAAAAAAAAA'],
      });

      expect(signPsbt$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signPsbt',
          }) as BitcoinConfirmationRequest,
        }),
      );
      expect(emissions).toContainEqual({ type: 'SIGN_PSBT_ACTION' });
    });

    it('blocks requests while the wallet is locked', () => {
      const { dependencies } = runSideEffect({
        stateObservables: {
          ...createStateObservables(),
          appLock: { isUnlocked$: of(false) },
        },
      });
      dependencies.requestSubject.next({
        resolve: vi.fn(),
        type: 'signMessage',
        requestingDapp: mockDapp,
      });

      expect(signMessage$).not.toHaveBeenCalled();
    });

    it('ignores unknown request types', () => {
      const { dependencies, emissions } = runSideEffect();
      dependencies.requestSubject.next({
        resolve: vi.fn(),
        type: 'unknown',
        requestingDapp: mockDapp,
      } as never);

      expect(signMessage$).not.toHaveBeenCalled();
      expect(signPsbt$).not.toHaveBeenCalled();
      expect(emissions).toEqual([]);
    });

    describe('signMessage callback', () => {
      const setupSignMessage = () => {
        const context = runSideEffect();
        context.dependencies.requestSubject.next({
          resolve: vi.fn(),
          type: 'signMessage',
          requestingDapp: mockDapp,
          address: OWN_ADDRESS,
          message: 'hello',
          signatureType: 'ecdsa',
        });
        const flowParams = vi.mocked(signMessage$).mock.calls[0][0];
        const results: BitcoinSigningResult[] = [];
        flowParams.signingResult$.subscribe(result => results.push(result));
        return {
          ...context,
          results,
          signMessage: context.dependencies.getConnectorArgument().signMessage,
        };
      };

      it('signs via the data signer and reports success', async () => {
        const { dependencies, results, signMessage } = setupSignMessage();
        const signData = vi.fn().mockReturnValue(of({ signature: 'a1b2' }));
        dependencies.signerFactory.createDataSigner.mockReturnValue({
          signData,
        });

        await expect(
          signMessage({
            address: OWN_ADDRESS,
            message: 'hello',
            signatureType: 'bip322-simple',
          }),
        ).resolves.toBe('a1b2');

        expect(
          dependencies.signerFactory.createDataSigner,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ wallet, accountId: ACCOUNT_ID }),
        );
        expect(signData).toHaveBeenCalledWith({
          address: OWN_ADDRESS,
          message: 'hello',
          signatureType: 'bip322-simple',
        });
        expect(results).toEqual([{ type: 'success' }]);
      });

      it('rejects when no account owns the signing address', async () => {
        const { results, signMessage } = setupSignMessage();

        await expect(
          signMessage({
            address: 'bc1qunknown',
            message: 'hello',
            signatureType: 'ecdsa',
          }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
        expect(results).toEqual([{ type: 'error' }]);
      });

      it('rejects when no wallet holds the owning account', async () => {
        const context = runSideEffect({
          stateObservables: {
            ...createStateObservables(),
            wallets: {
              selectActiveNetworkAccounts$: of([account]),
              selectAll$: of([]),
            },
          },
        });
        const signMessage =
          context.dependencies.getConnectorArgument().signMessage;

        await expect(
          signMessage({
            address: OWN_ADDRESS,
            message: 'hello',
            signatureType: 'ecdsa',
          }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
      });

      it('maps auth cancellation to a cancelled result', async () => {
        const { dependencies, results, signMessage } = setupSignMessage();
        dependencies.signerFactory.createDataSigner.mockReturnValue({
          signData: () => throwError(() => new AuthenticationCancelledError()),
        });

        await expect(
          signMessage({
            address: OWN_ADDRESS,
            message: 'hello',
            signatureType: 'ecdsa',
          }),
        ).rejects.toBeInstanceOf(AuthenticationCancelledError);
        expect(results).toEqual([{ type: 'cancelled' }]);
      });

      it('maps signer failures to an error result', async () => {
        const { dependencies, results, signMessage } = setupSignMessage();
        dependencies.signerFactory.createDataSigner.mockReturnValue({
          signData: () => throwError(() => new Error('signer exploded')),
        });

        await expect(
          signMessage({
            address: OWN_ADDRESS,
            message: 'hello',
            signatureType: 'ecdsa',
          }),
        ).rejects.toThrow('signer exploded');
        expect(results).toEqual([{ type: 'error' }]);
      });
    });

    describe('signPsbt callback', () => {
      const setupSignPsbt = () => {
        const context = runSideEffect();
        context.dependencies.requestSubject.next({
          resolve: vi.fn(),
          type: 'signPsbt',
          requestingDapp: mockDapp,
          psbtsBase64: ['cHNidP8BAAoAAAAAAAAAAAAA'],
        });
        const flowParams = vi.mocked(signPsbt$).mock.calls[0][0];
        const results: BitcoinSigningResult[] = [];
        flowParams.signingResult$.subscribe(result => results.push(result));
        return {
          ...context,
          results,
          signPsbt: context.dependencies.getConnectorArgument().signPsbt,
        };
      };

      it('signs via the transaction signer using the wire format and returns the finalized PSBT', async () => {
        const { dependencies, results, signPsbt } = setupSignPsbt();
        const psbt = createOwnedPsbt();
        const psbtBase64 = psbt.toBase64();
        const rawTxHex = signedRawTxFor(psbt);
        const sign = vi.fn().mockReturnValue(
          of({
            serializedTx: HexBytes.fromUTF8(
              JSON.stringify({ network: 'mainnet', hex: rawTxHex }),
            ),
          }),
        );
        dependencies.signerFactory.createTransactionSigner.mockReturnValue({
          sign,
        });

        const signedBase64 = await signPsbt(psbtBase64, ACCOUNT_ID);

        expect(
          dependencies.signerFactory.createTransactionSigner,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ wallet, accountId: ACCOUNT_ID }),
        );
        const signRequest = sign.mock.calls[0][0] as {
          serializedTx: HexBytes;
        };
        const dto = JSON.parse(
          HexBytes.toUTF8(signRequest.serializedTx),
        ) as BitcoinUnsignedTxDto;
        expect(dto.context).toBe(
          Buffer.from(psbtBase64, 'base64').toString('hex'),
        );
        expect(dto.network).toBe(BitcoinNetwork.Mainnet);
        expect(dto.signers).toEqual([
          {
            publicKeyHex: PUBKEY_HEX,
            addressType: 'NativeSegWit',
            account: 0,
            chain: 'external',
            index: 0,
            network: BitcoinNetwork.Mainnet,
          },
        ]);

        const finalized = bitcoin.Psbt.fromBase64(signedBase64, {
          network: bitcoin.networks.bitcoin,
        });
        expect(finalized.extractTransaction(true).ins[0].witness).toHaveLength(
          2,
        );
        expect(results).toEqual([{ type: 'success' }]);
      });

      it('rejects autoFinalized: false with a clear unsupported error', async () => {
        const { results, signPsbt } = setupSignPsbt();
        const psbtBase64 = createOwnedPsbt().toBase64();

        await expect(
          signPsbt(psbtBase64, ACCOUNT_ID, {
            autoFinalized: false,
          } as Parameters<SignBitcoinPsbtFunction>[2]),
        ).rejects.toMatchObject({
          code: BitcoinAPIErrorCode.InvalidRequest,
          info: expect.stringContaining('autoFinalized: false') as string,
        });
        expect(results).toEqual([{ type: 'error' }]);
      });

      it('rejects PSBTs spending inputs the account does not own', async () => {
        const { signPsbt } = setupSignPsbt();
        const foreign = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(
            '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
            'hex',
          ),
          network: bitcoin.networks.bitcoin,
        });
        const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
        psbt.addInput({
          hash: Buffer.alloc(32, 1),
          index: 0,
          witnessUtxo: { script: foreign.output!, value: 10_000 },
        });
        psbt.addOutput({ address: OWN_ADDRESS, value: 9000 });

        await expect(
          signPsbt(psbt.toBase64(), ACCOUNT_ID),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InvalidRequest });
      });

      it('rejects malformed PSBTs with an InvalidRequest error', async () => {
        const { signPsbt } = setupSignPsbt();
        await expect(
          signPsbt('bm90LWEtcHNidA==', ACCOUNT_ID),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InvalidRequest });
      });

      it('rejects an input requesting a sighash other than SIGHASH_ALL', async () => {
        const { dependencies, signPsbt } = setupSignPsbt();

        await expect(
          signPsbt(
            createOwnedPsbt(bitcoin.Transaction.SIGHASH_SINGLE).toBase64(),
            ACCOUNT_ID,
          ),
        ).rejects.toMatchObject({
          code: BitcoinAPIErrorCode.InvalidRequest,
          info: 'Cannot sign input(s) 0: only SIGHASH_ALL is supported',
        });
        expect(
          dependencies.signerFactory.createTransactionSigner,
        ).not.toHaveBeenCalled();
      });

      it('rejects a toSignInputs entry that allows a sighash other than SIGHASH_ALL', async () => {
        const { dependencies, signPsbt } = setupSignPsbt();

        await expect(
          signPsbt(createOwnedPsbt().toBase64(), ACCOUNT_ID, {
            toSignInputs: [
              { index: 0, sighashTypes: [bitcoin.Transaction.SIGHASH_NONE] },
            ],
          }),
        ).rejects.toMatchObject({
          code: BitcoinAPIErrorCode.InvalidRequest,
          info: 'Cannot sign input(s) 0: only SIGHASH_ALL is supported',
        });
        expect(
          dependencies.signerFactory.createTransactionSigner,
        ).not.toHaveBeenCalled();
      });

      it('rejects toSignInputs that exclude inputs', async () => {
        const { signPsbt } = setupSignPsbt();
        const psbtBase64 = createOwnedPsbt().toBase64();

        await expect(
          signPsbt(psbtBase64, ACCOUNT_ID, { toSignInputs: [] }),
        ).rejects.toMatchObject({
          code: BitcoinAPIErrorCode.InvalidRequest,
          info: expect.stringContaining('toSignInputs') as string,
        });
      });

      it('rejects when the account is not a known Bitcoin account', async () => {
        const { results, signPsbt } = setupSignPsbt();

        await expect(
          signPsbt(createOwnedPsbt().toBase64(), AccountId('missing')),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
        expect(results).toEqual([{ type: 'error' }]);
      });

      it('rejects when the account has no addresses', async () => {
        const context = runSideEffect({
          stateObservables: {
            ...createStateObservables(),
            addresses: { selectAllAddresses$: of([]) },
          },
        });
        const signPsbt = context.dependencies.getConnectorArgument().signPsbt;

        await expect(
          signPsbt(createOwnedPsbt().toBase64(), ACCOUNT_ID),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
      });

      it('rejects when the owning address is missing derivation data', async () => {
        const context = runSideEffect({
          stateObservables: {
            ...createStateObservables(),
            addresses: {
              selectAllAddresses$: of([
                {
                  ...ownAddressEntry,
                  data: { network: BitcoinNetwork.Mainnet },
                },
              ]),
            },
          },
        });
        const signPsbt = context.dependencies.getConnectorArgument().signPsbt;

        await expect(
          signPsbt(createOwnedPsbt().toBase64(), ACCOUNT_ID),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
      });

      it('maps auth cancellation to a cancelled result', async () => {
        const { dependencies, results, signPsbt } = setupSignPsbt();
        dependencies.signerFactory.createTransactionSigner.mockReturnValue({
          sign: () => throwError(() => new AuthenticationCancelledError()),
        });

        await expect(
          signPsbt(createOwnedPsbt().toBase64(), ACCOUNT_ID),
        ).rejects.toBeInstanceOf(AuthenticationCancelledError);
        expect(results).toEqual([{ type: 'cancelled' }]);
      });

      it('rejects when the signer returns an unexpected payload', async () => {
        const { dependencies, results, signPsbt } = setupSignPsbt();
        dependencies.signerFactory.createTransactionSigner.mockReturnValue({
          sign: () =>
            of({ serializedTx: HexBytes.fromUTF8(JSON.stringify({})) }),
        });

        await expect(
          signPsbt(createOwnedPsbt().toBase64(), ACCOUNT_ID),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
        expect(results).toEqual([{ type: 'error' }]);
      });
    });

    describe('send callbacks', () => {
      const builtPsbtHex = (
        outputs: { address: string; value: number }[],
        { statesInputValue = true } = {},
      ) => {
        const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
        psbt.addInput({
          hash: Buffer.alloc(32, 1),
          index: 0,
          ...(statesInputValue
            ? { witnessUtxo: { script: p2wpkh.output!, value: 10_000 } }
            : {}),
        });
        for (const output of outputs) {
          psbt.addOutput(output);
        }
        return psbt.toHex();
      };

      const serializedTxFor = (psbtHex: string) =>
        HexBytes.fromUTF8(
          JSON.stringify({ context: psbtHex, network: 'mainnet', signers: [] }),
        );

      const paymentPsbtHex = builtPsbtHex([
        { address: RECIPIENT_ADDRESS, value: 5000 },
        { address: OWN_ADDRESS, value: 4000 },
      ]);
      const builtSerializedTx = serializedTxFor(paymentPsbtHex);

      const buildTxResultFor = (psbtHex: string) => ({
        buildTx: {
          success: true,
          serializedTx: serializedTxFor(psbtHex),
          fees: [],
        },
      });

      const setupSend = (
        phaseResults: Partial<
          Record<'buildTx' | 'confirmTx' | 'submitTx', unknown>
        > = {},
        stateOverrides?: Record<string, unknown>,
      ) => {
        const actionObservables = createActionObservables();
        const requestedConfigs: { type: string; params: unknown }[] = [];
        const results = {
          buildTx: { success: true, serializedTx: builtSerializedTx, fees: [] },
          confirmTx: { success: true, serializedTx: 'signed-tx' },
          submitTx: { success: true, txId: 'tx-id-123' },
          ...phaseResults,
        };

        const respondToPhaseRequests = (emission: unknown) => {
          const action = emission as {
            type?: string;
            payload?: {
              executionId: string;
              config: { type: keyof typeof results; params: unknown };
            };
          };
          if (action.type !== 'txExecutor/tx-phase-requested') return;
          const { executionId, config } = action.payload!;
          requestedConfigs.push(config);
          actionObservables.txExecutor.txPhaseCompleted$.next({
            payload: { executionId, result: results[config.type] },
          });
        };

        const context = runSideEffect({
          actionObservables,
          onEmission: respondToPhaseRequests,
          ...(stateOverrides ? { stateObservables: stateOverrides } : {}),
        });

        const argument = context.dependencies.getConnectorArgument();
        return {
          ...context,
          requestedConfigs,
          buildSendTx: argument.buildSendTx,
          confirmSendTx: argument.confirmSendTx,
          submitRawTx: argument.submitRawTx,
        };
      };

      it('builds the payment and returns its PSBT for review', async () => {
        const { requestedConfigs, buildSendTx } = setupSend();

        const built = await buildSendTx('bc1qrecipient', 5000, {
          accountId: ACCOUNT_ID,
          feeRate: 7,
        });

        expect(requestedConfigs.map(config => config.type)).toEqual([
          'buildTx',
        ]);
        const buildParams = requestedConfigs[0].params as {
          accountId: string;
          txParams: {
            address: string;
            tokenTransfers: { token: { tokenId: string } }[];
            blockchainSpecific: { feeRate: unknown };
          }[];
        };
        expect(buildParams.accountId).toBe(ACCOUNT_ID);
        expect(buildParams.txParams[0].address).toBe('bc1qrecipient');
        expect(buildParams.txParams[0].tokenTransfers[0].token.tokenId).toBe(
          BITCOIN_TOKEN_ID,
        );
        // The dApp asks for 7 sat/vB; the executor takes BTC per kB.
        expect(buildParams.txParams[0].blockchainSpecific.feeRate).toEqual({
          feeOption: 'Custom',
          customFeeRate: 0.00007,
        });
        expect(built.serializedTx).toBe(builtSerializedTx);
        expect(built.psbtBase64).toBe(
          Buffer.from(paymentPsbtHex, 'hex').toString('base64'),
        );
      });

      it('reports the amount leaving the account, fee included, as the net effect', async () => {
        const { buildSendTx } = setupSend();

        const built = await buildSendTx(RECIPIENT_ADDRESS, 5000, {
          accountId: ACCOUNT_ID,
        });

        expect(built.netSatoshis).toBe(-6000);
      });

      it('reports only the fee as the net effect when the payment goes back to the account', async () => {
        const { buildSendTx } = setupSend(
          buildTxResultFor(
            builtPsbtHex([{ address: OWN_ADDRESS, value: 9000 }]),
          ),
        );

        const built = await buildSendTx(OWN_ADDRESS, 9000, {
          accountId: ACCOUNT_ID,
        });

        expect(built.netSatoshis).toBe(-1000);
      });

      it('omits the net effect when the built PSBT does not state an input value', async () => {
        const { buildSendTx } = setupSend(
          buildTxResultFor(
            builtPsbtHex(
              [
                { address: RECIPIENT_ADDRESS, value: 5000 },
                { address: OWN_ADDRESS, value: 4000 },
              ],
              { statesInputValue: false },
            ),
          ),
        );

        const built = await buildSendTx(RECIPIENT_ADDRESS, 5000, {
          accountId: ACCOUNT_ID,
        });

        expect(built.netSatoshis).toBeUndefined();
      });

      it('omits the net effect when the built PSBT does not decode', async () => {
        const { buildSendTx } = setupSend(buildTxResultFor('deadbeef'));

        const built = await buildSendTx(RECIPIENT_ADDRESS, 5000, {
          accountId: ACCOUNT_ID,
        });

        expect(built.netSatoshis).toBeUndefined();
      });

      it('omits the net effect when the account has no addresses to judge ownership by', async () => {
        const { buildSendTx } = setupSend(
          {},
          {
            ...createStateObservables(),
            addresses: { selectAllAddresses$: of([]) },
          },
        );

        const built = await buildSendTx(RECIPIENT_ADDRESS, 5000, {
          accountId: ACCOUNT_ID,
        });

        expect(built.netSatoshis).toBeUndefined();
      });

      it('confirms and submits the reviewed transaction', async () => {
        const { requestedConfigs, confirmSendTx } = setupSend();

        await expect(
          confirmSendTx({
            accountId: ACCOUNT_ID,
            serializedTx: builtSerializedTx,
            netSatoshis: -6000,
          }),
        ).resolves.toBe('tx-id-123');

        expect(requestedConfigs.map(config => config.type)).toEqual([
          'confirmTx',
          'submitTx',
        ]);
        const confirmParams = requestedConfigs[0].params as {
          serializedTx: string;
          wallet: unknown;
        };
        expect(confirmParams.serializedTx).toBe(builtSerializedTx);
        expect(confirmParams.wallet).toBe(wallet);
        const submitParams = requestedConfigs[1].params as {
          serializedTx: string;
        };
        expect(submitParams.serializedTx).toBe('signed-tx');
      });

      it('records the pending activity with the net effect the review screen showed', async () => {
        const { confirmSendTx } = setupSend();

        await confirmSendTx({
          accountId: ACCOUNT_ID,
          serializedTx: builtSerializedTx,
          netSatoshis: -6000,
        });

        expect(lastUpsertedActivity()).toMatchObject({
          activityId: 'tx-id-123',
          tokenBalanceChanges: [{ tokenId: BITCOIN_TOKEN_ID, amount: '-6000' }],
        });
      });

      it('records the pending activity without an amount when the net effect is unknown', async () => {
        const { confirmSendTx } = setupSend();

        await confirmSendTx({
          accountId: ACCOUNT_ID,
          serializedTx: builtSerializedTx,
        });

        expect(lastUpsertedActivity().tokenBalanceChanges).toEqual([]);
      });

      it('submits a raw transaction through the executor so it lands in pending', async () => {
        const { requestedConfigs, submitRawTx } = setupSend();

        await expect(
          submitRawTx({ accountId: ACCOUNT_ID, rawTxHex: 'deadbeef' }),
        ).resolves.toBe('tx-id-123');

        expect(requestedConfigs.map(config => config.type)).toEqual([
          'submitTx',
        ]);
        const submitParams = requestedConfigs[0].params as {
          serializedTx: string;
        };
        expect(
          JSON.parse(HexBytes.toUTF8(HexBytes(submitParams.serializedTx))),
        ).toEqual({ hex: 'deadbeef', network: 'mainnet' });
        expect(lastUpsertedActivity().tokenBalanceChanges).toEqual([]);
      });

      it('uses the average fee option when no fee rate is given', async () => {
        const { requestedConfigs, buildSendTx } = setupSend();
        await buildSendTx('bc1qrecipient', 5000, { accountId: ACCOUNT_ID });

        const buildParams = requestedConfigs[0].params as {
          txParams: { blockchainSpecific: { feeRate: unknown } }[];
        };
        expect(buildParams.txParams[0].blockchainSpecific.feeRate).toEqual({
          feeOption: 'Average',
        });
      });

      it('rejects non-positive or unsafe satoshi amounts', async () => {
        const { buildSendTx } = setupSend();
        await expect(
          buildSendTx('bc1qrecipient', 0, { accountId: ACCOUNT_ID }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InvalidRequest });
        await expect(
          buildSendTx('bc1qrecipient', 1.5, { accountId: ACCOUNT_ID }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InvalidRequest });
      });

      it('rejects invalid fee rates', async () => {
        const { buildSendTx } = setupSend();
        for (const feeRate of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
          await expect(
            buildSendTx('bc1qrecipient', 5000, {
              accountId: ACCOUNT_ID,
              feeRate,
            }),
          ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InvalidRequest });
        }
      });

      it('rejects a fee rate above the accepted sat/vB ceiling', async () => {
        const { buildSendTx } = setupSend();
        await expect(
          buildSendTx('bc1qrecipient', 5000, {
            accountId: ACCOUNT_ID,
            feeRate: 10_001,
          }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InvalidRequest });
      });

      it('rejects when the account has no Bitcoin token', async () => {
        const { buildSendTx } = setupSend(
          {},
          {
            ...createStateObservables(),
            tokens: { selectTokensGroupedByAccount$: of({}) },
          },
        );

        await expect(
          buildSendTx('bc1qrecipient', 5000, { accountId: ACCOUNT_ID }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
      });

      it('rejects when the build phase fails', async () => {
        const { buildSendTx } = setupSend({
          buildTx: { success: false, errorTranslationKey: 'nope' },
        });
        await expect(
          buildSendTx('bc1qrecipient', 5000, { accountId: ACCOUNT_ID }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
      });

      it('rejects with Refused when confirmation fails or is cancelled', async () => {
        const { confirmSendTx } = setupSend({
          confirmTx: { success: false, errorTranslationKeys: {} },
        });
        await expect(
          confirmSendTx({
            accountId: ACCOUNT_ID,
            serializedTx: builtSerializedTx,
            netSatoshis: -6000,
          }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.Refused });
      });

      it('rejects when submission fails', async () => {
        const { confirmSendTx } = setupSend({
          submitTx: { success: false, errorTranslationKeys: {} },
        });
        await expect(
          confirmSendTx({
            accountId: ACCOUNT_ID,
            serializedTx: builtSerializedTx,
            netSatoshis: -6000,
          }),
        ).rejects.toMatchObject({ code: BitcoinAPIErrorCode.InternalError });
      });
    });
  });

  describe('resolveForeignPsbtInputs', () => {
    const createPreviousTx = () => {
      const previousTx = new bitcoin.Transaction();
      previousTx.version = 2;
      previousTx.addInput(Buffer.alloc(32, 7), 0);
      previousTx.addOutput(p2wpkh.output!, 12_345);
      return previousTx;
    };

    const createUnresolvedPsbt = (previousTx: bitcoin.Transaction) => {
      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
      psbt.addInput({
        hash: Buffer.from(previousTx.getId(), 'hex').reverse(),
        index: 0,
      });
      psbt.addOutput({ address: OWN_ADDRESS, value: 9000 });
      return psbt;
    };

    const runResolve = ({
      psbtsBase64,
      getRawTransaction,
      activeNetworkSelector = () => BitcoinNetworkId('mainnet'),
    }: {
      psbtsBase64: string[];
      getRawTransaction: ReturnType<typeof vi.fn>;
      activeNetworkSelector?: () => unknown;
    }) => {
      const setPendingSignPsbtRequest$ = new Subject<{
        payload: { psbtsBase64: string[] } | null;
      }>();
      const emissions: unknown[] = [];
      resolveForeignPsbtInputs(
        {
          bitcoinDappConnector: { setPendingSignPsbtRequest$ },
        } as never,
        {
          addresses: { selectAllAddresses$: of([ownAddressEntry]) },
          network: { selectActiveNetworkId$: of(activeNetworkSelector) },
        } as never,
        {
          actions,
          bitcoinProvider: { getRawTransaction },
        } as never,
      ).subscribe(emission => emissions.push(emission));

      setPendingSignPsbtRequest$.next({ payload: { psbtsBase64 } });
      return emissions;
    };

    it('resolves missing previous outputs via the provider', async () => {
      const previousTx = createPreviousTx();
      const psbt = createUnresolvedPsbt(previousTx);
      const getRawTransaction = vi
        .fn()
        .mockReturnValue(of(Ok(previousTx.toHex())));

      const emissions = runResolve({
        psbtsBase64: [psbt.toBase64()],
        getRawTransaction,
      });
      await flushAsync();

      expect(getRawTransaction).toHaveBeenCalledWith(
        { network: BitcoinNetwork.Mainnet },
        previousTx.getId(),
      );
      expect(emissions).toEqual([
        bitcoinDappConnectorActions.bitcoinDappConnector.startResolvingInputs(),
        bitcoinDappConnectorActions.bitcoinDappConnector.setResolvedInputs({
          [`${previousTx.getId()}:0`]: {
            value: 12_345,
            scriptHex: p2wpkh.output!.toString('hex'),
          },
        }),
      ]);
    });

    it('resolves against the testnet network when it is the active one', async () => {
      const testnetP2wpkh = bitcoin.payments.p2wpkh({
        pubkey: PUBKEY,
        network: bitcoin.networks.testnet,
      });
      const previousTx = createPreviousTx();
      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
      psbt.addInput({
        hash: Buffer.from(previousTx.getId(), 'hex').reverse(),
        index: 0,
      });
      psbt.addOutput({ address: testnetP2wpkh.address!, value: 9000 });
      const getRawTransaction = vi
        .fn()
        .mockReturnValue(of(Ok(previousTx.toHex())));

      const emissions = runResolve({
        psbtsBase64: [psbt.toBase64()],
        getRawTransaction,
        activeNetworkSelector: () => BitcoinNetworkId('testnet4'),
      });
      await flushAsync();

      expect(getRawTransaction).toHaveBeenCalledWith(
        { network: BitcoinNetwork.Testnet },
        previousTx.getId(),
      );
      expect(emissions).toContainEqual(
        bitcoinDappConnectorActions.bitcoinDappConnector.setResolvedInputs({
          [`${previousTx.getId()}:0`]: {
            value: 12_345,
            scriptHex: p2wpkh.output!.toString('hex'),
          },
        }),
      );
    });

    it('resolves to an empty map without provider calls when all inputs are self-contained', async () => {
      const getRawTransaction = vi.fn();
      const emissions = runResolve({
        psbtsBase64: [createOwnedPsbt().toBase64()],
        getRawTransaction,
      });
      await flushAsync();

      expect(getRawTransaction).not.toHaveBeenCalled();
      expect(emissions).toEqual([
        bitcoinDappConnectorActions.bitcoinDappConnector.startResolvingInputs(),
        bitcoinDappConnectorActions.bitcoinDappConnector.setResolvedInputs({}),
      ]);
    });

    it('fails resolution when the provider errors', async () => {
      const previousTx = createPreviousTx();
      const psbt = createUnresolvedPsbt(previousTx);
      const getRawTransaction = vi
        .fn()
        .mockReturnValue(of(Err({ reason: 'boom' })));

      const emissions = runResolve({
        psbtsBase64: [psbt.toBase64()],
        getRawTransaction,
      });
      await flushAsync();

      expect(emissions).toEqual([
        bitcoinDappConnectorActions.bitcoinDappConnector.startResolvingInputs(),
        bitcoinDappConnectorActions.bitcoinDappConnector.failResolvingInputs(),
      ]);
    });

    it('fails resolution when the fetched transaction does not hash to the requested txid', async () => {
      const previousTx = createPreviousTx();
      const psbt = createUnresolvedPsbt(previousTx);
      const otherTx = createPreviousTx();
      otherTx.addOutput(p2wpkh.output!, 1);
      const getRawTransaction = vi
        .fn()
        .mockReturnValue(of(Ok(otherTx.toHex())));

      const emissions = runResolve({
        psbtsBase64: [psbt.toBase64()],
        getRawTransaction,
      });
      await flushAsync();

      expect(emissions).toEqual([
        bitcoinDappConnectorActions.bitcoinDappConnector.startResolvingInputs(),
        bitcoinDappConnectorActions.bitcoinDappConnector.failResolvingInputs(),
      ]);
    });

    it('fails resolution when the referenced output does not exist', async () => {
      const previousTx = createPreviousTx();
      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
      psbt.addInput({
        hash: Buffer.from(previousTx.getId(), 'hex').reverse(),
        index: 5,
      });
      psbt.addOutput({ address: OWN_ADDRESS, value: 9000 });
      const getRawTransaction = vi
        .fn()
        .mockReturnValue(of(Ok(previousTx.toHex())));

      const emissions = runResolve({
        psbtsBase64: [psbt.toBase64()],
        getRawTransaction,
      });
      await flushAsync();

      expect(emissions).toEqual([
        bitcoinDappConnectorActions.bitcoinDappConnector.startResolvingInputs(),
        bitcoinDappConnectorActions.bitcoinDappConnector.failResolvingInputs(),
      ]);
    });

    it('fails resolution when there is no active Bitcoin network', async () => {
      const previousTx = createPreviousTx();
      const psbt = createUnresolvedPsbt(previousTx);
      const emissions = runResolve({
        psbtsBase64: [psbt.toBase64()],
        getRawTransaction: vi.fn(),
        activeNetworkSelector: () => undefined,
      });
      await flushAsync();

      expect(emissions).toEqual([
        bitcoinDappConnectorActions.bitcoinDappConnector.startResolvingInputs(),
        bitcoinDappConnectorActions.bitcoinDappConnector.failResolvingInputs(),
      ]);
    });
  });

  describe('closeRequestedPopup', () => {
    const popupViewId = ViewId('view-1');
    const signTxPopup = {
      id: popupViewId,
      type: 'popupWindow',
      location: '/bitcoin-dapp-sign-tx',
    };

    const runCloseRequested = (openViews: unknown[]) => {
      const closePopupRequested$ = new Subject<{ payload: string }>();
      const emissions: unknown[] = [];
      closeRequestedPopup(
        { bitcoinDappConnector: { closePopupRequested$ } } as never,
        { views: { selectOpenViews$: of(openViews) } } as never,
        { actions } as never,
      ).subscribe(emission => emissions.push(emission));
      return { closePopupRequested$, emissions };
    };

    it('closes the popup window open at the requested location', () => {
      const { closePopupRequested$, emissions } = runCloseRequested([
        { id: 'view-0', type: 'sidePanel', location: '/' },
        signTxPopup,
      ]);

      closePopupRequested$.next({ payload: '/bitcoin-dapp-sign-tx' });

      expect(emissions).toEqual([viewsActions.views.closeView(popupViewId)]);
    });

    it('emits nothing when no popup window is open at that location', () => {
      const { closePopupRequested$, emissions } = runCloseRequested([
        { id: 'view-0', type: 'sidePanel', location: '/bitcoin-dapp-sign-tx' },
      ]);

      closePopupRequested$.next({ payload: '/bitcoin-dapp-sign-tx' });

      expect(emissions).toEqual([]);
    });
  });

  describe('initializeLaceExtensionSideEffects', () => {
    it('returns the connector, foreign input resolution, authorize, and popup close side effects', () => {
      const sideEffects = initializeLaceExtensionSideEffects(
        {} as never,
        {} as never,
      );
      expect(sideEffects).toEqual([
        connectBitcoinDappConnectorApi,
        resolveForeignPsbtInputs,
        promptBitcoinAuthorizeDapp,
        closeRequestedPopup,
      ]);
    });
  });
});
