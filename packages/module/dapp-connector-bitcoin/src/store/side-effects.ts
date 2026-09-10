import { ActivityType } from '@lace-contract/activities';
import {
  BITCOIN_TOKEN_ID,
  BitcoinNetworkId,
  feeRateFromSatsPerVByte,
} from '@lace-contract/bitcoin-context';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import {
  makeBuildTx,
  makeConfirmTx,
  makeSubmitTx,
} from '@lace-contract/tx-executor';
import {
  finalizePsbtWithRawTransaction,
  inspectPsbt,
  nonDefaultSighashInputs,
} from '@lace-lib/bitcoin-psbt';
import { BigNumber, HexBytes, Timestamp } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  firstValueFrom,
  forkJoin,
  from,
  ignoreElements,
  map,
  merge,
  mergeMap,
  of,
  Subject,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';

import { BitcoinAPIError, BitcoinAPIErrorCode } from '../api-error';
import { toBitcoinJsNetwork } from '../utils/bitcoin-network';

import { promptBitcoinAuthorizeDapp } from './authorize-dapp-util';
import { signMessage$, signPsbt$ } from './util';

import type {
  BitcoinAccountUtxoMap,
  BuildSendTxFunction,
  ConfirmSendTxFunction,
  SubmitRawTxFunction,
  SignBitcoinMessageFunction,
  SignBitcoinPsbtFunction,
} from './dependencies/bitcoin-dapp-connector-api';
import type { BitcoinConfirmationRequest } from './dependencies/create-confirmation-callback';
import type { ResolvedPreviousOut } from './slice';
import type { BitcoinSigningResult } from './util';
import type { ActionCreators, SideEffect } from '../index';
import type { SignPsbtOptions } from '../types';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type {
  BitcoinAddressData,
  BitcoinBlockchainSpecificTxData,
  BitcoinNetwork,
  BitcoinProvider,
  BitcoinSignerContext,
  BitcoinUnsignedTxDto,
} from '@lace-contract/bitcoin-context';
import type { ActionType, LaceInitSync } from '@lace-contract/module';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { SignerFactory } from '@lace-contract/signer';
import type { Token } from '@lace-contract/tokens';
import type {
  BuildTx,
  ConfirmTx,
  SubmitTx,
  TokenTransfer,
  TxBuildResult,
  TxConfirmationResult,
  TxParams,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * Signed transaction payload produced by the Bitcoin transaction signers:
 * the fully signed raw transaction hex and the network it belongs to.
 */
type SignedTransactionPayload = {
  network?: string;
  hex: string;
};

const findBitcoinAccount = (
  accounts: AnyAccount[],
  accountId: AccountId,
): AnyAccount => {
  const account = accounts.find(
    candidate =>
      candidate.accountId === accountId &&
      candidate.blockchainName === 'Bitcoin',
  );
  if (!account) {
    throw new BitcoinAPIError(
      BitcoinAPIErrorCode.InternalError,
      `Bitcoin account not found: ${accountId}`,
    );
  }
  return account;
};

const findWallet = (wallets: AnyWallet[], account: AnyAccount): AnyWallet => {
  const wallet = wallets.find(
    candidate => candidate.walletId === account.walletId,
  );
  if (!wallet) {
    throw new BitcoinAPIError(
      BitcoinAPIErrorCode.InternalError,
      `Wallet not found for ID: ${account.walletId}`,
    );
  }
  return wallet;
};

/**
 * No contract this module depends on exposes a per-account Bitcoin UTXO map
 * yet; that state lives inside the blockchain-bitcoin module, which this
 * module cannot import (see ADR 14: modules never import from other
 * modules). BitcoinDappConnectorApi's provider fetch path is therefore the
 * source of truth for getBalance/getUtxos, and this map is intentionally
 * always empty until such a selector is added to a shared contract.
 */
const NO_SYNCED_ACCOUNT_UTXOS$: Observable<BitcoinAccountUtxoMap> = of({});

const bitcoinAddressesOf = (
  addresses: AnyAddress[],
  accountId: AccountId,
): AnyAddress[] =>
  addresses.filter(
    address =>
      address.blockchainName === 'Bitcoin' && address.accountId === accountId,
  );

/**
 * Parameters for creating the message signing wrapper.
 */
type CreateSignMessageWrapperParams = {
  selectAllAddresses$: Observable<AnyAddress[]>;
  selectActiveNetworkAccounts$: Observable<AnyAccount[]>;
  selectAll$: Observable<AnyWallet[]>;
  signerFactory: SignerFactory;
  accessAuthSecret: AccessAuthSecret;
  authenticate: Authenticate;
  signingResult$: Subject<BitcoinSigningResult>;
};

/**
 * Creates the signMessage callback: resolves the account that owns the
 * signing address, shows the auth prompt via the signer factory's data
 * signer, and reports the outcome to the review flow.
 */
const createSignMessageWrapper = ({
  selectAllAddresses$,
  selectActiveNetworkAccounts$,
  selectAll$,
  signerFactory,
  accessAuthSecret,
  authenticate,
  signingResult$,
}: CreateSignMessageWrapperParams): SignBitcoinMessageFunction => {
  return async ({ address, message, signatureType }) => {
    try {
      const addresses = await firstValueFrom(selectAllAddresses$);
      const owningAddress = addresses.find(
        candidate =>
          candidate.blockchainName === 'Bitcoin' &&
          candidate.address === address,
      );
      if (!owningAddress) {
        throw new BitcoinAPIError(
          BitcoinAPIErrorCode.InternalError,
          `No account owns the signing address: ${address}`,
        );
      }

      const accounts = await firstValueFrom(selectActiveNetworkAccounts$);
      const account = findBitcoinAccount(accounts, owningAddress.accountId);
      const wallets = await firstValueFrom(selectAll$);
      const wallet = findWallet(wallets, account);

      const auth = signerAuthFromPrompt(
        { accessAuthSecret, authenticate },
        {
          cancellable: true,
          confirmButtonLabel:
            'authentication-prompt.confirm-button-label.sign-data',
          message: 'authentication-prompt.message.sign-data',
        },
      );

      const signerContext: BitcoinSignerContext = {
        wallet,
        accountId: account.accountId,
        auth,
      };
      const signer = signerFactory.createDataSigner(signerContext);
      const result = (await firstValueFrom(
        signer.signData({ address, message, signatureType }),
      )) as { signature: HexBytes };

      signingResult$.next({ type: 'success' });
      return result.signature;
    } catch (error) {
      signingResult$.next(
        error instanceof AuthenticationCancelledError
          ? { type: 'cancelled' }
          : { type: 'error' },
      );
      throw error;
    }
  };
};

/**
 * Parameters for creating the PSBT signing wrapper.
 */
type CreateSignPsbtWrapperParams = {
  selectAllAddresses$: Observable<AnyAddress[]>;
  selectActiveNetworkAccounts$: Observable<AnyAccount[]>;
  selectAll$: Observable<AnyWallet[]>;
  signerFactory: SignerFactory;
  accessAuthSecret: AccessAuthSecret;
  authenticate: Authenticate;
  signingResult$: Subject<BitcoinSigningResult>;
};

type SignerEntry = BitcoinUnsignedTxDto['signers'][number];

/**
 * Maps each PSBT input to the derivation coordinates of the account address
 * that owns it, in input order, as the transaction signers consume them.
 * @throws BitcoinAPIError when an input is not owned by the account or its
 * address is missing derivation data
 */
const buildSignerEntries = (
  inspectedInputs: ReturnType<typeof inspectPsbt>['inputs'],
  accountAddresses: AnyAddress[],
): SignerEntry[] => {
  const dataByAddress = new Map(
    accountAddresses.map(address => [
      address.address as string,
      address.data as BitcoinAddressData | undefined,
    ]),
  );

  return inspectedInputs.map(input => {
    if (!input.address || !input.isOwn) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        `Cannot sign input ${input.index}: it does not spend an output owned by the connected account`,
      );
    }
    const data = dataByAddress.get(input.address);
    if (
      !data?.addressType ||
      !data.chain ||
      !data.publicKeyHex ||
      data.account === undefined ||
      data.index === undefined
    ) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        `Missing derivation data for address: ${input.address}`,
      );
    }
    return {
      publicKeyHex: data.publicKeyHex,
      addressType: data.addressType,
      account: data.account,
      chain: data.chain,
      index: data.index,
      network: data.network,
    };
  });
};

