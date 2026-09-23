import { Cardano, Serialization } from '@cardano-sdk/core';
import { AddressType, KeyRole } from '@cardano-sdk/key-management';
import {
  type AccountRewardAccountDetailsMap,
  type CardanoAccountAddressHistoryMap,
  type CardanoPaymentAddress,
  type CollateralOwnershipErrorCase,
  collateralOwnershipSets,
  collateralRefusalMessage,
  collateralRefusalCase,
  isCardanoAccount,
  isCardanoAddress,
  resolveSignDataContext,
  UnknownSignWithError,
} from '@lace-contract/cardano-context';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import {
  type AccountId,
  type AnyAccount,
  type AnyWallet,
  isHardwareWallet,
  WalletType,
} from '@lace-contract/wallet-repo';
import { deriveBip32PublicKey, hashEd25519PublicKey } from '@lace-lib/core';
import { senderOrigin } from '@lace-lib/dapp-connector';
import { mapHwSigningError } from '@lace-lib/util-hw';
import { firstValueFrom } from 'rxjs';

import {
  APIError,
  APIErrorCode,
  DataSignError,
  DataSignErrorCode,
  PaginateError,
  TxSendError,
  TxSendErrorCode,
  TxSignError,
  TxSignErrorCode,
} from '../../api-error';
import { supportedCip30Extensions } from '../../cip30-extensions';
import { addrToSignWith, transformToGroupedAddresses } from '../util';
import { requiresForeignSignaturesFromCbor } from '../utils/input-resolver';

import type { ChainedTxOutputCache } from '../chained-tx-output-cache';
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
import type * as Crypto from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type {
  AccountUtxoMap,
  CardanoAddressData,
  CardanoProvider,
  CardanoSignerContext,
  RewardAccountDetails,
} from '@lace-contract/cardano-context';
import type { SignerFactory } from '@lace-contract/signer';
import type { HwSigningErrorTranslationKeys } from '@lace-lib/util-hw';
import type { Observable, Subject } from 'rxjs';
import type { Logger } from 'ts-log';

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
 * Reported when the dApp's port dropped before the confirmation settled.
 *
 * Safe to retry, like a prompt the wallet could not show: every producer of
 * this outcome is gated on the user not having confirmed yet, so signing
 * cannot have started.
 */
const CONNECTION_LOST_INFO =
  'The dApp connection was lost before the request was approved, so nothing ' +
  'was signed. Please try again.';

/**
 * Reported when the wallet could not show its confirmation prompt.
 *
 * Safe to retry: the user was never asked, so nothing can have been signed.
 */
const PROMPT_UNAVAILABLE_INFO =
  'The wallet could not display its confirmation prompt, so the request was ' +
  'not approved. Please try again.';

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
      APIErrorCode.AccountChange,
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

  return deriveBip32PublicKey(
    account.blockchainSpecific.extendedAccountPublicKey,
    role,
    0,
  );
};

/**
 * Dependencies required to construct a CardanoDappConnectorApi instance.
 */
