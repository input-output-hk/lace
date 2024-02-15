import {
  SigningCoordinator,
  WalletRepositoryApi,
  WalletType,
  consumeRemoteApi,
  createKeyAgentFactory,
  exposeSigningCoordinatorApi,
  observableWalletProperties,
  repositoryChannel,
  walletChannel,
  walletManagerChannel,
  walletManagerProperties,
  walletRepositoryProperties
} from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { firstValueFrom } from 'rxjs';
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
  { baseChannel: repositoryChannel(process.env.WALLET_NAME), properties: walletRepositoryProperties },
  { logger, runtime }
);

export const signingCoordinator = new SigningCoordinator<Wallet.WalletMetadata, Wallet.AccountMetadata>(
  { hwOptions: { manifest: Wallet.manifest, communicationType: Wallet.KeyManagement.CommunicationType.Web } },
  { keyAgentFactory: createKeyAgentFactory({ bip32Ed25519: Wallet.bip32Ed25519, logger }) }
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

// These globals are used for e2e test setup/teardown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedWindow = window as any;
untypedWindow.walletRepository = walletRepository;
untypedWindow.walletManager = walletManager;
untypedWindow.firstValueFrom = firstValueFrom;