/**
 * Creates the signPsbt callback: validates the request against the account's
 * addresses, encodes the PSBT into the transaction signer wire format, signs
 * it (with the auth prompt), and returns the finalized PSBT as base64.
 *
 * A request to skip finalization is rejected with a clear error: the wallet's
 * transaction signers always finalize and extract, so an unfinalized signed
 * PSBT cannot be produced. BitcoinDappConnectorApi already rejects this before
 * the confirmation review opens; the check here is a defense-in-depth backstop
 * for this callback's own contract.
 *
 * The same holds for the input checks: the API refuses a foreign input, an
 * input whose previous output the PSBT does not embed, and a toSignInputs
 * selection that leaves an input unsigned, all before any review opens. The
 * checks here only backstop this callback's own contract, since nothing between
 * the review and the signers re-examines the PSBT.
 *
 * Only SIGHASH_ALL is signed, and that check cannot be left to the signers:
 * the hardware ones forward the PSBT's sighash fields to the device and merge
 * back whatever it returns, so nothing below this point would object.
 */
const createSignPsbtWrapper = ({
  selectAllAddresses$,
  selectActiveNetworkAccounts$,
  selectAll$,
  signerFactory,
  accessAuthSecret,
  authenticate,
  signingResult$,
}: CreateSignPsbtWrapperParams): SignBitcoinPsbtFunction => {
  const signPsbt = async (
    psbtBase64: string,
    accountId: AccountId,
    options?: SignPsbtOptions,
  ): Promise<string> => {
    const rawOptions = options as { autoFinalized?: boolean } | undefined;
    if (rawOptions?.autoFinalized === false) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        'signPsbt with autoFinalized: false is not supported',
      );
    }

    const accounts = await firstValueFrom(selectActiveNetworkAccounts$);
    const account = findBitcoinAccount(accounts, accountId);
    const wallets = await firstValueFrom(selectAll$);
    const wallet = findWallet(wallets, account);

    const addresses = await firstValueFrom(selectAllAddresses$);
    const accountAddresses = bitcoinAddressesOf(addresses, accountId);
    const network = (
      accountAddresses[0]?.data as BitcoinAddressData | undefined
    )?.network;
    if (!network) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'No addresses available for the connected account',
      );
    }

    let inspection: ReturnType<typeof inspectPsbt>;
    try {
      inspection = inspectPsbt(psbtBase64, {
        ownAddresses: new Set(
          accountAddresses.map(address => address.address as string),
        ),
        network: toBitcoinJsNetwork(network),
        toSignInputs: options?.toSignInputs,
      });
    } catch (error) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        error instanceof Error ? error.message : 'Failed to decode PSBT',
      );
    }

    if (
      options?.toSignInputs &&
      inspection.inputs.some(input => !input.willSign)
    ) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        'toSignInputs must cover every input: finalizing requires all inputs signed',
      );
    }

    const sighashIndexes = nonDefaultSighashInputs(
      inspection.inputs,
      options?.toSignInputs,
    );
    if (sighashIndexes.length > 0) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        `Cannot sign input(s) ${sighashIndexes.join(
          ', ',
        )}: only SIGHASH_ALL is supported`,
      );
    }

    const dto: BitcoinUnsignedTxDto = {
      context: Buffer.from(psbtBase64, 'base64').toString('hex'),
      network,
      signers: buildSignerEntries(inspection.inputs, accountAddresses),
    };

    const auth = signerAuthFromPrompt(
      { accessAuthSecret, authenticate },
      {
        cancellable: true,
        confirmButtonLabel: 'authentication-prompt.confirm-button-label',
        message: 'authentication-prompt.message.transaction-confirmation',
      },
    );

    const signerContext: BitcoinSignerContext = { wallet, accountId, auth };
    const signer = signerFactory.createTransactionSigner(signerContext);
    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes.fromUTF8(JSON.stringify(dto)) }),
    );

    const payload = JSON.parse(
      HexBytes.toUTF8(result.serializedTx),
    ) as SignedTransactionPayload;
    if (typeof payload.hex !== 'string') {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Signer returned an unexpected result',
      );
    }

    return finalizePsbtWithRawTransaction(
      psbtBase64,
      payload.hex,
      toBitcoinJsNetwork(network),
    );
  };

  return async (psbtBase64, accountId, options) => {
    try {
      const signed = await signPsbt(psbtBase64, accountId, options);
      signingResult$.next({ type: 'success' });
      return signed;
    } catch (error) {
      signingResult$.next(
        error instanceof AuthenticationCancelledError
          ? { type: 'cancelled' }
          : { type: 'error' },
      );
      throw error;
    }
  };
};