export interface CardanoDappConnectorApiDependencies {
  accountUtxos$: Observable<AccountUtxoMap>;
  /**
   * Ownership authority for the collateral-return guard: the signing
   * account's FULL SETTLED UTxO set (e.g.
   * `selectAccountUtxos$`-family), INCLUDING collateral-reserved/unspendable
   * UTxOs -- distinct from `accountUtxos$` above, which is wired to the
   * available/spendable view for its existing (unrelated) consumers and
   * must stay that way. Additive; unioned in `#validateCanSign` with the
   * chained-tx-output-cache's own outputs via `resolveChainedInputs`.
   */
  ownershipUtxos$: Observable<AccountUtxoMap>;
  accountUnspendableUtxos$: Observable<AccountUtxoMap>;
  rewardAccountDetails$: Observable<AccountRewardAccountDetailsMap>;
  addresses$: Observable<AnyAddress[]>;
  allAccounts$: Observable<AnyAccount[]>;
  /** All wallets - needed for accessing encrypted root private key for signing */
  allWallets$: Observable<AnyWallet[]>;
  chainId$: Observable<Cardano.ChainId | undefined>;
  /** Provider for resolving inputs absent from the local UTXO set */
  /** Per-account address transaction history; used to classify addresses as used/unused */
  accountTransactionHistory$: Observable<CardanoAccountAddressHistoryMap>;
  /**
   * Function to get account ID for a specific dApp origin.
   * Enables per-dApp account isolation - each dApp uses its own selected account.
   */
  getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  /**
   * Resolves tx inputs spending outputs of recently signed/submitted txs that
   * the confirmed UTxO set cannot see yet (chained txs).
   */
  resolveChainedInputs: ChainedTxOutputCache['resolveChainedInputs'];
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
  /** Logger for dApp-request diagnostics; silent when omitted */
  logger?: Logger;
  /**
   * On-demand stake-key registration lookup for a cold cache: the tracked
   * rewardAccountDetails$ lags the indexer and is empty on a fresh service
   * worker, and answering CIP-95's registered/unregistered buckets wrongly
   * makes dApps build txs with duplicate (or missing) registration certs.
   */
  cardanoProvider?: Pick<CardanoProvider, 'getRewardAccountInfo'>;
}

export type SigningResult =
  | { type: 'cancelled' }
  | { type: 'error'; hwErrorKeys?: HwSigningErrorTranslationKeys }
  | { type: 'success' };

/**
 * Block-path observability: one greppable anchor, and a `stage` on the
 * payload so the states stay machine-distinguishable without depending on
 * four separate sentences surviving copy-editing.
 */
export const COLLATERAL_BLOCK_LOG =
  '[dapp-connector-cardano] collateral-ownership block';

/**
 * Where a blocked request got to. `refused` always happens; the others say
 * whether the user was actually told. A blocked request with no
 * `screen-presented` was refused WITHOUT the user ever seeing why, which is
 * what a dApp parking the consent slot achieves.
 */
export type CollateralBlockStage =
  | 'disclosure-failed'
  | 'disclosure-requested'
  | 'refused'
  | 'screen-presented';

/**
 * Applies CIP-30 pagination: a page starting beyond the available items is
 * out of range and must reject with PaginateError { maxSize } rather than
 * answer an empty page the dApp cannot distinguish from real data.
 */
const paginateItems = <T>(items: T[], paginate?: Paginate): T[] => {
  if (!paginate) return items;
  const start = paginate.page * paginate.limit;
  if (start > 0 && start >= items.length) {
    throw new PaginateError(items.length);
  }
  return items.slice(start, start + paginate.limit);
};

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
 * Whether the account's signer threads witness native scripts into signature
 * detection. This pre-sign gate only runs on the extension flow (mobile routes
 * signTx to its own side effect), where every signer except Ledger does.
 * A missing wallet falls back to the stricter gate.
 */
