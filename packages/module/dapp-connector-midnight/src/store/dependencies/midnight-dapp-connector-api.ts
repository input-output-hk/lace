import {
  convertHttpUrlToWebsocket,
  defaultTxTtlLength,
  getProofServerEndpoint,
  isMidnightSDKNetworkId,
  MidnightSDKNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { senderOrigin } from '@lace-lib/dapp-connector';
import { createProofJobs } from '@lace-lib/midnight-prover';
import {
  deserializeMidnightSealedTransaction,
  deserializeMidnightUnsealedTransaction,
  groupMidnightConnectorInputs,
  groupMidnightConnectorOutputs,
} from '@lace-lib/vendor/midnight-connector-transaction';
import {
  applyMidnightSignedMessagePrefix,
  decodeMidnightSignData,
} from '@lace-lib/vendor/midnight-sign-data';
import { ErrorCodes } from '@midnight-ntwrk/dapp-connector-api';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnightntwrk/wallet-sdk-address-format';
import { firstValueFrom, map } from 'rxjs';

import { APIError } from '../../api-error';
import { derivePendingActivityFromMidnightTx } from '../helpers/derive-pending-activity-from-midnight-tx';

import type { ConfirmationCallback } from './create-confirmation-callback';
import type {
  DAppConnectorWalletAPI,
  SenderContext,
  WithSenderContext,
} from '../../types';
import type { Activity } from '@lace-contract/activities';
import type {
  MidnightWalletsByAccountId,
  MidnightWallet,
  MidnightNetworkConfig,
  MidnightNetwork,
} from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { ProverCommand, ProverReply } from '@lace-lib/midnight-prover';
import type { ProofCircuitRequest } from '@lace-lib/vendor/midnight-proof-servers';
import type {
  TokenType,
  HistoryEntry,
  DesiredInput,
  DesiredOutput,
  Signature,
  SignDataOptions,
  Configuration,
  ConnectionStatus,
  WalletConnectedAPI,
} from '@midnight-ntwrk/dapp-connector-api';
import type { UtxoWithMeta } from '@midnightntwrk/wallet-sdk/facade';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';
import type { Runtime } from 'webextension-polyfill';

const isSenderContext = (value: unknown): value is SenderContext =>
  typeof value === 'object' && value !== null && 'sender' in value;

export interface MidnightDappConnectorApiOptions {
  wallets$: Observable<MidnightWalletsByAccountId>;
  network$: Observable<MidnightNetwork | undefined>;
  userConfirmTransaction: ConfirmationCallback;
  supportedNetworksIds$: Observable<MidnightSDKNetworkId[]>;
  isUnlocked$: Observable<boolean>;
  getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  onPendingActivity?: (activity: Activity) => void;
  logger?: Logger;
}

const bigintReplacer = (_key: string, value: unknown): unknown =>
  typeof value === 'bigint' ? value.toString() : value;

export class MidnightDappConnectorApi
  implements WithSenderContext<DAppConnectorWalletAPI>
{
  private readonly wallets$: Observable<MidnightWalletsByAccountId>;
  private readonly network$: Observable<MidnightNetwork | undefined>;
  private readonly networkConfig$: Observable<
    MidnightNetworkConfig | undefined
  >;
  private readonly supportedNetworksIds$: Observable<MidnightSDKNetworkId[]>;
  private readonly isUnlocked$: Observable<boolean>;
  readonly #userConfirmationRequest: ConfirmationCallback;
  readonly #getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  readonly #onPendingActivity?: (activity: Activity) => void;
  readonly #logger?: Logger;
  // Async backends own scheduling. Forward accepted requests so WASM queued
  // jobs are visible to the wallet, while the offscreen worker stays serial.
  readonly #proofJobs = createProofJobs({
    shouldForwardProvidersConcurrently: true,
  });

  public constructor(options: MidnightDappConnectorApiOptions) {
    this.wallets$ = options.wallets$;
    this.#userConfirmationRequest = options.userConfirmTransaction;
    this.supportedNetworksIds$ = options.supportedNetworksIds$;
    this.network$ = options.network$;
    this.isUnlocked$ = options.isUnlocked$;
    this.#getAccountIdForOrigin = options.getAccountIdForOrigin;
    this.#onPendingActivity = options.onPendingActivity;
    this.#logger = options.logger;
    this.networkConfig$ = options.network$.pipe(
      map(network => network?.config),
    );
  }

  public async isLocked(): Promise<boolean> {
    const isUnlocked = await firstValueFrom(this.isUnlocked$);
    return !isUnlocked;
  }

  public async checkNetworkSupport(networkId: string): Promise<void> {
    if (!isMidnightSDKNetworkId(networkId)) {
      throw new APIError(
        ErrorCodes.InvalidRequest,
        `Invalid network ID: ${networkId}\nValid networks are: ${MidnightSDKNetworkId.join(
          ', ',
        )}`,
      );
    }

    const supportedIds = await firstValueFrom(this.supportedNetworksIds$, {
      defaultValue: [
        MidnightSDKNetworkIds.Undeployed,
      ] as MidnightSDKNetworkId[],
    });

    if (!supportedIds.includes(networkId))
      throw new APIError(
        ErrorCodes.InvalidRequest,
        `Unsupported network ID: ${networkId}\nSupported networks are: ${supportedIds.join(
          ', ',
        )}`,
      );

    const network = await firstValueFrom(this.network$, {
      defaultValue: undefined,
    });

    if (network === undefined)
      throw new APIError(
        ErrorCodes.InternalError,
        'Active network ID is unavailable',
      );

    if (network.networkId.toString() !== networkId)
      throw new APIError(ErrorCodes.InvalidRequest, 'Network ID mismatch');
  }

  public async getNetworkId(): Promise<string> {
    const wallet = await this.pickAnyWallet();
    return wallet.networkId.toString();
  }

  public async getDustAddress({
    sender,
  }: SenderContext): Promise<{ dustAddress: string }> {
    const wallet = await this.ensureWallet(sender);
    return await firstValueFrom(
      wallet.address$.pipe(map(({ dust }) => ({ dustAddress: dust }))),
    );
  }

  public async getDustBalance({ sender }: SenderContext): Promise<{
    cap: bigint;
    balance: bigint;
  }> {
    const wallet = await this.ensureWallet(sender);
    return await firstValueFrom(
      wallet.state().pipe(
        map(state => {
          // totalCoins (not state.dust.balance) so a pending dust spend doesn't show as 0.
          const coinsWithFullInfo = state.dust.totalCoins;
          const balance = coinsWithFullInfo.reduce(
            (sum, coin) => sum + coin.generatedNow,
            0n,
          );
          const cap = coinsWithFullInfo.reduce(
            (sum, coin) => sum + coin.maxCap,
            0n,
          );

          return {
            balance,
            cap,
          };
        }),
      ),
    );
  }

  public async getShieldedAddresses({ sender }: SenderContext): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }> {
    const wallet = await this.ensureWallet(sender);
    const [{ shielded: shieldedAddress }, state] = await Promise.all([
      firstValueFrom(wallet.address$),
      firstValueFrom(wallet.state()),
    ]);
    return {
      shieldedAddress,
      shieldedCoinPublicKey: ShieldedCoinPublicKey.codec
        .encode(wallet.networkId, state.shielded.coinPublicKey)
        .asString(),
      shieldedEncryptionPublicKey: ShieldedEncryptionPublicKey.codec
        .encode(wallet.networkId, state.shielded.encryptionPublicKey)
        .asString(),
    };
  }

  public async getShieldedBalances({
    sender,
  }: SenderContext): Promise<Record<TokenType, bigint>> {
    const wallet = await this.ensureWallet(sender);
    return await firstValueFrom(
      wallet.state().pipe(map(state => state.shielded.balances)),
    );
  }

  public async getUnshieldedAddress({ sender }: SenderContext): Promise<{
    unshieldedAddress: string;
  }> {
    const wallet = await this.ensureWallet(sender);
    return await firstValueFrom(
      wallet.address$.pipe(
        map(({ unshielded }) => ({ unshieldedAddress: unshielded })),
      ),
    );
  }

  public async getUnshieldedBalances({
    sender,
  }: SenderContext): Promise<Record<TokenType, bigint>> {
    const wallet = await this.ensureWallet(sender);
    return await firstValueFrom(
      wallet.state().pipe(map(state => state.unshielded.balances)),
    );
  }

  /*
    This method expects a serialized transaction of type
    `Transaction<SignatureEnabled, Proof, Binding>`
  */
  public async balanceSealedTransaction(
    tx: string,
    optionsOrSender?: SenderContext | { payFees?: boolean },
    senderContext?: SenderContext,
  ): Promise<{ tx: string }> {
    const { sender, options } = this.resolveSenderAndOptions(
      optionsOrSender,
      senderContext,
    );

    const wallet = await this.ensureWallet(sender);
    const deserializedTx = await deserializeMidnightSealedTransaction(tx);

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'proveTransaction',
      { transactionData: deserializedTx.toString() },
    );

    if (!isConfirmed) {
      throw new APIError(ErrorCodes.Rejected, 'User rejected transaction');
    }

    const shouldPayFees = options?.payFees ?? true;

    const finalizedTxRecipe = await firstValueFrom(
      (() => {
        const ttl = new Date(Date.now() + defaultTxTtlLength);
        return wallet.balanceFinalizedTransaction(deserializedTx, {
          ttl,
          tokenKindsToBalance: shouldPayFees
            ? undefined
            : ['shielded', 'unshielded'],
        });
      })(),
    );

    const signedRecipe = await firstValueFrom(
      wallet.signRecipe(finalizedTxRecipe),
    );

    const finalizedTx = await firstValueFrom(
      wallet.finalizeRecipe(signedRecipe),
    );

    return Promise.resolve({
      tx: Buffer.from(finalizedTx.serialize()).toString('hex'),
    });
  }

  /*
    This method expects a serialized transaction of type
    `Transaction<SignatureEnabled, Proof, PreBinding>`
  */
  public async balanceUnsealedTransaction(
    tx: string,
    optionsOrSender?: SenderContext | { payFees?: boolean },
    senderContext?: SenderContext,
  ): Promise<{ tx: string }> {
    const { sender, options } = this.resolveSenderAndOptions(
      optionsOrSender,
      senderContext,
    );

    const wallet = await this.ensureWallet(sender);
    const deserializedTx = await deserializeMidnightUnsealedTransaction(tx);

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'proveTransaction',
      { transactionData: deserializedTx.toString() },
    );

    if (!isConfirmed) {
      throw new APIError(ErrorCodes.Rejected, 'User rejected transaction');
    }

    const shouldPayFees = options?.payFees ?? true;

    const unboundTxRecipe = await firstValueFrom(
      (() => {
        const ttl = new Date(Date.now() + defaultTxTtlLength);
        return wallet.balanceUnboundTransaction(deserializedTx, {
          ttl,
          tokenKindsToBalance: shouldPayFees
            ? undefined
            : ['shielded', 'unshielded'],
        });
      })(),
    );

    const signedRecipe = await firstValueFrom(
      wallet.signRecipe(unboundTxRecipe),
    );

    const finalizedTx = await firstValueFrom(
      wallet.finalizeRecipe(signedRecipe),
    );

    return Promise.resolve({
      tx: Buffer.from(finalizedTx.serialize()).toString('hex'),
    });
  }

  public async makeTransfer(
    desiredOutputs: DesiredOutput[],
    options: { payFees?: boolean } | undefined,
    { sender }: SenderContext,
  ): Promise<{ tx: string }> {
    const wallet = await this.ensureWallet(sender);

    const combinedTransfers = groupMidnightConnectorOutputs(
      desiredOutputs,
      wallet.networkId,
    );

    const hasShieldedOutputs = combinedTransfers.some(
      t => t.type === 'shielded',
    );
    const transactionType = hasShieldedOutputs ? 'shielded' : 'unshielded';

    const { isConfirmed } = await this.#userConfirmationRequest(
      {},
      'proveTransaction',
      {
        transactionType,
        transactionData: JSON.stringify(desiredOutputs, bigintReplacer, 2),
      },
    );

    if (!isConfirmed) {
      throw new APIError(ErrorCodes.Rejected, 'User rejects transaction');
    }

    const hasUnshieldedOutputs = combinedTransfers.some(
      t => t.type === 'unshielded',
    );

    const unprovenTxRecipe = await firstValueFrom(
      (() => {
        const ttl = new Date(Date.now() + defaultTxTtlLength);
        return wallet.transferTransaction(combinedTransfers, {
          ttl,
          payFees: options?.payFees ?? true,
        });
      })(),
    );

    const recipeToFinalize = hasUnshieldedOutputs
      ? await firstValueFrom(wallet.signRecipe(unprovenTxRecipe))
      : unprovenTxRecipe;

    const finalizedTx = await firstValueFrom(
      wallet.finalizeRecipe(recipeToFinalize),
    );

    return Promise.resolve({
      tx: Buffer.from(finalizedTx.serialize()).toString('hex'),
    });
  }

  public async getConfiguration(): Promise<Configuration> {
    const wallet = await this.pickAnyWallet();

    const networkConfig = await firstValueFrom(this.networkConfig$);
    if (!networkConfig) {
      throw new APIError(
        ErrorCodes.InternalError,
        'Network configuration is unavailable',
      );
    }

    const { proofServer } = networkConfig;
    const proverServerUri = getProofServerEndpoint(proofServer);
    if (!proverServerUri && proofServer.kind !== 'in-process') {
      throw new APIError(
        ErrorCodes.InternalError,
        `Proof server mode "${proofServer.kind}" has no HTTP endpoint`,
      );
    }
    return {
      networkId: wallet.networkId.toString(),
      indexerUri: networkConfig.indexerAddress,
      indexerWsUri: convertHttpUrlToWebsocket(networkConfig.indexerAddress),
      // A TEE proof server is reachable only through the attested channel
      // behind `proveCircuit`; publishing its URL would invite a dApp to
      // post its witness there unattested (the deprecated field is optional).
      proverServerUri:
        proofServer.kind === 'tee-delegated' ? undefined : proverServerUri,
      substrateNodeUri: networkConfig.nodeAddress,
    };
  }

  public async getConnectionStatus(): Promise<ConnectionStatus> {
    const wallets = await firstValueFrom(this.wallets$);
    const wallet = Object.values(wallets)[0];
    if (!wallet) {
      return { status: 'disconnected' };
    }

    const networkId = wallet.networkId;
    return {
      status: 'connected',
      networkId: networkId.toString(),
    };
  }

  public async submitTransaction(
    tx: string,
    { sender }: SenderContext,
  ): Promise<void> {
    const wallet = await this.ensureWallet(sender);
    const deserializedTx = await deserializeMidnightSealedTransaction(tx);

    // Capture wallet state BEFORE submission. The SDK may optimistically remove
    // consumed coins from availableCoins on submit, which would make own-input
    // matching in derivePendingActivityFromMidnightTx fail and silently skip
    // the pending activity.
    let preSubmitNightUtxos: readonly UtxoWithMeta[] | undefined;
    if (this.#onPendingActivity) {
      try {
        const walletState = await firstValueFrom(wallet.state());
        preSubmitNightUtxos = walletState.unshielded.availableCoins;
      } catch (error) {
        this.#logger?.error(
          '[dapp-connector-midnight] failed to read wallet state before tx submission',
          error,
        );
      }
    }

    await firstValueFrom(wallet.submitTransaction(deserializedTx));

    if (!this.#onPendingActivity || !preSubmitNightUtxos) return;
    try {
      const ownUserAddress = ledger.addressFromKey(wallet.nightVerifyingKey);
      const activity = derivePendingActivityFromMidnightTx({
        deserializedTx,
        accountId: wallet.accountId,
        ownUserAddressHex: ownUserAddress,
        nightUtxos: preSubmitNightUtxos,
        networkId: wallet.networkId,
      });
      if (activity) this.#onPendingActivity(activity);
    } catch (error) {
      this.#logger?.error(
        '[dapp-connector-midnight] failed to derive pending activity from submitted tx',
        error,
      );
    }
  }

  /** Bind every upload, job and result to the authorized document and wallet. */
  public async proofCommand(
    command: ProverCommand,
    { sender }: SenderContext,
  ): Promise<ProverReply> {
    const wallet = await this.ensureWallet(sender);
    const documentId = (
      sender as Runtime.MessageSender & { documentId?: string }
    ).documentId;
    if (!documentId || sender.tab?.id === undefined)
      throw new APIError(
        ErrorCodes.InvalidRequest,
        'Missing dApp document identity',
      );
    const owner = JSON.stringify([
      senderOrigin(sender),
      sender.tab.id,
      sender.frameId,
      documentId,
      wallet.accountId,
      wallet.networkId,
    ]);
    return this.#proofJobs.handle(command, owner, wallet.proofCircuitProvider);
  }

  /** dApp circuits use the same backend as wallet transactions. */
  public async checkCircuit(
    request: ProofCircuitRequest,
    { sender }: SenderContext,
  ): Promise<(bigint | undefined)[]> {
    const wallet = await this.ensureWallet(sender);
    return wallet.proofCircuitProvider.check(request);
  }

  public async proveCircuit(
    request: ProofCircuitRequest,
    { sender }: SenderContext,
  ): Promise<Uint8Array> {
    const wallet = await this.ensureWallet(sender);
    return wallet.proofCircuitProvider.prove(request);
  }

  public async getTxHistory(
    _pageNumber: number,
    _pageSize: number,
  ): Promise<HistoryEntry[]> {
    throw new Error('Method not implemented.');
  }

  public async hintUsage(
    _methodNames: Array<keyof WalletConnectedAPI>,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async makeIntent(
    desiredInputs: DesiredInput[],
    desiredOutputs: DesiredOutput[],
    ...optionsAndSender: [
      options: { intentId: number | 'random'; payFees: boolean },
      senderContext: SenderContext,
    ]
  ): Promise<{ tx: string }> {
    const [options, { sender }] = optionsAndSender;
    const wallet = await this.ensureWallet(sender);

    const swapInputs = groupMidnightConnectorInputs(desiredInputs);

    const swapOutputs = groupMidnightConnectorOutputs(
      desiredOutputs,
      wallet.networkId,
    );

    const hasShieldedOutputs = swapOutputs.some(t => t.type === 'shielded');
    const hasShieldedInputs = Object.keys(swapInputs.shielded ?? {}).length > 0;
    const hasUnshieldedOutputs = swapOutputs.some(t => t.type === 'unshielded');
    const hasUnshieldedInputs =
      Object.keys(swapInputs.unshielded ?? {}).length > 0;
    const transactionType =
      hasShieldedOutputs || hasShieldedInputs ? 'shielded' : 'unshielded';

    const { isConfirmed } = await this.#userConfirmationRequest(
      {},
      'proveTransaction',
      {
        transactionType,
        transactionData: JSON.stringify(
          { desiredInputs, desiredOutputs },
          bigintReplacer,
          2,
        ),
      },
    );

    if (!isConfirmed) {
      throw new APIError(ErrorCodes.Rejected, 'User rejected transaction');
    }

    // options.intentId is currently dropped — WalletFacade.initSwap does
    // not accept it yet. Plumb it through when the SDK adds support.
    const unprovenTxRecipe = await firstValueFrom(
      (() => {
        const ttl = new Date(Date.now() + defaultTxTtlLength);
        return wallet.initSwap(swapInputs, swapOutputs, {
          ttl,
          payFees: options.payFees,
        });
      })(),
    );

    const hasUnshieldedParts = hasUnshieldedOutputs || hasUnshieldedInputs;

    const recipeToFinalize = hasUnshieldedParts
      ? await firstValueFrom(wallet.signRecipe(unprovenTxRecipe))
      : unprovenTxRecipe;

    const finalizedTx = await firstValueFrom(
      wallet.finalizeRecipe(recipeToFinalize),
    );

    return {
      tx: Buffer.from(finalizedTx.serialize()).toString('hex'),
    };
  }

  public async signData(
    data: string,
    options: SignDataOptions,
    { sender }: SenderContext,
  ): Promise<Signature> {
    const wallet = await this.ensureWallet(sender);

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'signData',
      { signDataPayload: data, signDataKeyType: options.keyType },
    );

    if (!isConfirmed) {
      throw new APIError(ErrorCodes.Rejected, 'User rejected data signing');
    }

    // Domain-separate with the connector-spec `midnight_signed_message:<size>:`
    // prefix (LW-15403) so this signature is not a valid transaction-witness
    // signature over the raw bytes. The response echoes the ORIGINAL `data` —
    // the prefix is a signing-time envelope, not part of the payload.
    const dataBytes = applyMidnightSignedMessagePrefix(
      this.decodeSignData(data, options.encoding),
    );

    const { signature, verifyingKey } = await firstValueFrom(
      wallet.signData(dataBytes),
    );

    return { data, signature, verifyingKey };
  }

  private resolveSenderAndOptions(
    optionsOrSender?: SenderContext | { payFees?: boolean },
    senderContext?: SenderContext,
  ): {
    sender: Runtime.MessageSender;
    options: { payFees?: boolean } | undefined;
  } {
    const sender = (
      senderContext ??
      (isSenderContext(optionsOrSender) ? optionsOrSender : undefined)
    )?.sender;
    if (!sender) {
      throw new APIError(ErrorCodes.InternalError, 'Missing sender context');
    }
    return {
      sender,
      options: isSenderContext(optionsOrSender) ? undefined : optionsOrSender,
    };
  }

  /**
   * Resolves the wallet bound to the requesting dApp's origin. Each dApp is
   * bound to a specific account at authorization time; this looks that account
   * up rather than defaulting to the first wallet.
   */
  private async ensureWallet(
    sender?: Runtime.MessageSender,
  ): Promise<MidnightWallet> {
    const origin = sender ? senderOrigin(sender) : null;
    const accountId = origin ? this.#getAccountIdForOrigin(origin) : undefined;

    if (!accountId) {
      throw new APIError(
        ErrorCodes.InternalError,
        'No account is connected for this dApp. Please reconnect.',
      );
    }

    let wallet = (await firstValueFrom(this.wallets$))[accountId] ?? null;

    if (!wallet) {
      const { isConfirmed } = await this.#userConfirmationRequest(
        {},
        'unlockWallet',
      );

      if (!isConfirmed) {
        throw new APIError(ErrorCodes.Rejected, 'User rejects wallet unlock');
      }

      wallet = (await firstValueFrom(this.wallets$))[accountId] ?? null;
    }

    if (!wallet) {
      throw new APIError(ErrorCodes.InternalError, 'Wallet is unavailable');
    }

    return wallet;
  }

  /**
   * Returns any available wallet. Used only for network-level data
   * (network id, configuration) that is identical across all accounts.
   */
  private async pickAnyWallet(): Promise<MidnightWallet> {
    const wallet = Object.values(await firstValueFrom(this.wallets$))[0];
    if (!wallet) {
      throw new APIError(ErrorCodes.InternalError, 'Wallet is unavailable');
    }
    return wallet;
  }

  private decodeSignData(
    data: string,
    encoding: 'base64' | 'hex' | 'text',
  ): Uint8Array {
    switch (encoding) {
      case 'hex':
      case 'base64':
      case 'text':
        return decodeMidnightSignData(data, encoding);
      default: {
        throw new APIError(
          ErrorCodes.InvalidRequest,
          `Unsupported encoding: ${String(encoding)}`,
        );
      }
    }
  }
}
