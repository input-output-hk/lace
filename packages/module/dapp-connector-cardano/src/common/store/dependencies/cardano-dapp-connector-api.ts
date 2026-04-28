import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { blake2b } from '@cardano-sdk/crypto';
import {
  AddressType,
  Bip32Account,
  KeyRole,
} from '@cardano-sdk/key-management';
import {
  type AccountRewardAccountDetailsMap,
  type CardanoAccountAddressHistoryMap,
  type CardanoPaymentAddress,
  isCardanoAccount,
  isCardanoAddress,
} from '@lace-contract/cardano-context';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import {
  type AccountId,
  type AnyAccount,
  type AnyWallet,
  WalletType,
} from '@lace-contract/wallet-repo';
import { mapHwSigningError } from '@lace-lib/util-hw';
import { senderOrigin } from '@lace-sdk/dapp-connector';
import { firstValueFrom } from 'rxjs';

import {
  APIError,
  APIErrorCode,
  TxSignError,
  TxSignErrorCode,
} from '../../api-error';
import { addrToSignWith, transformToGroupedAddresses } from '../util';
import { requiresForeignSignaturesFromCbor } from '../utils/input-resolver';

import type { CardanoConfirmationCallback } from './create-confirmation-callback';
import type {
  Address,
  Cbor,
  Cip30ExperimentalApi,
  Cip30FullWalletApi,
  Cip142WalletApi,
  Cip95WalletApi,
  DataSignature,
  Paginate,
  SenderContext,
  TransactionUnspentOutput,
  WalletApiExtension,
  WithSenderContext,
} from '../../types';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type {
  AccountUtxoMap,
  CardanoAddressData,
  CardanoSignerContext,
  RewardAccountDetails,
} from '@lace-contract/cardano-context';
import type { SignerFactory } from '@lace-contract/signer';
import type { HwSigningErrorTranslationKeys } from '@lace-lib/util-hw';
import type { Observable, Subject } from 'rxjs';

/**
 * Function type for signing a Cardano transaction.
 * Takes the transaction CBOR, partial sign flag, and origin.
 * Returns the witness set CBOR.
 */
export type SignTransactionFunction = (
  txCbor: Cbor,
  partialSign: boolean,
  origin: string,
) => Promise<Cbor>;

/**
 * Function type for submitting a signed transaction.
 * Takes the signed transaction CBOR.
 * Returns the transaction hash.
 */
export type SubmitTransactionFunction = (txCbor: Cbor) => Promise<string>;

/**
 * Function type for deriving and persisting the next unused External address
 * for an account. Used by getUnusedAddresses when all existing External
 * addresses already have on-chain history.
 */
export type DeriveNextUnusedAddressFunction = (
  accountId: AccountId,
) => Promise<AnyAddress<CardanoAddressData>>;

/**
 * Checks if the stake key for the given account is registered.
 * @param details - account reward details to check against
 */
const isStakeKeyRegistered = (
  details: RewardAccountDetails,
): boolean | undefined => {
  return details.rewardAccountInfo?.isRegistered ?? false;
};

/**
 * Derives a public key for a given account and key role.
 *
 * @returns Ed25519 public key hex string
 */
const derivePublicKeyForAccount = async ({
  accountId,
  allAccounts,
  role,
  keyLabel,
}: {
  accountId: AccountId;
  allAccounts: AnyAccount[];
  role: KeyRole;
  keyLabel: string;
}): Promise<string> => {
  const account = allAccounts.find(
    accumulator => accumulator.accountId === accountId,
  );

  if (!account) {
    throw new APIError(
      APIErrorCode.InternalError,
      `Account not found for ID: ${accountId}`,
    );
  }

  if (account.accountType == 'MultiSig') {
    throw new APIError(
      APIErrorCode.InternalError,
      `${keyLabel} key retrieval not supported for MultiSig accounts: ${accountId}`,
    );
  }

  if (!isCardanoAccount(account)) {
    throw new APIError(
      APIErrorCode.InternalError,
      `Account is not a Cardano account for ID: ${accountId}`,
    );
  }

  const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
  const dependencies = { blake2b, bip32Ed25519 };
  const bip32Account = new Bip32Account(
    account.blockchainSpecific,
    dependencies,
  );

  return bip32Account.derivePublicKey({
    index: 0,
    role,
  });
};

/**
 * Dependencies required to construct a CardanoDappConnectorApi instance.
 */