/**
 * Builds the pending activity recorded after a dApp-initiated broadcast, so the
 * transaction shows in the activity list immediately instead of waiting for the
 * next mempool sync to discover it. Mirrors what the send flow records.
 *
 * netSatoshis is omitted whenever the wallet cannot state the net effect: for
 * pushTx, where it was not told what the raw transaction moves, and for a built
 * transaction whose PSBT does not state every input value. The sync fills the
 * amounts in when it sees the tx.
 */
const pendingActivity = ({
  accountId,
  txId,
  netSatoshis,
  blockchainSpecific,
}: {
  accountId: AccountId;
  txId: string;
  netSatoshis?: number;
  blockchainSpecific?: unknown;
}): Activity => ({
  accountId,
  activityId: txId,
  timestamp: Timestamp(Date.now()),
  tokenBalanceChanges:
    netSatoshis === undefined
      ? []
      : [
          {
            tokenId: BITCOIN_TOKEN_ID,
            amount: BigNumber(BigInt(netSatoshis)),
          },
        ],
  type: ActivityType.Pending,
  ...(blockchainSpecific === undefined ? {} : { blockchainSpecific }),
});

/**
 * Net effect a wallet-built transaction has on the account that pays for it:
 * its own outputs minus its own inputs, so the fee counts as spent and value
 * returning to the account does not. This is the figure the review screen shows
 * the user as the balance change.
 *
 * Undefined when the PSBT does not decode or does not state every input value,
 * since any figure derived from it would then understate the spend.
 */
