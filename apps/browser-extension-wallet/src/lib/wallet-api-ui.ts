import {
  SigningCoordinator,
  WalletConflictError,
  WalletRepositoryApi,
  consumeRemoteApi,
  createKeyAgentFactory,
  exposeSigningCoordinatorApi,
  observableWalletProperties,
  repositoryChannel,
  walletChannel,
  walletManagerChannel,
  walletManagerProperties,
  walletRepositoryProperties,
  WalletType
} from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { firstValueFrom, from, of, Subject } from 'rxjs';
import { mergeMap, map, tap, finalize, takeUntil } from 'rxjs/operators';
import { runtime } from 'webextension-polyfill';

export const logger = console;

export const walletManager = consumeRemoteApi(
  { baseChannel: walletManagerChannel(process.env.WALLET_NAME), properties: walletManagerProperties },
  { logger, runtime }
);

const walletErrors = [
  Wallet.KeyManagement.errors.AuthenticationError,
  Wallet.KeyManagement.errors.HwMappingError,
  Wallet.KeyManagement.errors.InvalidMnemonicError,
  Wallet.KeyManagement.errors.InvalidSerializableDataError,
  Wallet.KeyManagement.errors.ProofGenerationError,
  Wallet.KeyManagement.errors.TransportError,
  Wallet.InputSelectionError,
  Wallet.TxSubmissionError
];

export const observableWallet = consumeRemoteApi(
  {
    baseChannel: walletChannel(process.env.WALLET_NAME),
    properties: observableWalletProperties,
    errorTypes: walletErrors
  },
  { logger, runtime }
);

export const walletRepository = consumeRemoteApi<WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>>(
  {
    baseChannel: repositoryChannel(process.env.WALLET_NAME),
    properties: walletRepositoryProperties,
    errorTypes: [WalletConflictError]
  },
  { logger, runtime }
);

export const keyAgentFactory = createKeyAgentFactory({ bip32Ed25519: Wallet.bip32Ed25519, logger });

export const signingCoordinator = new SigningCoordinator<Wallet.WalletMetadata, Wallet.AccountMetadata>(
  { hwOptions: { manifest: Wallet.manifest, communicationType: Wallet.KeyManagement.CommunicationType.Web } },
  { keyAgentFactory, logger }
);
exposeSigningCoordinatorApi({ signingCoordinator }, { logger, runtime });

export const withSignTxConfirmation = async <T>(action: () => Promise<T>, password?: string): Promise<T> => {
  const subscription = signingCoordinator.transactionWitnessRequest$.subscribe(async (req) => {
    try {
      if (req.walletType === WalletType.InMemory) {
        if (typeof password !== 'string') {
          throw new TypeError('Invalid state: expected password for in-memory wallet');
        }
        const passphrase = Buffer.from(password, 'utf8');
        req.sign(passphrase);
      } else {
        req.sign();
      }
    } catch {
      // nothing to do here, the error
      // bubbles up when action rejects
    }
  });
  try {
    return await action();
  } finally {
    subscription.unsubscribe();
    password = '';
  }
};

/**
 * Securely erases a string by overwriting its contents in memory and returning an empty string.
 *
 * @param {string} s The string to be securely erased.
 * @returns {string} An empty string.
 *
 * @security
 * This function attempts to securely erase the contents of the string from memory:
 * - It converts the string to a Buffer, which allows direct manipulation of the underlying memory.
 * - The Buffer is then filled with zeros, overwriting the original content.
 * - An empty string is returned to replace the original string variable.
 */
const securelyEraseString = (s: string): string => {
  const buffer = Buffer.from(s, 'utf8');
  buffer.fill(0);
  return '';
};

/**
 * Creates a Buffer containing the UTF-8 encoded representation of the provided password.
 *
 * @param {string} password The password to be encoded.
 * @returns {Buffer} A Buffer containing the UTF-8 encoded password.
 */
const createPassphrase = (password: string): Buffer => Buffer.from(password, 'utf8');

/**
 * Handles the process of signing data with confirmation, supporting both in-memory and hardware wallets.
 * This function manages the signing request, password handling (for in-memory wallets), and secure password erasure.
 *
 * @template T The type of the value returned by the action.
 * @param {() => Promise<T>} action A function that performs the action requiring data signing.
 * @param {string} password The password string for in-memory wallets.
 * @returns {Promise<T>} A promise that resolves with the result of the action.
 *
 * @throws Will throw an error if the signing process or the action fails.

 * @security This function handles passwords securely:
 * - For in-memory wallets, it securely erases the password from memory after use.
 * - The password is never logged or stored in plain text.
 * - For hardware wallets, no password is required or handled.
 */
export const withSignDataConfirmation = async <T>(action: () => Promise<T>, password: string): Promise<T> => {
  const cleanup$ = new Subject<void>();
  let passwordToErase: string | undefined;
  const signData$ = signingCoordinator.signDataRequest$.pipe(
    mergeMap((req) =>
      req.walletType === WalletType.InMemory
        ? of(password).pipe(
            tap((pwd) => {
              passwordToErase = pwd;
            }),
            map(createPassphrase),
            mergeMap((passphrase) =>
              from(req.sign(passphrase)).pipe(
                finalize(() => {
                  passphrase.fill(0);
                })
              )
            )
          )
        : from(req.sign())
    ),
    takeUntil(cleanup$)
  );

  const performAction$ = from(action());

  try {
    await firstValueFrom(signData$);
    return await firstValueFrom(performAction$);
  } catch (error) {
    console.error('Error during signing process or action:', error);
    throw error;
  } finally {
    cleanup$.next();
    cleanup$.complete();
    if (passwordToErase) {
      passwordToErase = securelyEraseString(passwordToErase);
    }
  }
};

// These globals are used for e2e test setup/teardown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedWindow = window as any;
untypedWindow.walletRepository = walletRepository;
untypedWindow.walletManager = walletManager;
untypedWindow.firstValueFrom = firstValueFrom;