export interface CardanoDappConnectorApiDependencies {
  accountUtxos$: Observable<AccountUtxoMap>;
  accountUnspendableUtxos$: Observable<AccountUtxoMap>;
  rewardAccountDetails$: Observable<AccountRewardAccountDetailsMap>;
  addresses$: Observable<AnyAddress[]>;
  allAccounts$: Observable<AnyAccount[]>;
  /** All wallets - needed for accessing encrypted root private key for signing */
  allWallets$: Observable<AnyWallet[]>;
  chainId$: Observable<Cardano.ChainId | undefined>;
  /** Per-account address transaction history; used to classify addresses as used/unused */
  accountTransactionHistory$: Observable<CardanoAccountAddressHistoryMap>;
  /**
   * Function to get account ID for a specific dApp origin.
   * Enables per-dApp account isolation - each dApp uses its own selected account.
   */
  getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  /** Callback for user confirmation flows (required for signing) */
  userConfirmationRequest?: CardanoConfirmationCallback;
  /** Function to sign transactions (required for signTx) */
  signTransaction?: SignTransactionFunction;
  /** Function to submit transactions */
  submitTransaction: SubmitTransactionFunction;
  /**
   * Derive and persist the next External address for an account. Invoked when
   * all existing External addresses already have on-chain history.
   */
  deriveNextUnusedAddress?: DeriveNextUnusedAddressFunction;
  /** Signer factory for data signing operations */
  signerFactory?: SignerFactory;
  /** Function to get the auth secret */
  accessAuthSecret?: AccessAuthSecret;
  /** Function to show the auth prompt */
  authenticate?: Authenticate;
  /** Subject to signal signing completion to the popup flow */
  signingResult$?: Subject<SigningResult>;
}

export type SigningResult =
  | { type: 'cancelled' }
  | { type: 'error'; hwErrorKeys?: HwSigningErrorTranslationKeys }
  | { type: 'success' };

/**
 * Serializes a Cardano UTXO to CBOR hex string (CIP-30 format)
 */
const serializeUtxo = (utxo: Cardano.Utxo): TransactionUnspentOutput => {
  const [txIn, txOut] = utxo;
  const utxoCore: Cardano.Utxo = [txIn, txOut];
  const serialized = Serialization.TransactionUnspentOutput.fromCore(utxoCore);
  return serialized.toCbor() as TransactionUnspentOutput;
};

/**
 * Serializes a Cardano address to CBOR hex string
 */
const serializeAddress = (address: Cardano.PaymentAddress): Address => {
  const addr = Cardano.Address.fromBech32(address);
  return addr.toBytes() as Address;
};

/**
 * Serializes a Cardano Value to CBOR hex string
 */
const serializeValue = (value: Cardano.Value): Cbor => {
  const serialized = Serialization.Value.fromCore(value);
  return serialized.toCbor() as Cbor;
};

/**
 * Deserializes CBOR hex string to Cardano Value
 */
const deserializeValue = (cbor: Cbor): Cardano.Value => {
  const value = Serialization.Value.fromCbor(Serialization.TxCBOR(cbor));
  return value.toCore();
};

/**
 * CardanoDappConnectorApi - Implements CIP-30 wallet API for Cardano dApps
 *
 * This class provides the Cardano implementation for the CIP-30 standard,
 * handling wallet operations requested by dApps through the extension.
 *
 * For signing operations (signTx, signData), this class:
 * 1. Triggers user confirmation via the confirmation callback
 * 2. If confirmed, uses the auth secret to perform the signing
 * 3. Returns the result or throws APIError on rejection
 *
 * @see https://cips.cardano.org/cip/CIP-30
 * @see https://github.com/input-output-hk/cardano-js-sdk
 */