const netEffectOnAccount = ({
  psbtBase64,
  ownAddresses,
  network,
}: {
  psbtBase64: string;
  ownAddresses: ReadonlySet<string>;
  network?: BitcoinNetwork;
}): number | undefined => {
  if (!network) return undefined;
  try {
    const inspection = inspectPsbt(psbtBase64, {
      ownAddresses,
      network: toBitcoinJsNetwork(network),
    });
    return inspection.unresolvedInputs.length > 0
      ? undefined
      : inspection.netBalanceChange;
  } catch {
    return undefined;
  }
};

type CreateBuildSendTxWrapperParams = {
  buildTx: BuildTx;
  selectAllAddresses$: Observable<AnyAddress[]>;
  selectActiveNetworkAccounts$: Observable<AnyAccount[]>;
  selectTokensGroupedByAccount$: Observable<
    Record<string, { fungible: Token[]; nfts: Token[] }>
  >;
  dispatch: (action: ActionType<ActionCreators>) => void;
};

type CreateConfirmSendTxWrapperParams = {
  confirmTx: ConfirmTx;
  submitTx: SubmitTx;
  selectActiveNetworkAccounts$: Observable<AnyAccount[]>;
  selectAll$: Observable<AnyWallet[]>;
  dispatch: (action: ActionType<ActionCreators>) => void;
  signingResult$: Subject<BitcoinSigningResult>;
  actions: ActionCreators;
};

type CreateSubmitRawTxWrapperParams = {
  submitTx: SubmitTx;
  activeNetworkId$: Observable<BlockchainNetworkId | undefined>;
  dispatch: (action: ActionType<ActionCreators>) => void;
  actions: ActionCreators;
};

type PhaseResultBox<Result> = { txPhaseResult: Result };

const isPhaseResultBox = <Result>(
  value: unknown,
): value is PhaseResultBox<Result> =>
  typeof value === 'object' && value !== null && 'txPhaseResult' in value;

/**
 * Runs one tx executor phase entry point: forwards the txPhaseRequested
 * action it emits to the store and resolves with the phase result.
 */
const runTxPhase = async <Result>(
  phase$: Observable<unknown>,
  dispatch: (action: ActionType<ActionCreators>) => void,
): Promise<Result> =>
  firstValueFrom(
    phase$.pipe(
      tap(value => {
        if (!isPhaseResultBox<Result>(value)) {
          dispatch(value as ActionType<ActionCreators>);
        }
      }),
      filter(isPhaseResultBox<Result>),
      map(box => box.txPhaseResult),
    ),
  );

