import {
  convertHttpUrlToWebsocket,
  defaultTxTtlLength,
  isMidnightSDKNetworkId,
  MidnightSDKNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { ErrorCodes } from '@midnight-ntwrk/dapp-connector-api';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { httpClientProvingProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import {
  ZKConfigProvider,
  createZKIR,
  createProverKey,
  createVerifierKey,
} from '@midnight-ntwrk/midnight-js-types';
import {
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
  UnshieldedAddress,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { firstValueFrom, map } from 'rxjs';

import { APIError } from '../../api-error';

import type { ConfirmationCallback } from './create-confirmation-callback';
import type { SenderContext, WithSenderContext } from '../../types';
import type {
  MidnightWalletsByAccountId,
  MidnightWallet,
  MidnightNetworkConfig,
  MidnightNetwork,
} from '@lace-contract/midnight-context';
import type {
  ConnectedAPI,
  TokenType,
  HistoryEntry,
  DesiredInput,
  DesiredOutput,
  Signature,
  SignDataOptions,
  Configuration,
  ConnectionStatus,
  WalletConnectedAPI,
  KeyMaterialProvider,
  ProvingProvider,
} from '@midnight-ntwrk/dapp-connector-api';
import type {
  CombinedSwapInputs,
  CombinedTokenTransfer,
  TokenTransfer,
} from '@midnight-ntwrk/wallet-sdk-facade';
import type { Observable } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

const isSenderContext = (value: unknown): value is SenderContext =>
  typeof value === 'object' && value !== null && 'sender' in value;

export interface MidnightDappConnectorApiOptions {
  wallets$: Observable<MidnightWalletsByAccountId>;
  network$: Observable<MidnightNetwork | undefined>;
  userConfirmTransaction: ConfirmationCallback;
  supportedNetworksIds$: Observable<MidnightSDKNetworkId[]>;
  isUnlocked$: Observable<boolean>;
}

class DappZkConfigProvider extends ZKConfigProvider<string> {
  readonly #keyMaterialProvider: KeyMaterialProvider;

  public constructor(keyMaterialProvider: KeyMaterialProvider) {
    super();
    this.#keyMaterialProvider = keyMaterialProvider;
  }

  public getZKIR = async (circuitId: string) =>
    createZKIR(await this.#keyMaterialProvider.getZKIR(circuitId));

  public getProverKey = async (circuitId: string) =>
    createProverKey(await this.#keyMaterialProvider.getProverKey(circuitId));

  public getVerifierKey = async (circuitId: string) =>
    createVerifierKey(
      await this.#keyMaterialProvider.getVerifierKey(circuitId),
    );
}
const bigintReplacer = (_key: string, value: unknown): unknown =>
  typeof value === 'bigint' ? value.toString() : value;

export class MidnightDappConnectorApi
  implements WithSenderContext<ConnectedAPI>
{
  private readonly wallets$: Observable<MidnightWalletsByAccountId>;
  private readonly network$: Observable<MidnightNetwork | undefined>;
  private readonly networkConfig$: Observable<
    MidnightNetworkConfig | undefined
  >;
  private readonly supportedNetworksIds$: Observable<MidnightSDKNetworkId[]>;
  private readonly isUnlocked$: Observable<boolean>;
  readonly #userConfirmationRequest: ConfirmationCallback;

  public constructor(options: MidnightDappConnectorApiOptions) {
    this.wallets$ = options.wallets$;
    this.#userConfirmationRequest = options.userConfirmTransaction;
    this.supportedNetworksIds$ = options.supportedNetworksIds$;
    this.network$ = options.network$;
    this.isUnlocked$ = options.isUnlocked$;
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
    const wallet = await this.ensureWallet();
    return wallet.networkId.toString();
  }

  public async getDustAddress(): Promise<{ dustAddress: string }> {
    const wallet = await this.ensureWallet();
    return await firstValueFrom(
      wallet.address$.pipe(map(({ dust }) => ({ dustAddress: dust }))),
    );
  }

  public async getDustBalance(): Promise<{
    cap: bigint;
    balance: bigint;
  }> {
    const wallet = await this.ensureWallet();
    return await firstValueFrom(
      wallet.state().pipe(
        map(state => {
          const now = new Date();
          const balance = state.dust.balance(now);
          const coinsWithFullInfo = state.dust.availableCoinsWithFullInfo(now);
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

  public async getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }> {
    const wallet = await this.ensureWallet();
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

  public async getShieldedBalances(): Promise<Record<TokenType, bigint>> {
    const wallet = await this.ensureWallet();
    return await firstValueFrom(
      wallet.state().pipe(map(state => state.shielded.balances)),
    );
  }

  public async getUnshieldedAddress(): Promise<{
    unshieldedAddress: string;
  }> {
    const wallet = await this.ensureWallet();
    return await firstValueFrom(
      wallet.address$.pipe(
        map(({ unshielded }) => ({ unshieldedAddress: unshielded })),
      ),
    );
  }

  public async getUnshieldedBalances(): Promise<Record<TokenType, bigint>> {
    const wallet = await this.ensureWallet();
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

    const wallet = await this.ensureWallet();
    const deserializedTx = await this.deserializeSealedTransaction(tx);

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

    const wallet = await this.ensureWallet();
    const deserializedTx = await this.deserializeUnsealedTransaction(tx);

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
  ): Promise<{ tx: string }> {
    const wallet = await this.ensureWallet();

    const combinedTransfers = this.groupOutputsByKind(
      desiredOutputs,
      wallet.networkId,
    );

    const hasShieldedOutputs = combinedTransfers.some(
      t => t.type === 'shielded',
    );
    const transactionType = hasShieldedOutputs ? 'shielded' : 'unshielded';

    const { isConfirmed } = await this.#userConfirmationRequest(
      {} as Runtime.MessageSender,
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
    const wallet = await this.ensureWallet();

    const networkConfig = await firstValueFrom(this.networkConfig$);
    if (!networkConfig) {
      throw new APIError(
        ErrorCodes.InternalError,
        'Network configuration is unavailable',
      );
    }

    return {
      networkId: wallet.networkId.toString(),
      indexerUri: networkConfig.indexerAddress,
      indexerWsUri: convertHttpUrlToWebsocket(networkConfig.indexerAddress),
      proverServerUri: networkConfig.proofServerAddress,
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

  public async submitTransaction(tx: string): Promise<void> {
    const wallet = await this.ensureWallet();
    const deserializedTx = await this.deserializeTransaction(tx);

    await firstValueFrom(wallet.submitTransaction(deserializedTx));
  }

  public async getProvingProvider(
    keyMaterialProvider: KeyMaterialProvider,
  ): Promise<ProvingProvider> {
    const networkConfig = await firstValueFrom(this.networkConfig$);
    if (!networkConfig) {
      throw new APIError(
        ErrorCodes.InternalError,
        'Network configuration is unavailable',
      );
    }
    return httpClientProvingProvider(
      networkConfig.proofServerAddress,
      new DappZkConfigProvider(keyMaterialProvider),
    );
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
    options: {
      intentId: number | 'random';
      payFees: boolean;
    },
  ): Promise<{ tx: string }> {
    const wallet = await this.ensureWallet();

    const swapInputs = desiredInputs.reduce<CombinedSwapInputs>(
      (inputs, { kind, type, value }) => {
        if (kind === 'shielded') {
          inputs.shielded = inputs.shielded ?? {};
          inputs.shielded[type] = (inputs.shielded[type] ?? 0n) + value;
        }
        if (kind === 'unshielded') {
          inputs.unshielded = inputs.unshielded ?? {};
          inputs.unshielded[type] = (inputs.unshielded[type] ?? 0n) + value;
        }
        return inputs;
      },
      {},
    );

    const swapOutputs = this.groupOutputsByKind(
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
      {} as Runtime.MessageSender,
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

    // TODO: pass options.intentId to the SDK once WalletFacade.initSwap supports it
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
    const wallet = await this.ensureWallet();

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'signData',
      { signDataPayload: data, signDataKeyType: options.keyType },
    );

    if (!isConfirmed) {
      throw new APIError(ErrorCodes.Rejected, 'User rejected data signing');
    }

    const dataBytes = this.decodeSignData(data, options.encoding);

    const { signature, verifyingKey } = await firstValueFrom(
      wallet.signData(dataBytes),
    );

    return { data, signature, verifyingKey };
  }

  private groupOutputsByKind(
    desiredOutputs: DesiredOutput[],
    networkId: MidnightWallet['networkId'],
  ): CombinedTokenTransfer[] {
    const grouped = desiredOutputs.reduce(
      (outputs, output) => {
        const { kind, type, recipient, value } = output;
        const parsedAddress = MidnightBech32m.parse(recipient);

        if (kind === 'unshielded') {
          outputs.unshielded.push({
            type,
            receiverAddress: UnshieldedAddress.codec.decode(
              networkId,
              parsedAddress,
            ),
            amount: value,
          });
        }

        if (kind === 'shielded') {
          outputs.shielded.push({
            type,
            receiverAddress: ShieldedAddress.codec.decode(
              networkId,
              parsedAddress,
            ),
            amount: value,
          });
        }

        return outputs;
      },
      {
        unshielded: [] as TokenTransfer<UnshieldedAddress>[],
        shielded: [] as TokenTransfer<ShieldedAddress>[],
      },
    );

    const result: CombinedTokenTransfer[] = [];
    if (grouped.unshielded.length > 0) {
      result.push({ type: 'unshielded', outputs: grouped.unshielded });
    }
    if (grouped.shielded.length > 0) {
      result.push({ type: 'shielded', outputs: grouped.shielded });
    }
    return result;
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

  private async ensureWallet(): Promise<MidnightWallet> {
    const pickFirst = (wallets: MidnightWalletsByAccountId) =>
      Object.values(wallets)[0] ?? null;

    let wallet = pickFirst(await firstValueFrom(this.wallets$));

    if (!wallet) {
      const { isConfirmed } = await this.#userConfirmationRequest(
        {} as Runtime.MessageSender,
        'unlockWallet',
      );

      if (!isConfirmed) {
        throw new APIError(ErrorCodes.Rejected, 'User rejects wallet unlock');
      }
    }

    wallet = pickFirst(await firstValueFrom(this.wallets$));

    if (!wallet) {
      throw new APIError(ErrorCodes.InternalError, 'Wallet is unavailable');
    }

    return wallet;
  }

  private async deserializeTransaction(
    tx: string,
  ): Promise<
    ledger.Transaction<ledger.SignatureEnabled, ledger.Proof, ledger.Binding>
  > {
    return ledger.Transaction.deserialize(
      'signature',
      'proof',
      'binding',
      Buffer.from(tx, 'hex'),
    );
  }

  private async deserializeSealedTransaction(
    tx: string,
  ): Promise<
    ledger.Transaction<ledger.SignatureEnabled, ledger.Proof, ledger.Binding>
  > {
    return ledger.Transaction.deserialize(
      'signature',
      'proof',
      'binding',
      Buffer.from(tx, 'hex'),
    );
  }

  private async deserializeUnsealedTransaction(
    tx: string,
  ): Promise<
    ledger.Transaction<ledger.SignatureEnabled, ledger.Proof, ledger.PreBinding>
  > {
    return ledger.Transaction.deserialize(
      'signature',
      'proof',
      'pre-binding',
      Buffer.from(tx, 'hex'),
    );
  }

  private decodeSignData(
    data: string,
    encoding: 'base64' | 'hex' | 'text',
  ): Uint8Array {
    switch (encoding) {
      case 'hex':
        return new Uint8Array(Buffer.from(data, 'hex'));
      case 'base64':
        return new Uint8Array(Buffer.from(data, 'base64'));
      case 'text':
        return new TextEncoder().encode(data);
      default: {
        throw new APIError(
          ErrorCodes.InvalidRequest,
          `Unsupported encoding: ${String(encoding)}`,
        );
      }
    }
  }
}
