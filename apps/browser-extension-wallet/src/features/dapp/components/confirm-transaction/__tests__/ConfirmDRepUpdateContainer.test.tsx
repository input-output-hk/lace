/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmDRepUpdate = jest.fn();
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmDRepUpdateContainer } from '../ConfirmDRepUpdateContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import { drepIDasBech32FromHash } from '../utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';

const { Cardano, Crypto } = Wallet;

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

const dappInfo: Wallet.DappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};

const certificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.UpdateDelegateRepresentative,
  dRepCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  },
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};
const tx = buildMockTx({
  certificates: [certificate]
});

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

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    ConfirmDRepUpdate: mockConfirmDRepUpdate
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

describe('Testing ConfirmDRepUpdateContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      walletUI: { cardanoCoin: cardanoCoinMock },
      walletInfo: {}
    }));
    mockConfirmDRepUpdate.mockReset();
    mockConfirmDRepUpdate.mockReturnValue(<span data-testid="ConfirmDRepUpdate" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('should render ConfirmDRepUpdate component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmDRepUpdateContainer tx={tx} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmDRepUpdate')).toBeInTheDocument();
    expect(mockConfirmDRepUpdate).toHaveBeenLastCalledWith(
      {
        dappInfo,
        metadata: {
          drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash),
          hash: certificate.anchor?.dataHash,
          url: certificate.anchor?.url
        },
        translations: {
          metadata: t('core.DRepUpdate.metadata'),
          labels: {
            drepId: t('core.DRepUpdate.drepId'),
            hash: t('core.DRepUpdate.hash'),
            url: t('core.DRepUpdate.url')
          }
        }
      },
      {}
    );
  });
});