/**
 * Creates the buildSendTx callback: turns a dApp send request into a built
 * transaction and hands back its PSBT so the review screen can show the
 * recipient, amount and fee before anything is signed, along with the net
 * effect the transaction has on the account once broadcast.
 */
const createBuildSendTxWrapper = ({
  buildTx,
  selectAllAddresses$,
  selectActiveNetworkAccounts$,
  selectTokensGroupedByAccount$,
  dispatch,
}: CreateBuildSendTxWrapperParams): BuildSendTxFunction => {
  return async (toAddress, satoshis, { accountId, feeRate }) => {
    if (!Number.isSafeInteger(satoshis) || satoshis <= 0) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        `Invalid satoshi amount: ${satoshis}`,
      );
    }
    // The dApp names its rate in sat/vB; the executor's `customFeeRate` is
    // BTC-per-kB. Converting here is what keeps a 10 sat/vB request from
    // being charged as 10 BTC/kB.
    const customFeeRate =
      feeRate === undefined ? undefined : feeRateFromSatsPerVByte(feeRate);
    if (feeRate !== undefined && customFeeRate === undefined) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        `Invalid fee rate: ${feeRate}`,
      );
    }

    const accounts = await firstValueFrom(selectActiveNetworkAccounts$);
    findBitcoinAccount(accounts, accountId);

    const accountTokens = (await firstValueFrom(selectTokensGroupedByAccount$))[
      accountId
    ];
    const token = accountTokens?.fungible.find(
      candidate => candidate.tokenId === BITCOIN_TOKEN_ID,
    );
    if (!token) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        `No Bitcoin token found for account: ${accountId}`,
      );
    }

    const blockchainSpecific: BitcoinBlockchainSpecificTxData = {
      memo: '',
      feeRate:
        customFeeRate === undefined
          ? { feeOption: 'Average' }
          : { feeOption: 'Custom', customFeeRate },
    };
    const txParams: [TxParams, ...TxParams[]] = [
      {
        address: toAddress,
        tokenTransfers: [
          { normalizedAmount: BigNumber(BigInt(satoshis)), token },
        ] as [TokenTransfer, ...TokenTransfer[]],
        blockchainSpecific,
      },
    ];

    const buildResult = await runTxPhase<TxBuildResult>(
      buildTx(
        {
          blockchainName: 'Bitcoin',
          accountId,
          serializedTx: '',
          txParams,
          blockchainSpecificSendFlowData: {},
        },
        result => ({ txPhaseResult: result }),
      ),
      dispatch,
    );

    if (!buildResult.success) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Failed to build transaction',
      );
    }

    const dto = JSON.parse(
      HexBytes.toUTF8(HexBytes(buildResult.serializedTx)),
    ) as BitcoinUnsignedTxDto;
    const psbtBase64 = Buffer.from(dto.context, 'hex').toString('base64');

    const addresses = await firstValueFrom(selectAllAddresses$);
    const accountAddresses = bitcoinAddressesOf(addresses, accountId);

    return {
      psbtBase64,
      serializedTx: buildResult.serializedTx,
      netSatoshis: netEffectOnAccount({
        psbtBase64,
        ownAddresses: new Set(
          accountAddresses.map(address => address.address as string),
        ),
        network: (accountAddresses[0]?.data as BitcoinAddressData | undefined)
          ?.network,
      }),
    };
  };
};

/**
 * Creates the confirmSendTx callback: runs the auth prompt, signs and submits
 * the transaction the user just reviewed, reporting the outcome to the review
 * flow so it closes with the right result.
 */
