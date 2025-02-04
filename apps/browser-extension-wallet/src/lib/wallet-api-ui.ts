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
import { firstValueFrom, from, of } from 'rxjs';
import { mergeMap, map, finalize } from 'rxjs/operators';
import { runtime } from 'webextension-polyfill';
import { Password } from '@input-output-hk/lace-ui-toolkit';
import { logger } from '@lace/common';

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

export const keyAgentFactory = createKeyAgentFactory({ getBip32Ed25519: Wallet.getBip32Ed25519, logger });

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
        await req.sign(passphrase).finally(() => passphrase.fill(0));
      } else {
        await req.sign();
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
 * Creates a Buffer containing the UTF-8 encoded representation of the provided password.
 *
 * @param {Partial<Password>} password The password object to be encoded.
 * @returns {Buffer} A Buffer containing the UTF-8 encoded password.
 */
export const createPassphrase = (password: Partial<Password>): Buffer => Buffer.from(password.value || '', 'utf8');

/**
 * Handles the process of signing data with confirmation, supporting both in-memory and hardware wallets.
 * This function manages the signing request, password handling (for in-memory wallets), and secure password erasure.
 *
 * @template T The type of the value returned by the action.
 * @param {() => Promise<T>} action A function that performs the action requiring data signing.
 * @param {Partial<Password>} password The password object for in-memory wallets.
 * @param {() => void} clearSecrets Function to clear secrets after use.
 * @returns {Promise<T>} A promise that resolves with the result of the action.
 *
 * @throws Will throw an error if the signing process or the action fails.
 *
 * @security This function handles passwords securely:
 * - For in-memory wallets, it uses clearSecrets to securely erase the password after use.
 * - The password is never logged or stored in plain text.
 * - For hardware wallets, no password is required or handled.
 */
export const withSignDataConfirmation = async <T>(
  action: () => Promise<T>,
  password: Partial<Password>,
  clearSecrets: () => void
): Promise<T> => {
  const subscription = signingCoordinator.signDataRequest$
    .pipe(
      mergeMap((req) =>
        req.walletType === WalletType.InMemory
          ? of(password).pipe(
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
      )
    )
    .subscribe();

  try {
    return await action();
  } finally {
    subscription.unsubscribe();
    clearSecrets();
  }
};

// These globals are used for e2e test setup/teardown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedWindow = window as any;
untypedWindow.walletRepository = walletRepository;
untypedWindow.walletManager = walletManager;
untypedWindow.firstValueFrom = firstValueFrom;
