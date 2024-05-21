/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmDRepRegistration = jest.fn();
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmDRepRegistrationContainer } from '../ConfirmDRepRegistrationContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import { depositPaidWithSymbol } from '../utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';

const { Cardano, Crypto, util } = Wallet;

const assetInfo$ = new BehaviorSubject(new Map());
const available$ = new BehaviorSubject([]);

const inMemoryWallet = {
  assetInfo$,
  balance: {
    utxo: {
      available$
    }
  }
};

const cardanoCoinMock = {
  name: 'Cardano',
  symbol: 'cardanoCoinMockSymbol'
};

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

const certificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
  dRepCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  },
  deposit: BigInt('1000'),
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};
const tx = buildMockTx({
  certificates: [certificate]
});

const dappInfo: Wallet.DappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};

const request = {
  transaction: {
    toCore: jest.fn().mockReturnValue(tx)
  } as any
} as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useViewsFlowContext: () => ({
    signTxRequest: { request },
    dappInfo
  })
}));

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    ConfirmDRepRegistration: mockConfirmDRepRegistration
  };
});

jest.mock('react-i18next', () => {
  const original = jest.requireActual('react-i18next');
  return {
    __esModule: true,
    ...original,
    useTranslation: mockUseTranslation
  };
});

describe('Testing ConfirmDRepRegistrationContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      walletUI: { cardanoCoin: cardanoCoinMock },
      walletInfo: {}
    }));
    mockConfirmDRepRegistration.mockReset();
    mockConfirmDRepRegistration.mockReturnValue(<span data-testid="ConfirmDRepRegistration" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('should render ConfirmDRepRegistration component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmDRepRegistrationContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmDRepRegistration')).toBeInTheDocument();
    expect(mockConfirmDRepRegistration).toHaveBeenLastCalledWith(
      {
        metadata: {
          depositPaid: depositPaidWithSymbol(certificate.deposit, cardanoCoinMock as Wallet.CoinId),
          drepId: util.drepIDasBech32FromHash(certificate.dRepCredential.hash),
          hash: certificate.anchor?.dataHash,
          url: certificate.anchor?.url
        }
      },
      {}
    );
  });
});