const createConfirmSendTxWrapper = ({
  confirmTx,
  submitTx,
  selectActiveNetworkAccounts$,
  selectAll$,
  dispatch,
  signingResult$,
  actions,
}: CreateConfirmSendTxWrapperParams): ConfirmSendTxFunction => {
  return async ({ accountId, serializedTx, netSatoshis }) => {
    try {
      const accounts = await firstValueFrom(selectActiveNetworkAccounts$);
      const account = findBitcoinAccount(accounts, accountId);
      const wallets = await firstValueFrom(selectAll$);
      const wallet = findWallet(wallets, account);

      const confirmResult = await runTxPhase<TxConfirmationResult>(
        confirmTx(
          {
            blockchainName: 'Bitcoin',
            accountId,
            serializedTx,
            wallet,
            blockchainSpecificSendFlowData: {},
          },
          result => ({ txPhaseResult: result }),
        ),
        dispatch,
      );

      if (!confirmResult.success) {
        signingResult$.next({ type: 'cancelled' });
        throw new BitcoinAPIError(
          BitcoinAPIErrorCode.Refused,
          'Transaction was not confirmed',
        );
      }

      const submitResult = await runTxPhase<TxSubmissionResult>(
        submitTx(
          {
            blockchainName: 'Bitcoin',
            accountId,
            serializedTx: confirmResult.serializedTx,
            blockchainSpecificSendFlowData: {},
          },
          result => ({ txPhaseResult: result }),
        ),
        dispatch,
      );

      if (!submitResult.success) {
        signingResult$.next({ type: 'error' });
        throw new BitcoinAPIError(
          BitcoinAPIErrorCode.InternalError,
          'Transaction submission failed',
        );
      }

      dispatch(
        actions.activities.upsertActivities({
          accountId,
          activities: [
            pendingActivity({
              accountId,
              txId: submitResult.txId,
              netSatoshis,
              blockchainSpecific:
                submitResult.blockchainSpecificActivityMetadata,
            }),
          ],
        }),
      );

      signingResult$.next({ type: 'success' });
      return submitResult.txId;
    } catch (error) {
      if (!(error instanceof BitcoinAPIError)) {
        signingResult$.next({ type: 'error' });
      }
      throw error;
    }
  };
};

/**
 * Creates the submitRawTx callback backing pushTx. Broadcasting through the
 * transaction executor rather than the provider directly is what records the
 * transaction as pending immediately, instead of waiting for the next mempool
 * sync to discover it.
 */
const createSubmitRawTxWrapper = ({
  submitTx,
  activeNetworkId$,
  dispatch,
  actions,
}: CreateSubmitRawTxWrapperParams): SubmitRawTxFunction => {
  return async ({ accountId, rawTxHex }) => {
    const networkId = await firstValueFrom(activeNetworkId$);
    const network = networkId
      ? BitcoinNetworkId.getBitcoinNetwork(networkId)
      : undefined;
    if (!network) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'No active Bitcoin network',
      );
    }

    const serializedTx = HexBytes.fromUTF8(
      JSON.stringify({ hex: rawTxHex, network }),
    );

    const submitResult = await runTxPhase<TxSubmissionResult>(
      submitTx(
        {
          blockchainName: 'Bitcoin',
          accountId,
          serializedTx,
          blockchainSpecificSendFlowData: {},
        },
        result => ({ txPhaseResult: result }),
      ),
      dispatch,
    );

    if (!submitResult.success) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Transaction submission failed',
      );
    }

    dispatch(
      actions.activities.upsertActivities({
        accountId,
        activities: [
          pendingActivity({
            accountId,
            txId: submitResult.txId,
            blockchainSpecific: submitResult.blockchainSpecificActivityMetadata,
          }),
        ],
      }),
    );

    return submitResult.txId;
  };
};

/**
 * Main side effect for the Bitcoin dApp connector extension.
 *
 * Exposes the wallet API over extension messaging and routes signMessage and
 * signPsbt confirmation requests to their review flows, gated on the wallet
 * being unlocked. Maintains the per-origin session account mapping.
 */
