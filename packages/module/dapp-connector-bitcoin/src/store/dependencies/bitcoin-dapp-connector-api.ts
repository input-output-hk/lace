import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';
import {
  inspectPsbt,
  nonDefaultSighashInputs,
  psbtBase64ToHex,
  psbtHexToBase64,
} from '@lace-lib/bitcoin-psbt';
import { senderOrigin } from '@lace-lib/dapp-connector';
import { firstValueFrom } from 'rxjs';

import { BitcoinAPIError, BitcoinAPIErrorCode } from '../../api-error';
import { toBitcoinJsNetwork } from '../../utils/bitcoin-network';

import type {
  BitcoinConfirmationCallback,
  SignMessageRequestData,
} from './create-confirmation-callback';
import type {
  BitcoinBalance,
  BitcoinUtxo,
  BitcoinWalletApi,
  SenderContext,
  SignPsbtOptions,
  WithSenderContext,
} from '../../types';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  BitcoinProvider,
  BitcoinSignatureType,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

/**
 * Per-account Bitcoin UTXO sets, keyed by account ID. An absent entry means
 * the account has not been synced yet, so UTXOs are fetched from the provider
 * instead; an empty array means the account is synced and holds nothing.
 */
export type BitcoinAccountUtxoMap = Partial<
  Record<AccountId, readonly BitcoinUTxO[]>
>;

/**
 * Subset of the Bitcoin data provider the connector needs: UTXO lookups for
 * accounts that have not been synced yet, and raw transaction broadcasting.
 */
export type BitcoinDappConnectorProvider = Pick<
  BitcoinProvider,
  'getUTxOs' | 'submitTransaction'
>;

/**
 * Signs a plain text message with the key of the given address.
 * @returns Hex-encoded signature
 */
export type SignBitcoinMessageFunction = (
  request: SignMessageRequestData,
) => Promise<string>;

/**
 * Signs a single PSBT with the keys of the given account.
 * @returns Base64-encoded (partially or fully signed) PSBT
 */
export type SignBitcoinPsbtFunction = (
  psbtBase64: string,
  accountId: AccountId,
  options?: SignPsbtOptions,
) => Promise<string>;

/**
 * Builds a payment from the given account through the wallet's transaction
 * executor, without signing or broadcasting it.
 * @returns The PSBT the review screen displays, the serialized transaction to
 * confirm, and the transaction's net effect on the account in satoshis
 * (negative for a spend, fee included), which is absent when the built PSBT
 * does not state it
 */
export type BuildSendTxFunction = (
  toAddress: string,
  satoshis: number,
  options: { accountId: AccountId; feeRate?: number },
) => Promise<{
  psbtBase64: string;
  serializedTx: string;
  netSatoshis?: number;
}>;

/**
 * Signs and broadcasts a built payment the user has reviewed, through the
 * wallet's transaction executor flow, which runs its own confirmation UI, and
 * records it as pending with the given net effect on the account.
 * @returns Transaction id
 */
export type ConfirmSendTxFunction = (params: {
  accountId: AccountId;
  serializedTx: string;
  netSatoshis?: number;
}) => Promise<string>;

/**
 * Broadcasts an already signed raw transaction through the transaction
 * executor, so the wallet records it as pending straight away instead of
 * waiting for mempool discovery.
 */
export type SubmitRawTxFunction = (params: {
  accountId: AccountId;
  rawTxHex: string;
}) => Promise<string>;

/**
 * Dependencies required to construct a BitcoinDappConnectorApi instance.
 */