export class CardanoDappConnectorApi
  implements WithSenderContext<Cip30FullWalletApi>
{
  public readonly cip95: WithSenderContext<Cip95WalletApi>;
  public readonly cip142: WithSenderContext<Cip142WalletApi>;
  public readonly experimental: WithSenderContext<Cip30ExperimentalApi>;

  readonly #accountUtxos$: Observable<AccountUtxoMap>;
  readonly #accountUnspendableUtxos$: Observable<AccountUtxoMap>;
  readonly #rewardAccountDetails$: Observable<AccountRewardAccountDetailsMap>;
  readonly #addresses$: Observable<AnyAddress[]>;
  readonly #allAccounts$: Observable<AnyAccount[]>;
  readonly #allWallets$: Observable<AnyWallet[]>;
  readonly #chainId$: Observable<Cardano.ChainId | undefined>;
  readonly #accountTransactionHistory$: Observable<CardanoAccountAddressHistoryMap>;
  readonly #getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  readonly #userConfirmationRequest?: CardanoConfirmationCallback;
  readonly #signTransaction?: SignTransactionFunction;
  readonly #submitTransaction: SubmitTransactionFunction;
  readonly #deriveNextUnusedAddress?: DeriveNextUnusedAddressFunction;
  readonly #signerFactory?: SignerFactory;
  readonly #accessAuthSecret?: AccessAuthSecret;
  readonly #authenticate?: Authenticate;
  readonly #signingResult$?: Subject<SigningResult>;

  public constructor({
    accountUtxos$,
    accountUnspendableUtxos$,
    rewardAccountDetails$,
    addresses$,
    chainId$,
    allAccounts$,
    allWallets$,
    accountTransactionHistory$,
    getAccountIdForOrigin,
    userConfirmationRequest,
    signTransaction,
    submitTransaction,
    deriveNextUnusedAddress,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$,
  }: CardanoDappConnectorApiDependencies) {
    this.#accountUtxos$ = accountUtxos$;
    this.#accountUnspendableUtxos$ = accountUnspendableUtxos$;
    this.#rewardAccountDetails$ = rewardAccountDetails$;
    this.#addresses$ = addresses$;
    this.#chainId$ = chainId$;
    this.#accountTransactionHistory$ = accountTransactionHistory$;
    this.#getAccountIdForOrigin = getAccountIdForOrigin;
    this.#userConfirmationRequest = userConfirmationRequest;
    this.#signTransaction = signTransaction;
    this.#submitTransaction = submitTransaction;
    this.#deriveNextUnusedAddress = deriveNextUnusedAddress;
    this.#signerFactory = signerFactory;
    this.#allAccounts$ = allAccounts$;
    this.#allWallets$ = allWallets$;
    this.#accessAuthSecret = accessAuthSecret;
    this.#authenticate = authenticate;
    this.#signingResult$ = signingResult$;

    this.cip95 = {
      getPubDRepKey: this.getPubDRepKey.bind(this),
      getRegisteredPubStakeKeys: this.getRegisteredPubStakeKeys.bind(this),
      getUnregisteredPubStakeKeys: this.getUnregisteredPubStakeKeys.bind(this),
    };

    this.cip142 = {
      getNetworkMagic: this.getNetworkMagic.bind(this),
    };

    this.experimental = {
      getCollateral: this.getCollateral.bind(this),
    };
  }

  /**
   * Normalize a Cardano Value "assets" representation to a Map.
   * This keeps the "business logic" methods small and avoids branching in them.
   */
  static #toAssetMap(assets: unknown): Map<Cardano.AssetId, bigint> {
    if (!assets) return new Map();

    if (assets instanceof Map) {
      return new Map(assets as Map<Cardano.AssetId, bigint>);
    }

    const record = assets as Record<string, bigint>;
    return new Map(
      Object.entries(record).map(
        ([assetId, amount]) => [assetId as Cardano.AssetId, amount] as const,
      ),
    );
  }

  /**
   * Merge assets into an accumulator Map.
   */
  static #addAssets(
    target: Map<Cardano.AssetId, bigint>,
    assets: unknown,
  ): void {
    for (const [assetId, amount] of CardanoDappConnectorApi.#toAssetMap(
      assets,
    )) {
      target.set(assetId, (target.get(assetId) ?? 0n) + amount);
    }
  }

  /**
   * Check if `available` satisfies all `required` assets.
   */
  static #hasEnoughAssets(
    required: Map<Cardano.AssetId, bigint>,
    available: Map<Cardano.AssetId, bigint>,
  ): boolean {
    for (const [assetId, requiredAmount] of required) {
      if ((available.get(assetId) ?? 0n) < requiredAmount) return false;
    }
    return true;
  }

  /**
   * Returns the network ID of the currently connected account.
   * 0 = testnet, 1 = mainnet
   *
   * Note: This method doesn't require sender context as it's called before enable()
   */
  public async getNetworkId(): Promise<number> {
    const chainId = await firstValueFrom(this.#chainId$);
    if (!chainId) {
      throw new APIError(APIErrorCode.InternalError, 'No active chain');
    }
    return chainId.networkId;
  }

  /**
   * Returns a list of UTXOs controlled by the wallet.
   * Optionally filters by amount and paginates results.
   *
   * @param amount - Optional CBOR-encoded value to filter UTXOs by
   * @param paginate - Optional pagination settings
   * @param context - Sender context with dApp information
   */
  public async getUtxos(
    amount?: Cbor,
    paginate?: Paginate,
    context?: SenderContext,
  ): Promise<TransactionUnspentOutput[] | null> {
    const origin = this.#extractOrigin(context);
    const utxos = await this.#getAccountUtxos(origin);
    if (utxos.length === 0) {
      return null;
    }

    let filteredUtxos = utxos;

    if (amount) {
      const requiredValue = deserializeValue(amount);
      filteredUtxos = this.#filterUtxosByAmount(utxos, requiredValue);

      if (filteredUtxos.length === 0) {
        return null;
      }
    }

    if (paginate) {
      const start = paginate.page * paginate.limit;
      const end = start + paginate.limit;
      filteredUtxos = filteredUtxos.slice(start, end);
    }

    return filteredUtxos.map(serializeUtxo);
  }

  /**
   * Returns the total balance available in the wallet (CBOR-encoded Value)
   *
   * @param context - Sender context with dApp information
   */
  public async getBalance(context?: SenderContext): Promise<Cbor> {
    const origin = this.#extractOrigin(context);
    const utxos = await this.#getAccountUtxos(origin);
    const totalValue = this.#calculateTotalValue(utxos);
    return serializeValue(totalValue);
  }

  /**
   * Returns a list of all used (non-empty) addresses controlled by the wallet
   *
   * @param paginate - Optional pagination settings
   * @param context - Sender context with dApp information
   */
  public async getUsedAddresses(
    paginate?: Paginate,
    context?: SenderContext,
  ): Promise<Address[]> {
    const origin = this.#extractOrigin(context);
    const usedAddresses = await this.#getCardanoAddresses(origin);

    usedAddresses.sort(
      (a, b) => (a.data?.accountIndex ?? 0) - (b.data?.accountIndex ?? 0),
    );

    let result = usedAddresses.map(addr =>
      serializeAddress(Cardano.PaymentAddress(addr.address)),
    );

    if (paginate) {
      const start = paginate.page * paginate.limit;
      const end = start + paginate.limit;
      result = result.slice(start, end);
    }

    return result;
  }

  /**
   * Returns a list of unused addresses controlled by the wallet.
   *
   * Mirrors `cardano-js-sdk` `BaseWallet.getNextUnusedAddress`: picks the
   * highest-indexed External address; if it has no on-chain history returns
   * it; otherwise derives the next External address via the injected
   * `deriveNextUnusedAddress` callback (which persists it to Redux).
   *
   * Returns `[]` for MultiSig accounts or when no derivation callback is
   * wired; shared script addresses don't derive via BIP44.
   *
   * @param context - Sender context with dApp information
   */
  public async getUnusedAddresses(context?: SenderContext): Promise<Address[]> {
    const origin = this.#extractOrigin(context);
    const accountId = this.#getAccountId(origin);

    const allAccounts = await firstValueFrom(this.#allAccounts$);
    const account = allAccounts.find(a => a.accountId === accountId);
    if (
      !account ||
      !isCardanoAccount(account) ||
      account.accountType === 'MultiSig'
    ) {
      return [];
    }

    const externalAddresses = (await this.#getCardanoAddresses(origin)).filter(
      addr => addr.data?.type === AddressType.External,
    );
    if (externalAddresses.length === 0) {
      return [];
    }

    const latest = externalAddresses.reduce((max, addr) =>
      (addr.data?.index ?? 0) > (max.data?.index ?? 0) ? addr : max,
    );

    const history = await firstValueFrom(this.#accountTransactionHistory$);
    const hasHistory = (addr: AnyAddress<CardanoAddressData>): boolean =>
      (history[accountId]?.[addr.address as CardanoPaymentAddress]
        ?.transactionHistory.length ?? 0) > 0;

    if (!hasHistory(latest)) {
      return [serializeAddress(Cardano.PaymentAddress(latest.address))];
    }

    if (!this.#deriveNextUnusedAddress) {
      return [];
    }

    const derived = await this.#deriveNextUnusedAddress(accountId);
    return [serializeAddress(Cardano.PaymentAddress(derived.address))];
  }

  /**
   * Returns an address to use for transaction change
   *
   * @param context - Sender context with dApp information
   */
  public async getChangeAddress(context?: SenderContext): Promise<Address> {
    const origin = this.#extractOrigin(context);
    const addresses = await this.#getCardanoAddresses(origin);

    if (addresses.length === 0) {
      throw new APIError(APIErrorCode.InternalError, 'No addresses available');
    }

    return serializeAddress(Cardano.PaymentAddress(addresses[0].address));
  }

  /**
   * Returns the reward (stake) addresses owned by the wallet
   *
   * @param context - Sender context with dApp information
   */
  public async getRewardAddresses(context?: SenderContext): Promise<Address[]> {
    const origin = this.#extractOrigin(context);
    const addresses = await this.#getCardanoAddresses(origin);

    const rewardAccounts = new Set<string>();
    for (const addr of addresses) {
      const rewardAccount = addr.data?.rewardAccount;
      if (rewardAccount) {
        rewardAccounts.add(rewardAccount);
      }
    }

    return [...rewardAccounts].map(rewardAccount => {
      const addr = Cardano.Address.fromBech32(
        rewardAccount as Cardano.RewardAccount,
      );
      return addr.toBytes() as Address;
    });
  }

  /**
   * Signs a transaction using the wallet's private keys.
   *
   * This method triggers user confirmation via a popup window.
   * If the user confirms, it uses the auth secret to sign the transaction.
   *
   * @param tx - CBOR-encoded transaction hex string
   * @param partialSign - If true, only signs what the wallet can sign (for multi-sig)
   * @param context - Sender context with dApp information
   * @returns CBOR-encoded transaction witness set
   * @throws APIError with Refused code if user rejects
   * @throws APIError with InternalError if signing dependencies not configured
   */
  public async signTx(
    tx: Cbor,
    partialSign: boolean = false,
    { sender }: SenderContext,
  ): Promise<Cbor> {
    if (!this.#userConfirmationRequest || !this.#signTransaction) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Signing not configured for this API instance',
      );
    }

    const origin = this.#extractOrigin({ sender });

    await this.#validateCanSign(tx, partialSign, origin);

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'signTx',
      { txHex: tx, partialSign },
    );

    if (!isConfirmed) {
      throw new APIError(APIErrorCode.Refused, 'User rejected transaction');
    }

    try {
      return await this.#signTransaction(tx, partialSign, origin);
    } catch (error) {
      if (error instanceof AuthenticationCancelledError) {
        throw new APIError(
          APIErrorCode.Refused,
          'User cancelled authentication',
        );
      }
      throw error;
    }
  }

  /**
   * Signs arbitrary data per CIP-8 specification.
   *
   * This method triggers user confirmation via a popup window.
   * If the user confirms, it uses the auth secret to sign the data.
   *
   * @param addr - Address (bech32 or hex) that will sign the data
   * @param payload - Hex-encoded payload to sign
   * @param context - Sender context with dApp information
   * @returns Data signature with COSE_Sign1 signature and COSE_Key
   * @throws APIError with Refused code if user rejects
   * @throws APIError with InternalError if signing dependencies not configured
   */
  public async signData(
    addr: string,
    payload: string,
    { sender }: SenderContext,
  ): Promise<DataSignature> {
    if (!this.#userConfirmationRequest) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Signing not configured for this API instance',
      );
    }

    const { isConfirmed } = await this.#userConfirmationRequest(
      sender,
      'signData',
      { address: addr, payload },
    );

    if (!isConfirmed) {
      throw new APIError(APIErrorCode.Refused, 'User rejected data signing');
    }

    const origin = this.#extractOrigin({ sender });
    const accountId = this.#getAccountId(origin);

    const allAccounts = await firstValueFrom(this.#allAccounts$);
    const account = allAccounts.find(a => a.accountId === accountId);

    if (!account) {
      throw new APIError(
        APIErrorCode.InternalError,
        `Account not found for ID: ${accountId}`,
      );
    }

    if (!isCardanoAccount(account)) {
      throw new APIError(
        APIErrorCode.InternalError,
        `Account is not a Cardano account: ${accountId}`,
      );
    }

    if (account.accountType === 'MultiSig') {
      throw new APIError(
        APIErrorCode.InternalError,
        `signData is not supported for MultiSig accounts: ${accountId}`,
      );
    }

    const allWallets = await firstValueFrom(this.#allWallets$);
    const wallet = allWallets.find(w => w.walletId === account.walletId);

    if (!wallet) {
      throw new APIError(
        APIErrorCode.InternalError,
        `Wallet not found for ID: ${account.walletId}`,
      );
    }

    const cardanoAddresses = await this.#getCardanoAddresses(origin);
    const knownAddresses = this.#transformToGroupedAddresses(cardanoAddresses);

    if (
      !this.#signerFactory ||
      !this.#accessAuthSecret ||
      !this.#authenticate
    ) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Signer factory not configured for this API instance',
      );
    }

    const auth = signerAuthFromPrompt(
      {
        accessAuthSecret: this.#accessAuthSecret,
        authenticate: this.#authenticate,
      },
      {
        cancellable: true,
        confirmButtonLabel:
          'authentication-prompt.confirm-button-label.sign-data',
        message: 'authentication-prompt.message.sign-data',
      },
    );

    const signerContext: CardanoSignerContext = {
      wallet,
      accountId,
      knownAddresses,
      auth,
    };
    const dataSigner = this.#signerFactory.createDataSigner(signerContext);

    try {
      const result = (await firstValueFrom(
        dataSigner.signData({
          signWith: addrToSignWith(addr),
          payload,
        }),
      )) as DataSignature;
      this.#signingResult$?.next({ type: 'success' });
      return result;
    } catch (error) {
      if (error instanceof AuthenticationCancelledError) {
        this.#signingResult$?.next({ type: 'cancelled' });
        throw new APIError(
          APIErrorCode.Refused,
          'User cancelled authentication',
        );
      }
      const isHwWallet =
        wallet.type === WalletType.HardwareLedger ||
        wallet.type === WalletType.HardwareTrezor;
      const hwErrorKeys = isHwWallet ? mapHwSigningError(error) : undefined;
      this.#signingResult$?.next({ type: 'error', hwErrorKeys });
      throw error;
    }
  }

  /**
   * Submits a signed transaction to the network.
   *
   * This method does not require user confirmation as the transaction
   * should have already been signed with user approval.
   *
   * @param tx - CBOR-encoded signed transaction
   * @returns Transaction hash
   * @throws APIError with InternalError if submit function not configured
   */
  public async submitTx(tx: Cbor): Promise<string> {
    return this.#submitTransaction(tx);
  }

  /**
   * Returns UTXOs suitable for use as collateral.
   *
   * Collateral UTXOs must be pure ADA (no native tokens) and are used
   * to cover transaction fees in case of script validation failure.
   *
   * @param params - Optional parameters including amount filter
   * @param context - Sender context with dApp information
   * @returns Collateral UTXOs or null if unavailable
   */
  public async getCollateral(
    params?: { amount?: Cbor },
    context?: SenderContext,
  ): Promise<TransactionUnspentOutput[] | null> {
    const origin = this.#extractOrigin(context);
    const accountId = this.#getAccountId(origin);
    const accountUtxos = await firstValueFrom(this.#accountUnspendableUtxos$);
    const utxos = accountUtxos[accountId] ?? [];

    if (utxos.length === 0) {
      return null;
    }

    if (params?.amount) {
      const requiredValue = deserializeValue(params.amount);
      const filtered = this.#filterUtxosByAmount(utxos, requiredValue);
      const totalValue = this.#calculateTotalValue(filtered);

      const hasEnoughCoins = totalValue.coins >= requiredValue.coins;
      const hasEnoughAssets = CardanoDappConnectorApi.#hasEnoughAssets(
        CardanoDappConnectorApi.#toAssetMap(requiredValue.assets),
        CardanoDappConnectorApi.#toAssetMap(totalValue.assets),
      );

      if (!hasEnoughCoins || !hasEnoughAssets) {
        return null;
      }

      return filtered.map(serializeUtxo);
    }

    return utxos.map(serializeUtxo);
  }

  /**
   * Returns the list of enabled wallet extensions.
   *
   * @returns Array of extension identifiers with CIP numbers
   * @see https://cips.cardano.org/cip/CIP-30#extensions
   */
  public async getExtensions(): Promise<WalletApiExtension[]> {
    return [{ cip: 95 }];
  }

  /**
   * Returns the network magic number.
   *
   * Network magic identifies the specific Cardano network
   * (e.g., 764824073 for mainnet, 1 for preprod, 2 for preview).
   *
   * @returns Network magic number
   * @throws APIError if no active chain
   * @see https://cips.cardano.org/cip/CIP-142
   */
  public async getNetworkMagic(): Promise<number> {
    const chainId = await firstValueFrom(this.#chainId$);
    if (!chainId) {
      throw new APIError(APIErrorCode.InternalError, 'No active chain');
    }
    return chainId.networkMagic;
  }

  /**
   * Returns the public DRep key for governance voting.
   *
   * DRep (Delegated Representative) keys are used for voting
   * in Cardano's on-chain governance system.
   *
   * @param context - Sender context with dApp information
   * @returns Ed25519 public key hex string
   * @throws APIError as this feature is not yet implemented
   * @see https://cips.cardano.org/cip/CIP-95
   */
  public async getPubDRepKey(context: SenderContext): Promise<string> {
    const origin = this.#extractOrigin(context);
    const accountId = this.#getAccountId(origin);
    const allAccounts = await firstValueFrom(this.#allAccounts$);

    return derivePublicKeyForAccount({
      accountId,
      allAccounts,
      role: KeyRole.DRep,
      keyLabel: 'DRep',
    });
  }

  /**
   * Returns public stake keys that are registered on-chain.
   *
   * Registered stake keys are those that have been registered
   * with a stake registration certificate on the Cardano blockchain.
   *
   * @param context - Sender context with dApp information
   * @returns Array of Ed25519 public key hex strings
   * @see https://cips.cardano.org/cip/CIP-95
   */
  public async getRegisteredPubStakeKeys(
    context?: SenderContext,
  ): Promise<string[]> {
    const origin = this.#extractOrigin(context);
    const accountId = this.#getAccountId(origin);
    const rewardAccountDetails = await firstValueFrom(
      this.#rewardAccountDetails$,
    );
    const details = rewardAccountDetails[accountId];

    if (!details) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Reward account details not found for account ID: ' + accountId,
      );
    }

    if (!isStakeKeyRegistered(details)) {
      return [];
    }

    const pubStakeKey = await derivePublicKeyForAccount({
      accountId,
      allAccounts: await firstValueFrom(this.#allAccounts$),
      role: KeyRole.Stake,
      keyLabel: 'Stake',
    });
    return [pubStakeKey];
  }

  /**
   * Returns public stake keys that are NOT registered on-chain.
   *
   * Unregistered stake keys are those that have not been registered
   * with a stake registration certificate on the Cardano blockchain.
   *
   * @param context - Sender context with dApp information
   * @returns Array of Ed25519 public key hex strings
   * @see https://cips.cardano.org/cip/CIP-95
   */
  public async getUnregisteredPubStakeKeys(
    context?: SenderContext,
  ): Promise<string[]> {
    const origin = this.#extractOrigin(context);
    const accountId = this.#getAccountId(origin);
    const rewardAccountDetails = await firstValueFrom(
      this.#rewardAccountDetails$,
    );
    const details = rewardAccountDetails[accountId];

    if (!details) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Reward account details not found for account ID: ' + accountId,
      );
    }

    if (isStakeKeyRegistered(details)) {
      return [];
    }

    const pubStakeKey = await derivePublicKeyForAccount({
      accountId,
      allAccounts: await firstValueFrom(this.#allAccounts$),
      role: KeyRole.Stake,
      keyLabel: 'Stake',
    });
    return [pubStakeKey];
  }

  /**
   * Extracts the origin URL from sender context.
   * @param context - The sender context
   * @returns The origin URL
   * @throws APIError if sender context is missing or origin cannot be determined
   */
  #extractOrigin(context?: SenderContext): string {
    if (!context?.sender) {
      throw new APIError(APIErrorCode.InternalError, 'Missing sender context');
    }
    const origin = senderOrigin(context.sender);
    if (!origin) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Could not determine dApp origin',
      );
    }
    return origin;
  }

  /**
   * Gets the account ID for a specific dApp origin.
   * @param origin - The dApp origin URL
   * @returns The account ID associated with this origin
   * @throws APIError if no account is found for the origin
   */
  #getAccountId(origin: string): AccountId {
    const accountId = this.#getAccountIdForOrigin(origin);
    if (!accountId) {
      throw new APIError(
        APIErrorCode.InternalError,
        `No account found for origin: ${origin}. Please reconnect the dApp.`,
      );
    }
    return accountId;
  }

  /**
   * Gets UTXOs for the account associated with the given dApp origin.
   * @param origin - The dApp origin URL
   */
  async #getAccountUtxos(origin: string): Promise<Cardano.Utxo[]> {
    const accountId = this.#getAccountId(origin);
    const accountUtxos = await firstValueFrom(this.#accountUtxos$);
    return accountUtxos[accountId] ?? [];
  }

  /**
   * Gets Cardano addresses for the account associated with the given dApp origin.
   * @param origin - The dApp origin URL
   */
  async #getCardanoAddresses(
    origin: string,
  ): Promise<AnyAddress<CardanoAddressData>[]> {
    const accountId = this.#getAccountId(origin);
    const addresses = await firstValueFrom(this.#addresses$);
    return addresses
      .filter(addr => addr.accountId === accountId && isCardanoAddress(addr))
      .map(addr => addr as AnyAddress<CardanoAddressData>);
  }

  /**
   * Transforms AnyAddress<CardanoAddressData> to GroupedAddress format
   * required by the SDK's cip30signData function.
   * @param addresses - Array of Cardano addresses
   */
  #transformToGroupedAddresses(
    addresses: AnyAddress<CardanoAddressData>[],
  ): GroupedAddress[] {
    return addresses
      .filter(
        (
          addr,
        ): addr is AnyAddress<CardanoAddressData> & {
          data: CardanoAddressData;
        } => addr.data !== undefined,
      )
      .map(addr => ({
        type: addr.data.type,
        index: addr.data.index,
        networkId: addr.data.networkId,
        accountIndex: addr.data.accountIndex,
        address: Cardano.PaymentAddress(addr.address),
        rewardAccount: addr.data
          .rewardAccount as unknown as Cardano.RewardAccount,
        stakeKeyDerivationPath: addr.data.stakeKeyDerivationPath,
      }));
  }

  /**
   * Filters UTXOs to find a set that satisfies the required value
   */
  #filterUtxosByAmount(
    utxos: Cardano.Utxo[],
    requiredValue: Cardano.Value,
  ): Cardano.Utxo[] {
    const requiredCoins = requiredValue.coins;
    const requiredAssets = CardanoDappConnectorApi.#toAssetMap(
      requiredValue.assets,
    );

    const selected: Cardano.Utxo[] = [];
    let totalCoins = 0n;
    const totalAssets = new Map<Cardano.AssetId, bigint>();

    for (const utxo of utxos) {
      const [, txOut] = utxo;
      selected.push(utxo);

      totalCoins += txOut.value.coins;
      CardanoDappConnectorApi.#addAssets(totalAssets, txOut.value.assets);

      if (totalCoins < requiredCoins) continue;
      if (
        !CardanoDappConnectorApi.#hasEnoughAssets(requiredAssets, totalAssets)
      )
        continue;
      return selected;
    }

    return selected;
  }

  /**
   * Calculates the total value across all UTXOs
   */
  #calculateTotalValue(utxos: Cardano.Utxo[]): Cardano.Value {
    let totalCoins = 0n;
    const totalAssets = new Map<Cardano.AssetId, bigint>();

    for (const [, txOut] of utxos) {
      totalCoins += txOut.value.coins;
      CardanoDappConnectorApi.#addAssets(totalAssets, txOut.value.assets);
    }

    const assets = totalAssets.size === 0 ? undefined : totalAssets;
    return {
      coins: totalCoins,
      assets,
    } as Cardano.Value;
  }

  async #validateCanSign(
    txCbor: Cbor,
    partialSign: boolean,
    origin: string,
  ): Promise<void> {
    const accountId = this.#getAccountIdForOrigin(origin);
    if (!accountId) {
      throw new TxSignError(
        TxSignErrorCode.ProofGeneration,
        `No account found for origin: ${origin}. Please reconnect the dApp.`,
      );
    }

    const [chainId, allAccounts, allAddresses, accountUtxos] =
      await Promise.all([
        firstValueFrom(this.#chainId$),
        firstValueFrom(this.#allAccounts$),
        firstValueFrom(this.#addresses$),
        firstValueFrom(this.#accountUtxos$),
      ]);

    if (!chainId) {
      throw new TxSignError(
        TxSignErrorCode.ProofGeneration,
        'Cannot sign transaction: chain ID is undefined',
      );
    }

    const account = allAccounts.find(a => a.accountId === accountId);
    if (!account || !isCardanoAccount(account)) {
      throw new TxSignError(
        TxSignErrorCode.ProofGeneration,
        `Cardano account not found for ID: ${accountId}`,
      );
    }

    const knownAddresses = transformToGroupedAddresses(allAddresses, accountId);
    const localUtxos = accountUtxos[accountId] ?? [];

    const { accountIndex, extendedAccountPublicKey } =
      account.blockchainSpecific as {
        accountIndex: number;
        extendedAccountPublicKey: Crypto.Bip32PublicKeyHex;
      };

    const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
    const bip32Account = new Bip32Account(
      { extendedAccountPublicKey, accountIndex, chainId },
      { blake2b, bip32Ed25519 },
    );
    const dRepPubKey = await bip32Account.derivePublicKey({
      index: 0,
      role: KeyRole.DRep,
    });
    const dRepKeyHash = Crypto.Ed25519PublicKey.fromHex(dRepPubKey)
      .hash()
      .hex();

    if (!partialSign) {
      if (
        requiresForeignSignaturesFromCbor(
          txCbor,
          localUtxos,
          knownAddresses,
          dRepKeyHash,
        )
      ) {
        throw new TxSignError(
          TxSignErrorCode.ProofGeneration,
          'The wallet does not have the secret key associated with some of the inputs or certificates.',
        );
      }
    }
  }
}