export const connectBitcoinDappConnectorApi: SideEffect = (
  {
    bitcoinDappConnector: {
      confirmSignMessage$,
      rejectSignMessage$,
      confirmSignPsbt$,
      rejectSignPsbt$,
    },
    views: { viewDisconnected$ },
    txExecutor,
  },
  {
    views: { selectOpenViews$ },
    appLock: { isUnlocked$ },
    dappConnector: { selectAuthorizedDapps$ },
    addresses: { selectAllAddresses$ },
    network: { selectActiveNetworkId$ },
    tokens: { selectTokensGroupedByAccount$ },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
    bitcoinDappConnector: { selectSessionAccountByOrigin$ },
  },
  {
    connectBitcoinDappConnector,
    actions,
    accessAuthSecret,
    authenticate,
    bitcoinProvider,
    signerFactory,
  },
) => {
  const messageSigningResult$ = new Subject<BitcoinSigningResult>();
  const psbtSigningResult$ = new Subject<BitcoinSigningResult>();
  const txPhaseActions$ = new Subject<ActionType<ActionCreators>>();

  let sessionAccountByOrigin: Record<string, AccountId> = {};

  const activeNetworkId$ = selectActiveNetworkId$.pipe(
    map(selectActiveNetworkId => selectActiveNetworkId('Bitcoin')),
  );

  const signMessage = createSignMessageWrapper({
    selectAllAddresses$,
    selectActiveNetworkAccounts$,
    selectAll$,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$: messageSigningResult$,
  });

  const signPsbt = createSignPsbtWrapper({
    selectAllAddresses$,
    selectActiveNetworkAccounts$,
    selectAll$,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$: psbtSigningResult$,
  });

  const dispatchTxPhase = (action: ActionType<ActionCreators>) => {
    txPhaseActions$.next(action);
  };

  const buildSendTx = createBuildSendTxWrapper({
    buildTx: makeBuildTx(txExecutor),
    selectAllAddresses$,
    selectActiveNetworkAccounts$,
    selectTokensGroupedByAccount$,
    dispatch: dispatchTxPhase,
  });

  const confirmSendTx = createConfirmSendTxWrapper({
    confirmTx: makeConfirmTx(txExecutor),
    submitTx: makeSubmitTx(txExecutor),
    selectActiveNetworkAccounts$,
    selectAll$,
    dispatch: dispatchTxPhase,
    signingResult$: psbtSigningResult$,
    actions,
  });

  const submitRawTx = createSubmitRawTxWrapper({
    submitTx: makeSubmitTx(txExecutor),
    activeNetworkId$,
    dispatch: dispatchTxPhase,
    actions,
  });

  const updateAccountMapping$ = selectSessionAccountByOrigin$.pipe(
    tap(mapping => {
      sessionAccountByOrigin = mapping;
    }),
    ignoreElements(),
  );

  const connector$ = connectBitcoinDappConnector({
    authorizedDapps$: selectAuthorizedDapps$,
    isUnlocked$,
    addresses$: selectAllAddresses$,
    accountUtxos$: NO_SYNCED_ACCOUNT_UTXOS$,
    accountTokens$: selectTokensGroupedByAccount$,
    activeNetworkId$,
    bitcoinProvider,
    getAccountIdForOrigin: (origin: string) => sessionAccountByOrigin[origin],
    signMessage,
    signPsbt,
    buildSendTx,
    confirmSendTx,
    submitRawTx,
    handleRequests: (request$: Observable<BitcoinConfirmationRequest>) =>
      request$.pipe(
        exhaustMap(request =>
          isUnlocked$.pipe(
            filter(Boolean),
            take(1),
            switchMap(() => {
              if (request.type === 'signMessage') {
                return signMessage$({
                  request,
                  selectOpenViews$,
                  actions,
                  confirmSignMessage$,
                  rejectSignMessage$,
                  viewDisconnected$,
                  signingResult$: messageSigningResult$,
                });
              }
              if (request.type === 'signPsbt') {
                return signPsbt$({
                  request,
                  selectOpenViews$,
                  actions,
                  confirmSignPsbt$,
                  rejectSignPsbt$,
                  viewDisconnected$,
                  signingResult$: psbtSigningResult$,
                });
              }
              return EMPTY;
            }),
          ),
        ),
      ),
  });

  return merge(updateAccountMapping$, connector$, txPhaseActions$);
};

/**
 * Parameters for resolving the previous outputs a signPsbt request spends
 * without carrying them embedded in the PSBTs.
 */
type ResolvePsbtPreviousOutsParams = {
  psbtsBase64: string[];
  selectAllAddresses$: Observable<AnyAddress[]>;
  activeNetworkId$: Observable<BlockchainNetworkId | undefined>;
  bitcoinProvider: Pick<BitcoinProvider, 'getRawTransaction'>;
};

const resolvePsbtPreviousOuts = async ({
  psbtsBase64,
  selectAllAddresses$,
  activeNetworkId$,
  bitcoinProvider,
}: ResolvePsbtPreviousOutsParams): Promise<
  Record<string, ResolvedPreviousOut>