export interface BitcoinDappConnectorApiDependencies {
  /** All addresses; the API filters them down to the origin's Bitcoin account */
  addresses$: Observable<AnyAddress[]>;
  accountUtxos$: Observable<BitcoinAccountUtxoMap>;
  /** Per-account tokens, the same source the wallet UI shows balances from */
  accountTokens$: Observable<
    Record<string, { fungible: Token[]; nfts: Token[] }>
  >;
  /** Active Bitcoin network id; drives getNetwork and provider contexts */
  activeNetworkId$: Observable<BlockchainNetworkId | undefined>;
  bitcoinProvider: BitcoinDappConnectorProvider;
  /**
   * Function to get account ID for a specific dApp origin.
   * Enables per-dApp account isolation - each dApp uses its own selected account.
   */
  getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  /** Callback for user confirmation flows (required for signing) */
  userConfirmationRequest: BitcoinConfirmationCallback;
  signMessage: SignBitcoinMessageFunction;
  signPsbt: SignBitcoinPsbtFunction;
  buildSendTx: BuildSendTxFunction;
  confirmSendTx: ConfirmSendTxFunction;
  submitRawTx: SubmitRawTxFunction;
}

const HEX_PATTERN = /^(?:[\dA-Fa-f]{2})+$/;

const isHex = (value: string): boolean => HEX_PATTERN.test(value);

const isSenderContext = (value: unknown): value is SenderContext =>
  typeof value === 'object' &&
  value !== null &&
  'sender' in value &&
  typeof value.sender === 'object' &&
  value.sender !== null;

/**
 * Guards a provider- or sync-supplied satoshi amount before arithmetic use.
 * @throws BitcoinAPIError with InternalError code for non-safe-integer values
 */
const ensureValidSatoshis = (satoshis: number): number => {
  if (!Number.isSafeInteger(satoshis)) {
    throw new BitcoinAPIError(
      BitcoinAPIErrorCode.InternalError,
      `Provider returned an invalid satoshi amount: ${satoshis}`,
    );
  }
  return satoshis;
};

/**
 * BitcoinDappConnectorApi - implements the Unisat/OKX de facto wallet API for
 * Bitcoin dApps on the service-worker side.
 *
 * Every method except getNetwork resolves the calling dApp origin from the
 * appended sender context and operates on the account bound to that origin.
 * Signing methods gate on user confirmation before delegating to the injected
 * signing callbacks, and reject with a Refused error when the user declines.
 */