const signerWitnessesScriptKeys = (wallet: AnyWallet | undefined): boolean =>
  wallet !== undefined && wallet.type !== WalletType.HardwareLedger;

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
  readonly #ownershipUtxos$: Observable<AccountUtxoMap>;
  readonly #accountUnspendableUtxos$: Observable<AccountUtxoMap>;
  readonly #rewardAccountDetails$: Observable<AccountRewardAccountDetailsMap>;
  readonly #addresses$: Observable<AnyAddress[]>;
  readonly #allAccounts$: Observable<AnyAccount[]>;
  readonly #allWallets$: Observable<AnyWallet[]>;
  readonly #chainId$: Observable<Cardano.ChainId | undefined>;
  readonly #accountTransactionHistory$: Observable<CardanoAccountAddressHistoryMap>;
  readonly #getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  readonly #resolveChainedInputs: ChainedTxOutputCache['resolveChainedInputs'];
  readonly #userConfirmationRequest?: CardanoConfirmationCallback;
  readonly #signTransaction?: SignTransactionFunction;
  readonly #submitTransaction: SubmitTransactionFunction;
  readonly #deriveNextUnusedAddress?: DeriveNextUnusedAddressFunction;
  readonly #signerFactory?: SignerFactory;
  readonly #accessAuthSecret?: AccessAuthSecret;
  readonly #authenticate?: Authenticate;
  readonly #signingResult$?: Subject<SigningResult>;
  readonly #logger?: Logger;
  readonly #cardanoProvider?: Pick<CardanoProvider, 'getRewardAccountInfo'>;

  public constructor({
    accountUtxos$,
    ownershipUtxos$,
    accountUnspendableUtxos$,
    rewardAccountDetails$,
    addresses$,
    chainId$,
    allAccounts$,
    allWallets$,
    accountTransactionHistory$,
    getAccountIdForOrigin,
    resolveChainedInputs,
    userConfirmationRequest,
    signTransaction,
    submitTransaction,
    deriveNextUnusedAddress,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$,
    logger,
    cardanoProvider,
  }: CardanoDappConnectorApiDependencies) {
    this.#accountUtxos$ = accountUtxos$;
    this.#ownershipUtxos$ = ownershipUtxos$;
    this.#accountUnspendableUtxos$ = accountUnspendableUtxos$;
    this.#rewardAccountDetails$ = rewardAccountDetails$;
    this.#addresses$ = addresses$;
    this.#chainId$ = chainId$;
    this.#accountTransactionHistory$ = accountTransactionHistory$;
    this.#getAccountIdForOrigin = getAccountIdForOrigin;
    this.#resolveChainedInputs = resolveChainedInputs;
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
    this.#logger = logger;
    this.#cardanoProvider = cardanoProvider;

    this.cip95 = {
      getPubDRepKey: this.getPubDRepKey.bind(this),
      getRegisteredPubStakeKeys: this.getRegisteredPubStakeKeys.bind(this),
      getUnregisteredPubStakeKeys: this.getUnregisteredPubStakeKeys.bind(this),
      signData: this.signData.bind(this),
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

    filteredUtxos = paginateItems(filteredUtxos, paginate);

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

    const result = usedAddresses.map(addr =>
      serializeAddress(Cardano.PaymentAddress(addr.address)),
    );

    return paginateItems(result, paginate);
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
   * @throws TxSignError with UserDeclined code if user rejects
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

    const collateralRefusal = await this.#validateCanSign(
      tx,
      partialSign,
      origin,
    );

    if (collateralRefusal) {
      // The screen informs, it does not authorize: the throw below is
      // unconditional and must never await a consent outcome. Not awaiting is
      // also what keeps the consent slot held, so `exhaustMap` upstream drops
      // the follow-up signTx an attacker would use to repaint the screen away.
      this.#logger?.warn(COLLATERAL_BLOCK_LOG, {
        stage: 'refused' satisfies CollateralBlockStage,
        origin,
        case: collateralRefusal,
        partialSign,
      });
      this.#presentCollateralRefusal({
        requestConfirmation: this.#userConfirmationRequest,
        sender,
        txHex: tx,
        partialSign,
        collateralRefusal,
        origin,
      });
      throw new TxSignError(
        TxSignErrorCode.ProofGeneration,
        collateralRefusalMessage(collateralRefusal),
      );
    }

    const { outcome } = await this.#userConfirmationRequest(sender, 'signTx', {
      txHex: tx,
      partialSign,
    });

    if (outcome === 'disconnected') {
      // Defensive: the dApp usually already has the injected-side connection
      // error, since this throw goes back over a likely-dead port.
      throw new APIError(APIErrorCode.InternalError, CONNECTION_LOST_INFO);
    }

    if (outcome === 'unavailable') {
      throw new APIError(APIErrorCode.InternalError, PROMPT_UNAVAILABLE_INFO);
    }

    if (outcome !== 'confirmed') {
      // Fail closed: an outcome added later must never fall through to signing.
      throw new TxSignError(
        TxSignErrorCode.UserDeclined,
        'User rejected transaction',
      );
    }

    try {
      return await this.#signTransaction(tx, partialSign, origin);
    } catch (error) {
      if (error instanceof AuthenticationCancelledError) {
        throw new TxSignError(
          TxSignErrorCode.UserDeclined,
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
   * @throws DataSignError with UserDeclined code if user rejects
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

    const origin = this.#extractOrigin({ sender });
    this.#logger?.debug(
      `[cip30] signData request from ${origin}: addr=${addr}, payload ${
        payload.length / 2
      } bytes`,
    );
    const gateAccountId = this.#getAccountId(origin);
    await this.validateCanSignData(addr, origin);

    const { outcome } = await this.#userConfirmationRequest(
      sender,
      'signData',
      {
        address: addr,
        payload,
      },
    );

    if (outcome === 'disconnected') {
      // Defensive: the dApp usually already has the injected-side connection
      // error, since this throw goes back over a likely-dead port.
      throw new APIError(APIErrorCode.InternalError, CONNECTION_LOST_INFO);
    }

    if (outcome === 'unavailable') {
      throw new APIError(APIErrorCode.InternalError, PROMPT_UNAVAILABLE_INFO);
    }

    if (outcome !== 'confirmed') {
      // Fail closed: an outcome added later must never fall through to signing.
      throw new DataSignError(
        DataSignErrorCode.UserDeclined,
        'User rejected data signing',
      );
    }

    // From here on the user has confirmed, so a flow is waiting on
    // signingResult$. Every exit must report one: if nothing arrives that flow
    // never completes, wedging every request serialized behind it. The checks
    // below all throw before the signing try/catch that used to be the only
    // reporting path.
    let hasReportedResult = false;
    const reportResult = (result: SigningResult) => {
      hasReportedResult = true;
      this.#signingResult$?.next(result);
    };
    try {
      const accountId = this.#getAccountId(origin);
      // The gate classified against gate-time state; a session rebind while the
      // prompt was open must answer AccountChange, not a misleading
      // ProofGeneration from the stale classification.
      if (accountId !== gateAccountId) {
        throw new APIError(
          APIErrorCode.AccountChange,
          `Session account changed while awaiting confirmation for origin: ${origin}. Please reconnect the dApp.`,
        );
      }

      const allAccounts = await firstValueFrom(this.#allAccounts$);
      const account = allAccounts.find(a => a.accountId === accountId);

      if (!account) {
        throw new APIError(
          APIErrorCode.AccountChange,
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
      const knownAddresses =
        this.#transformToGroupedAddresses(cardanoAddresses);

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
      try {
        const dataSigner = this.#signerFactory.createDataSigner(signerContext);
        const result = (await firstValueFrom(
          dataSigner.signData({
            signWith: addrToSignWith(addr),
            payload,
          }),
        )) as DataSignature;
        reportResult({ type: 'success' });
        return result;
      } catch (error) {
        if (error instanceof AuthenticationCancelledError) {
          reportResult({ type: 'cancelled' });
          throw new DataSignError(
            DataSignErrorCode.UserDeclined,
            'User cancelled authentication',
          );
        }
        const hwErrorKeys = isHardwareWallet(wallet)
          ? mapHwSigningError(error)
          : undefined;
        reportResult({ type: 'error', hwErrorKeys });
        this.#logger?.warn(
          `[cip30] signData failed for ${origin}: ${
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error)
          }`,
        );
        if (error instanceof UnknownSignWithError) {
          throw new DataSignError(
            DataSignErrorCode.ProofGeneration,
            error.message,
          );
        }
        throw error;
      }
    } catch (postConsentError) {
      if (!hasReportedResult) reportResult({ type: 'error' });
      throw postConsentError;
    }
  }

  /**
   * Pre-consent gate for signData, mirroring #validateCanSign: a request this
   * account can never satisfy is refused before the signing dialog opens and
   * before the user is asked for credentials. Local-only — no network access.
   *
   * @throws DataSignError AddressNotPK for an unparseable signer identifier,
   *   ProofGeneration for a signer this account holds no key for (foreign or
   *   script DRep, unknown address, MultiSig account, Trezor device).
   */
  public async validateCanSignData(
    addr: string,
    origin: string,
  ): Promise<void> {
    const accountId = this.#getAccountId(origin);
    const allAccounts = await firstValueFrom(this.#allAccounts$);
    const account = allAccounts.find(a => a.accountId === accountId);

    if (!account) {
      throw new APIError(
        APIErrorCode.AccountChange,
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
      throw new DataSignError(
        DataSignErrorCode.ProofGeneration,
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
    if (wallet.type === WalletType.HardwareTrezor) {
      throw new DataSignError(
        DataSignErrorCode.ProofGeneration,
        'CIP-8 data signing is not supported on Trezor devices',
      );
    }

    const signWith = addrToSignWith(addr);
    const cardanoAddresses = await this.#getCardanoAddresses(origin);
    const knownAddresses = this.#transformToGroupedAddresses(cardanoAddresses);

    const { extendedAccountPublicKey } = account.blockchainSpecific as {
      extendedAccountPublicKey: Crypto.Bip32PublicKeyHex;
    };
    // Underivable key ⇒ no DRep key to match ⇒ the resolver refuses below.
    let dRepKeyHash;
    try {
      dRepKeyHash = hashEd25519PublicKey(
        await deriveBip32PublicKey(extendedAccountPublicKey, KeyRole.DRep, 0),
      );
    } catch {}

    try {
      const { derivationPath, isDRepSigning } = resolveSignDataContext({
        signWith,
        knownAddresses,
        dRepKeyHash,
      });
      this.#logger?.debug(
        `[cip30] signData signer resolved for ${origin}: role ${derivationPath.role}, index ${derivationPath.index}, isDRepSigning=${isDRepSigning}`,
      );
    } catch (error) {
      if (error instanceof UnknownSignWithError) {
        this.#logger?.warn(
          `[cip30] signData refused for ${origin}: ${error.message}; replying DataSignError ProofGeneration (1)`,
        );
        throw new DataSignError(
          DataSignErrorCode.ProofGeneration,
          error.message,
        );
      }
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
   * @throws TxSendError with Failure code when the network rejects the tx
   */
  public async submitTx(tx: Cbor): Promise<string> {
    try {
      return await this.#submitTransaction(tx);
    } catch (error) {
      if (error instanceof APIError || error instanceof TxSendError) {
        throw error;
      }
      throw new TxSendError(
        TxSendErrorCode.Failure,
        error instanceof Error ? error.message : String(error),
      );
    }
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
    return supportedCip30Extensions();
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
    if (!(await this.#isStakeKeyRegisteredFor(origin, accountId))) {
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
    if (await this.#isStakeKeyRegisteredFor(origin, accountId)) {
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
   * The collateral-return verdict alone, for a surface that presents its own
   * consent (mobile): the same local, best-effort evaluation `signTx` runs
   * before consent, without the foreign-signature half, so nothing else moves
   * pre-sheet. Throws the same typed errors as that half.
   */
  public async getCollateralRefusal(
    txHex: Cbor,
    origin: string,
  ): Promise<CollateralOwnershipErrorCase | null> {
    return (await this.#collateralVerdict(txHex, origin)).collateralRefusal;
  }

  /**
   * Cache-first stake-key registration status. The tracked cache answers
   * instantly when warm; a cold cache (fresh service worker, indexer lag)
   * falls back to one direct provider query so the CIP-95 buckets answer
   * from chain state rather than a hard error or a wrong "unregistered".
   */
  async #isStakeKeyRegisteredFor(
    origin: string,
    accountId: AccountId,
  ): Promise<boolean> {
    const rewardAccountDetails = await firstValueFrom(
      this.#rewardAccountDetails$,
    );
    const details = rewardAccountDetails[accountId];
    if (details) {
      return isStakeKeyRegistered(details) ?? false;
    }

    const notReady = (reason: string) =>
      new APIError(
        APIErrorCode.InternalError,
        `Reward account details not found for account ID: ${accountId} (${reason})`,
      );
    if (!this.#cardanoProvider) {
      throw notReady('no provider available for an on-demand lookup');
    }
    const chainId = await firstValueFrom(this.#chainId$);
    if (!chainId) {
      throw notReady('no active chain');
    }
    const addresses = await this.#getCardanoAddresses(origin);
    const rewardAccount = addresses.find(addr => addr.data?.rewardAccount)?.data
      ?.rewardAccount;
    if (!rewardAccount) {
      throw notReady('wallet addresses not ready');
    }

    this.#logger?.debug(
      `[cip30] stake-key registration cache cold for ${accountId}; querying provider`,
    );
    const result = await firstValueFrom(
      this.#cardanoProvider.getRewardAccountInfo(
        { rewardAccount: rewardAccount },
        { chainId },
      ),
    );
    if (result.isErr()) {
      throw notReady(`provider lookup failed: ${result.error.message}`);
    }
    return result.value.isRegistered;
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
      this.#logger?.warn(
        `[cip30] no session account for origin ${origin}; replying AccountChange (-4)`,
      );
      throw new APIError(
        APIErrorCode.AccountChange,
        `No account found for origin: ${origin}. Please reconnect the dApp.`,
      );
    }
    return accountId;
  }

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

  /**
   * Opens the dApp consent surface in the REFUSED state.
   *
   * Never awaited and never allowed to throw: the CIP-30 rejection must not
   * depend on the surface. Both branches log at WARN, and a failure is worded
   * differently from a successful request -- a dApp can suppress this screen
   * by parking the consent slot, and the log pair is the only trace left.
   *
   * Takes the consent channel as a parameter rather than reading the field,
   * because the caller has already proved it exists.
   */
  #presentCollateralRefusal({
    requestConfirmation,
    sender,
    txHex,
    partialSign,
    collateralRefusal,
    origin,
  }: {
    requestConfirmation: CardanoConfirmationCallback;
    sender: SenderContext['sender'];
    txHex: Cbor;
    partialSign: boolean;
    collateralRefusal: CollateralOwnershipErrorCase;
    origin: string;
  }): void {
    const context = { origin, case: collateralRefusal, partialSign };
    try {
      const disclosure = requestConfirmation(sender, 'signTx', {
        txHex,
        partialSign,
        collateralRefusal,
      });
      // "Requested", never "shown": whether a screen appears is decided
      // downstream (see `refusedSignTx$`, which logs when it does).
      this.#logger?.warn(COLLATERAL_BLOCK_LOG, {
        ...context,
        stage: 'disclosure-requested' satisfies CollateralBlockStage,
      });
      void disclosure.catch((error: unknown) => {
        this.#logger?.warn(COLLATERAL_BLOCK_LOG, {
          ...context,
          stage: 'disclosure-failed' satisfies CollateralBlockStage,
          error,
        });
      });
    } catch (error) {
      this.#logger?.warn(COLLATERAL_BLOCK_LOG, {
        ...context,
        stage: 'disclosure-failed' satisfies CollateralBlockStage,
        error,
      });
    }
  }

  /**
   * Local-only pre-consent check: runs the foreign-signature gate without an
   * input resolver so no network request happens before the user approves.
   * Unknown inputs are optimistically exempted when an own-satisfiable
   * witness script exists; the resolver-backed gate re-runs post-consent in
   * the signTransaction wrapper and stays authoritative.
   *
   * Throws for every pre-existing refusal (account change, missing chain id,
   * unknown account, foreign signatures) and RETURNS the collateral refusal,
   * so `signTx` can open the consent surface in the refused state before
   * rejecting. `null` means the collateral rule allowed the transaction.
   */
  async #validateCanSign(
    txCbor: Cbor,
    partialSign: boolean,
    origin: string,
  ): Promise<CollateralOwnershipErrorCase | null> {
    const {
      collateralRefusal,
      account,
      wallet,
      knownAddresses,
      resolutionUtxos,
    } = await this.#collateralVerdict(txCbor, origin);
    if (collateralRefusal) {
      return collateralRefusal;
    }

    const { extendedAccountPublicKey } = account.blockchainSpecific as {
      extendedAccountPublicKey: Crypto.Bip32PublicKeyHex;
    };

    const dRepKeyHash = hashEd25519PublicKey(
      await deriveBip32PublicKey(extendedAccountPublicKey, KeyRole.DRep, 0),
    );

    if (!partialSign) {
      if (
        await requiresForeignSignaturesFromCbor(
          txCbor,
          resolutionUtxos,
          knownAddresses,
          undefined,
          signerWitnessesScriptKeys(wallet),
          dRepKeyHash,
        )
      ) {
        throw new TxSignError(
          TxSignErrorCode.ProofGeneration,
          'The wallet does not have the secret key associated with some of the inputs or certificates.',
        );
      }
    }

    return null;
  }

  /**
   * The collateral half of the pre-consent check, computed once: the verdict
   * plus the prelude the foreign-signature half consumes, so `#validateCanSign`
   * never reads the store or decodes the transaction twice.
   */
  async #collateralVerdict(txCbor: Cbor, origin: string) {
    const accountId = this.#getAccountIdForOrigin(origin);
    if (!accountId) {
      throw new APIError(
        APIErrorCode.AccountChange,
        `No account found for origin: ${origin}. Please reconnect the dApp.`,
      );
    }

    const [
      chainId,
      allAccounts,
      allWallets,
      allAddresses,
      accountUtxos,
      ownershipAccountUtxos,
    ] = await Promise.all([
      firstValueFrom(this.#chainId$),
      firstValueFrom(this.#allAccounts$),
      firstValueFrom(this.#allWallets$),
      firstValueFrom(this.#addresses$),
      firstValueFrom(this.#accountUtxos$),
      firstValueFrom(this.#ownershipUtxos$),
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
    const chainedOwnUtxos = this.#resolveChainedInputs(
      txCbor,
      new Set<string>(knownAddresses.map(({ address }) => address)),
    );
    const localUtxos = accountUtxos[accountId] ?? [];
    const resolutionUtxos = [...localUtxos, ...chainedOwnUtxos];

    // Runs for BOTH partialSign values, BEFORE the review sheet/password
    // prompt, and local-only: `ownershipUtxos$` -- the full settled set plus
    // own pending outputs, NOT the `accountUtxos$` above, which subtracts the
    // collateral-reserved UTxOs this rule exists to catch. A collateral input
    // this set lacks reads as foreign HERE, so the refusal screen is
    // best-effort; the resolver-backed guard at the signing boundary
    // (`withCollateralOwnershipGuard`) re-runs the rule and stays authoritative.
    const collateralRefusal = collateralRefusalCase(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)).toCore()
        .body,
      collateralOwnershipSets({
        ownershipUtxos: [
          ...(ownershipAccountUtxos[accountId] ?? []),
          ...chainedOwnUtxos,
        ],
        knownAddresses,
      }),
    );
    const wallet = allWallets.find(w => w.walletId === account.walletId);

    return {
      collateralRefusal,
      account,
      wallet,
      knownAddresses,
      resolutionUtxos,
    };
  }
}