> => {
  const networkId = await firstValueFrom(activeNetworkId$);
  const network = networkId
    ? BitcoinNetworkId.getBitcoinNetwork(networkId)
    : undefined;
  if (!network) {
    throw new Error('No active Bitcoin network');
  }

  const addresses = await firstValueFrom(selectAllAddresses$);
  const ownAddresses = new Set(
    addresses
      .filter(address => address.blockchainName === 'Bitcoin')
      .map(address => address.address as string),
  );

  const unresolved = new Map<string, { txid: string; vout: number }>();
  for (const psbtBase64 of psbtsBase64) {
    const inspection = inspectPsbt(psbtBase64, {
      ownAddresses,
      network: toBitcoinJsNetwork(network),
    });
    for (const input of inspection.unresolvedInputs) {
      unresolved.set(`${input.txid}:${input.vout}`, input);
    }
  }
  if (unresolved.size === 0) return {};

  const txids = [...new Set([...unresolved.values()].map(input => input.txid))];
  const rawTxResults = await firstValueFrom(
    forkJoin(
      txids.map(txid => bitcoinProvider.getRawTransaction({ network }, txid)),
    ),
  );

  const transactionByTxid = new Map<string, bitcoin.Transaction>();
  txids.forEach((txid, index) => {
    const result = rawTxResults[index];
    if (result.isErr()) {
      throw new Error(
        `Failed to fetch previous transaction ${txid}: ${result.error.reason}`,
      );
    }
    const transaction = bitcoin.Transaction.fromHex(result.value);
    if (transaction.getId() !== txid) {
      throw new Error(
        `Fetched previous transaction does not match requested txid ${txid}`,
      );
    }
    transactionByTxid.set(txid, transaction);
  });

  const previousOuts: Record<string, ResolvedPreviousOut> = {};
  for (const { txid, vout } of unresolved.values()) {
    const output = transactionByTxid.get(txid)?.outs[vout];
    if (!output) {
      throw new Error(`Previous transaction ${txid} has no output ${vout}`);
    }
    previousOuts[`${txid}:${vout}`] = {
      value: output.value,
      scriptHex: output.script.toString('hex'),
    };
  }
  return previousOuts;
};

/**
 * Resolves the previous outputs of PSBT inputs that carry neither
 * witnessUtxo nor nonWitnessUtxo whenever a signPsbt review opens, so the
 * review screen can show verified amounts. Fetched transactions are checked
 * to hash to the requested txid before their outputs are trusted.
 */
export const resolveForeignPsbtInputs: SideEffect = (
  { bitcoinDappConnector: { setPendingSignPsbtRequest$ } },
  { addresses: { selectAllAddresses$ }, network: { selectActiveNetworkId$ } },
  { actions, bitcoinProvider },
) =>
  setPendingSignPsbtRequest$.pipe(
    filter(({ payload }) => payload !== null),
    switchMap(({ payload }) =>
      merge(
        of(actions.bitcoinDappConnector.startResolvingInputs()),
        from(
          resolvePsbtPreviousOuts({
            psbtsBase64: payload?.psbtsBase64 ?? [],
            selectAllAddresses$,
            activeNetworkId$: selectActiveNetworkId$.pipe(
              map(selectActiveNetworkId => selectActiveNetworkId('Bitcoin')),
            ),
            bitcoinProvider,
          }),
        ).pipe(
          map(previousOuts =>
            actions.bitcoinDappConnector.setResolvedInputs(previousOuts),
          ),
          catchError(() =>
            of(actions.bitcoinDappConnector.failResolvingInputs()),
          ),
        ),
      ),
    ),
  );

/**
 * Resolves a `closePopupRequested` action (carrying a popup location) into a
 * `views.closeView` dispatch by looking up the matching popupWindow view.
 */
export const closeRequestedPopup: SideEffect = (
  { bitcoinDappConnector: { closePopupRequested$ } },
  { views: { selectOpenViews$ } },
  { actions },
) =>
  closePopupRequested$.pipe(
    withLatestFrom(selectOpenViews$),
    mergeMap(([{ payload: location }, openViews]) => {
      const popupView = openViews.find(
        view => view.type === 'popupWindow' && view.location === location,
      );
      return popupView ? of(actions.views.closeView(popupView.id)) : EMPTY;
    }),
  );

/**
 * Factory function to initialize the extension side effects.
 */
export const initializeLaceExtensionSideEffects: LaceInitSync<
  SideEffect[]
> = () => [
  connectBitcoinDappConnectorApi,
  resolveForeignPsbtInputs,
  promptBitcoinAuthorizeDapp,
  closeRequestedPopup,
];