export class BitcoinDappConnectorApi
  implements WithSenderContext<BitcoinWalletApi>
{
  readonly #addresses$: Observable<AnyAddress[]>;
  readonly #accountUtxos$: Observable<BitcoinAccountUtxoMap>;
  readonly #accountTokens$: Observable<
    Record<string, { fungible: Token[]; nfts: Token[] }>
  >;
  readonly #activeNetworkId$: Observable<BlockchainNetworkId | undefined>;
  readonly #bitcoinProvider: BitcoinDappConnectorProvider;
  readonly #getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  readonly #userConfirmationRequest: BitcoinConfirmationCallback;
  readonly #signMessage: SignBitcoinMessageFunction;
  readonly #signPsbt: SignBitcoinPsbtFunction;
  readonly #buildSendTx: BuildSendTxFunction;
  readonly #confirmSendTx: ConfirmSendTxFunction;
  readonly #submitRawTx: SubmitRawTxFunction;

  public constructor({
    addresses$,
    accountUtxos$,
    accountTokens$,
    activeNetworkId$,
    bitcoinProvider,
    getAccountIdForOrigin,
    userConfirmationRequest,
    signMessage,
    signPsbt,
    buildSendTx,
    confirmSendTx,
    submitRawTx,
  }: BitcoinDappConnectorApiDependencies) {
    this.#addresses$ = addresses$;
    this.#accountUtxos$ = accountUtxos$;
    this.#accountTokens$ = accountTokens$;
    this.#activeNetworkId$ = activeNetworkId$;
    this.#bitcoinProvider = bitcoinProvider;
    this.#getAccountIdForOrigin = getAccountIdForOrigin;
    this.#userConfirmationRequest = userConfirmationRequest;
    this.#signMessage = signMessage;
    this.#signPsbt = signPsbt;
    this.#buildSendTx = buildSendTx;
    this.#confirmSendTx = confirmSendTx;
    this.#submitRawTx = submitRawTx;
  }

  /**
   * Returns the addresses of the account bound to the calling dApp origin.
   */
  public async getAccounts({ sender }: SenderContext): Promise<string[]> {
    const origin = this.#extractOrigin(sender);
    const addresses = await this.#getAccountAddresses(origin);
    return addresses.map(address => address.address as string);
  }

  /**
   * Returns the active Bitcoin network. Requires no origin authorization,
   * matching the policy of the other connectors' network queries.
   */
  public async getNetwork(): Promise<'mainnet' | 'testnet'> {
    const network = await this.#getActiveNetwork();
    return network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet';
  }

  /**
   * Returns the connected account's balance derived from its UTXO set,
   * splitting confirmed from still-unconfirmed value.
   */
  public async getBalance({ sender }: SenderContext): Promise<BitcoinBalance> {
    const origin = this.#extractOrigin(sender);
    const accountId = this.#getAccountId(origin);
    const tokensByAccount = await firstValueFrom(this.#accountTokens$);
    const token = tokensByAccount[accountId]?.fungible.find(
      candidate => candidate.tokenId === BITCOIN_TOKEN_ID,
    );

    const confirmed = BigInt(token?.available.toString() ?? '0');
    const unconfirmed = BigInt(token?.pending.toString() ?? '0');

    return {
      confirmed: Number(confirmed),
      unconfirmed: Number(unconfirmed),
      total: Number(confirmed + unconfirmed),
    };
  }

  /**
   * Returns the connected account's UTXOs in the Unisat shape.
   */
  public async getUtxos({ sender }: SenderContext): Promise<BitcoinUtxo[]> {
    const origin = this.#extractOrigin(sender);
    const utxos = await this.#getAccountUtxos(origin);
    return utxos.map(utxo => ({
      txid: utxo.txId,
      vout: utxo.index,
      satoshis: ensureValidSatoshis(utxo.satoshis),
      scriptPk: utxo.script,
      address: utxo.address,
    }));
  }

  /**
   * Signs a plain text message after user confirmation.
   *
   * @param message - Message to sign
   * @param typeOrContext - Signature scheme (defaults to 'ecdsa'), or the
   * sender context when the dApp omitted the scheme
   * @param senderContext - Sender context appended by the messaging channel
   * @returns Base64-encoded signature, converted from the signer's hex output
   * @throws BitcoinAPIError with Refused code when the user rejects
   */
  public async signMessage(
    message: string,
    typeOrContext?: BitcoinSignatureType | SenderContext,
    senderContext?: SenderContext,
  ): Promise<string> {
    const { sender, option: type } = this.#resolveSenderAndOption(
      typeOrContext,
      senderContext,
    );
    const origin = this.#extractOrigin(sender);
    const address = await this.#getSigningAddress(origin);
    const signatureType: BitcoinSignatureType = type ?? 'ecdsa';

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'signMessage',
      { address, message, signatureType },
    );

    if (!isConfirmed) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.Refused,
        'User rejected message signing',
      );
    }

    const signatureHex = await this.#signMessage({
      address,
      message,
      signatureType,
    });

    if (!isHex(signatureHex)) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Signer returned a signature that is not valid hex',
      );
    }

    return Buffer.from(signatureHex, 'hex').toString('base64');
  }

  /**
   * Signs a single PSBT after user confirmation.
   *
   * @param psbtHex - Hex-encoded PSBT, as the Unisat/OKX API defines it
   * @param optionsOrContext - Sign scope and finalization behavior, or the
   * sender context when the dApp omitted options
   * @param senderContext - Sender context appended by the messaging channel
   * @returns Hex-encoded, finalized PSBT
   * @throws BitcoinAPIError with InvalidRequest code for a PSBT that is not
   * decodable hex, for a request to skip finalization, which is not supported,
   * and for a PSBT the connected account provably cannot sign
   * @throws BitcoinAPIError with Refused code when the user rejects
   */
  public async signPsbt(
    psbtHex: string,
    optionsOrContext?: SenderContext | SignPsbtOptions,
    senderContext?: SenderContext,
  ): Promise<string> {
    const { sender, option: options } = this.#resolveSenderAndOption(
      optionsOrContext,
      senderContext,
    );
    const origin = this.#extractOrigin(sender);
    const accountId = this.#getAccountId(origin);
    const psbtBase64 = this.#toPsbtBase64(psbtHex);
    this.#validateAutoFinalized(options);
    await this.#validateSignableInputs(psbtBase64, accountId, options);

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'signPsbt',
      { psbtsBase64: [psbtBase64], accountId, options },
    );

    if (!isConfirmed) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.Refused,
        'User rejected PSBT signing',
      );
    }

    const signedBase64 = await this.#signPsbt(psbtBase64, accountId, options);
    return psbtBase64ToHex(signedBase64);
  }

  /**
   * Builds a payment, reviews it, then signs and broadcasts it. The build runs
   * first so the review can show the recipient, amount and fee the wallet
   * actually produced; the confirmation gate gives the dApp a Refused error when
   * the user declines, before anything is signed.
   *
   * @param toAddress - Recipient address
   * @param satoshis - Amount to send, in satoshi
   * @param optionsAndContext - Fee rate override (or the sender context when
   * the dApp omitted options) followed by the appended sender context
   * @returns Transaction id
   * @throws BitcoinAPIError with Refused code when the user rejects
   */
  public async sendBitcoin(
    toAddress: string,
    satoshis: number,
    ...optionsAndContext: [
      optionsOrContext?: SenderContext | { feeRate?: number },
      senderContext?: SenderContext,
    ]
  ): Promise<string> {
    const { sender, option: options } = this.#resolveSenderAndOption(
      ...optionsAndContext,
    );
    const origin = this.#extractOrigin(sender);
    const accountId = this.#getAccountId(origin);

    const { psbtBase64, serializedTx, netSatoshis } = await this.#buildSendTx(
      toAddress,
      satoshis,
      { ...options, accountId },
    );

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'signPsbt',
      { psbtsBase64: [psbtBase64], accountId },
    );

    if (!isConfirmed) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.Refused,
        'User rejected the transaction',
      );
    }

    return this.#confirmSendTx({ accountId, serializedTx, netSatoshis });
  }

  /**
   * Broadcasts a raw signed transaction to the active network.
   *
   * @param rawTxHex - Hex-encoded raw transaction
   * @returns Transaction id
   * @throws BitcoinAPIError with InvalidRequest code for malformed hex
   * @throws BitcoinAPIError with InternalError code when broadcasting fails
   */
  public async pushTx(
    rawTxHex: string,
    { sender }: SenderContext,
  ): Promise<string> {
    const origin = this.#extractOrigin(sender);
    const accountId = this.#getAccountId(origin);

    if (!isHex(rawTxHex)) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        'Invalid hex-encoded transaction',
      );
    }

    return this.#submitRawTx({ accountId, rawTxHex });
  }

  /**
   * Extracts the dApp origin from the extension messaging sender.
   * @throws BitcoinAPIError when the sender is missing or has no origin
   */
  #extractOrigin(sender?: Runtime.MessageSender): string {
    if (!sender) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Missing sender context',
      );
    }
    const origin = senderOrigin(sender);
    if (!origin) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Could not determine dApp origin',
      );
    }
    return origin;
  }

  /**
   * Gets the account ID bound to a dApp origin at authorization time.
   * @throws BitcoinAPIError when no session account exists for the origin
   */
  #getAccountId(origin: string): AccountId {
    const accountId = this.#getAccountIdForOrigin(origin);
    if (!accountId) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        `No account found for origin: ${origin}. Please reconnect the dApp.`,
      );
    }
    return accountId;
  }

  /**
   * Distinguishes an omitted optional parameter from the sender context the
   * messaging channel appends, since a dApp calling with fewer arguments
   * shifts the context into the optional parameter's position.
   */
  #resolveSenderAndOption<T>(
    optionOrContext?: SenderContext | T,
    context?: SenderContext,
  ): { sender: Runtime.MessageSender; option?: T } {
    const sender = (
      context ??
      (isSenderContext(optionOrContext) ? optionOrContext : undefined)
    )?.sender;
    if (!sender) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Missing sender context',
      );
    }
    return {
      sender,
      option: isSenderContext(optionOrContext) ? undefined : optionOrContext,
    };
  }

  #toPsbtBase64(psbtHex: string): string {
    if (!isHex(psbtHex)) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        'Invalid hex-encoded PSBT',
      );
    }
    return psbtHexToBase64(psbtHex);
  }

  /**
   * Lace always finalizes the inputs it signs. A dApp asking to skip
   * finalization is rejected before the confirmation review opens, so it gets
   * the error immediately rather than a finalized PSBT it did not ask for.
   * autoFinalized is not part of SignPsbtOptions, so it is read from the raw
   * request a Unisat-style dApp may still send.
   */
  #validateAutoFinalized(options?: SignPsbtOptions): void {
    const rawOptions = options as { autoFinalized?: boolean } | undefined;
    if (rawOptions?.autoFinalized === false) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        'autoFinalized: false is not supported',
      );
    }
  }

  /**
   * Refuses a PSBT the connected account provably cannot sign, before the
   * review opens: signing finalizes the transaction, which requires a
   * signature for every input, so neither an input spending an address outside
   * the account nor a toSignInputs selection that leaves an input unsigned can
   * ever be honoured. The signing callback raises both conditions again, but
   * only once the user has reviewed and approved the request.
   *
   * An input whose previous output the PSBT does not embed is refused for the
   * same reason: every signer signs from the PSBT's own data, so an input
   * without an embedded previous output can never be signed, whatever the
   * review later resolves from the chain about it.
   *
   * A PSBT that does not decode is left to the review's error screen, which
   * explains the failure, and to the signing callback that rejects it. That
   * also covers a toSignInputs index that is out of range or repeated, which
   * inspectPsbt itself refuses to decode.
   *
   * Only SIGHASH_ALL is signed. The review derives the fee, the destination and
   * the balance change from the PSBT's current outputs, which a signature under
   * any other sighash does not commit to, so the dApp could rewrite them
   * afterwards. The signPsbt callback repeats the check as a backstop, but only
   * once the user has reviewed and approved the request; the signers themselves
   * cannot be relied on, since the hardware ones pass the PSBT's sighash fields
   * straight to the device.
   *
   * @throws BitcoinAPIError with InternalError code when the account has no
   * addresses, so ownership cannot be judged at all
   * @throws BitcoinAPIError with InvalidRequest code for an input that spends
   * a known address outside the connected account, for an input whose previous
   * output the PSBT does not embed, for a toSignInputs selection that does not
   * cover every input, and for an input to be signed under a sighash other
   * than SIGHASH_ALL
   */
  async #validateSignableInputs(
    psbtBase64: string,
    accountId: AccountId,
    options?: SignPsbtOptions,
  ): Promise<void> {
    const addresses = await this.#getAddressesOfAccount(accountId);
    if (addresses.length === 0) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'No addresses available for the connected account',
      );
    }
    const network = await this.#getActiveNetwork();

    let inputs: ReturnType<typeof inspectPsbt>['inputs'];
    let unresolvedInputs: ReturnType<typeof inspectPsbt>['unresolvedInputs'];
    try {
      ({ inputs, unresolvedInputs } = inspectPsbt(psbtBase64, {
        ownAddresses: new Set(
          addresses.map(address => address.address as string),
        ),
        network: toBitcoinJsNetwork(network),
        toSignInputs: options?.toSignInputs,
      }));
    } catch {
      return;
    }

    const foreignIndexes = inputs
      .filter(input => input.address !== undefined && !input.isOwn)
      .map(input => input.index);
    if (foreignIndexes.length > 0) {
      const indexes = foreignIndexes.join(', ');
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        `Cannot sign input(s) ${indexes}: they do not spend outputs owned by the connected account`,
      );
    }

    if (unresolvedInputs.length > 0) {
      const indexes = unresolvedInputs.map(input => input.index).join(', ');
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        `Cannot sign input(s) ${indexes}: the PSBT does not include the previous output they spend`,
      );
    }

    if (inputs.length === 0) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        'The PSBT has no input the wallet can sign',
      );
    }

    if (options?.toSignInputs && inputs.some(input => !input.willSign)) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        'toSignInputs must cover every input: finalizing requires all inputs signed',
      );
    }

    const sighashIndexes = nonDefaultSighashInputs(
      inputs,
      options?.toSignInputs,
    );
    if (sighashIndexes.length > 0) {
      const indexes = sighashIndexes.join(', ');
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InvalidRequest,
        `Cannot sign input(s) ${indexes}: only SIGHASH_ALL is supported`,
      );
    }
  }

  /**
   * Gets the Bitcoin addresses of the account bound to the given origin.
   */
  async #getAccountAddresses(origin: string): Promise<AnyAddress[]> {
    return this.#getAddressesOfAccount(this.#getAccountId(origin));
  }

  /**
   * Gets the Bitcoin addresses of one account, for callers that already hold
   * the account id and must not re-resolve it from the origin.
   */
  async #getAddressesOfAccount(accountId: AccountId): Promise<AnyAddress[]> {
    const addresses = await firstValueFrom(this.#addresses$);
    return addresses.filter(
      address =>
        address.accountId === accountId && address.blockchainName === 'Bitcoin',
    );
  }

  /**
   * Gets the account's primary address, used as the message signing address.
   * @throws BitcoinAPIError when the account has no addresses
   */
  async #getSigningAddress(origin: string): Promise<string> {
    const [address] = await this.#getAccountAddresses(origin);
    if (!address) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'No addresses available for the connected account',
      );
    }
    return address.address;
  }

  /**
   * Gets the origin's account UTXO set, falling back to the provider when the
   * account has not been synced into the UTXO map yet.
   */
  async #getAccountUtxos(origin: string): Promise<readonly BitcoinUTxO[]> {
    const accountId = this.#getAccountId(origin);
    const accountUtxos = await firstValueFrom(this.#accountUtxos$);
    const utxos = accountUtxos[accountId];
    if (utxos) return utxos;
    return this.#fetchUtxosFromProvider(origin);
  }

  /**
   * Fetches UTXOs for every account address directly from the provider.
   * @throws BitcoinAPIError when any provider request fails
   */
  async #fetchUtxosFromProvider(origin: string): Promise<BitcoinUTxO[]> {
    const addresses = await this.#getAccountAddresses(origin);
    const network = await this.#getActiveNetwork();

    const utxos: BitcoinUTxO[] = [];
    for (const address of addresses) {
      const result = await firstValueFrom(
        this.#bitcoinProvider.getUTxOs({ network }, address.address, {}),
      );
      if (result.isErr()) {
        throw new BitcoinAPIError(
          BitcoinAPIErrorCode.InternalError,
          `Failed to fetch UTXOs: ${result.error.reason}`,
        );
      }
      utxos.push(...result.value.items);
    }
    return utxos;
  }

  /**
   * Gets the active Bitcoin network.
   * @throws BitcoinAPIError when no Bitcoin network is active
   */
  async #getActiveNetwork(): Promise<BitcoinNetwork> {
    const networkId = await firstValueFrom(this.#activeNetworkId$);
    const network =
      networkId === undefined
        ? undefined
        : BitcoinNetworkId.getBitcoinNetwork(networkId);
    if (!network) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'No active Bitcoin network',
      );
    }
    return network;
  }
}
