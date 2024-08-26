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
import { firstValueFrom, from, Observable, of, Subject } from 'rxjs';
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

const securelyEraseString = (s: string): string => {
  const buffer = Buffer.from(s, 'utf8');
  buffer.fill(0);
  return '';
};

const createPassphrase = (password: string): Buffer => Buffer.from(password, 'utf8');

const getPassword = (passwordOrGetter: string | (() => Promise<string>)): Observable<string> =>
  typeof passwordOrGetter === 'function' ? from(passwordOrGetter()) : of(passwordOrGetter);

// Main function
export const withSignDataConfirmation = async <T>(
  action: () => Promise<T>,
  passwordOrGetter: string | (() => Promise<string>)
): Promise<T> => {
  const cleanup$ = new Subject<void>();
  let passwordToErase: string | undefined;

  // This is our "do notation" equivalent
  const signData$ = signingCoordinator.signDataRequest$.pipe(
    mergeMap((req) =>
      req.walletType === WalletType.InMemory
        ? getPassword(passwordOrGetter).pipe(
            tap((password) => {
              passwordToErase = password;
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
    // This is similar to Haskell's <- operator
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
