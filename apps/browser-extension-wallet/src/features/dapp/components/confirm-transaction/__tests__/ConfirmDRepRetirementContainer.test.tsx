/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */

const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmDRepRetirement = jest.fn();
const mockDappError = jest.fn();
const mockDisallowSignTx = jest.fn();
const mockUseGetOwnPubDRepKeyHash = jest.fn();
const flowContextMock = jest.fn();

import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmDRepRetirementContainer } from '../ConfirmDRepRetirementContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import { depositPaidWithSymbol, drepIDasBech32FromHash } from '../utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';

const { Cardano, Crypto } = Wallet;

const assetInfo$ = new BehaviorSubject(new Map());
const available$ = new BehaviorSubject([]);

const hash = Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'));
const getPubDRepKey = async () => await hash;

const inMemoryWallet = {
  getPubDRepKey,
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

const dappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};
const certificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.UnregisterDelegateRepresentative,
  dRepCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash
  },
  deposit: BigInt('1000')
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
  useViewsFlowContext: flowContextMock
}));

jest.mock('../hooks.ts', () => {
  const original = jest.requireActual('../hooks.ts');
  return {
    __esModule: true,
    ...original,
    useGetOwnPubDRepKeyHash: mockUseGetOwnPubDRepKeyHash
  };
});

jest.mock('../utils.ts', () => {
  const original = jest.requireActual('../utils.ts');
  return {
    __esModule: true,
    ...original,
    disallowSignTx: mockDisallowSignTx
  };
});

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    ConfirmDRepRetirement: mockConfirmDRepRetirement
  };
});

jest.mock('../../DappError', () => {
  const original = jest.requireActual('../../DappError');
  return {
    __esModule: true,
    ...original,
    DappError: mockDappError
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

describe('Testing ConfirmDRepRetirementContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseGetOwnPubDRepKeyHash.mockReset();
    mockUseGetOwnPubDRepKeyHash.mockImplementation(() => ({
      loading: false,
      ownPubDRepKeyHash: hash
    }));
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      walletUI: { cardanoCoin: cardanoCoinMock },
      walletInfo: {}
    }));
    flowContextMock.mockReset();
    flowContextMock.mockImplementation(() => ({
      signTxRequest: { request },
      dappInfo
    }));

    mockConfirmDRepRetirement.mockReset();
    mockConfirmDRepRetirement.mockReturnValue(<span data-testid="ConfirmDRepRetirementContainer" />);
    mockDappError.mockReset();
    mockDappError.mockReturnValue(<span data-testid="DappError" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
  });

  afterEach(() => {
    cleanup();
  });

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const onErrorMock = jest.fn();
  const props = { onError: onErrorMock };

  test('should render ConfirmDRepRetirementContainer component with proper props', async () => {
    let queryByTestId: any;
    await act(async () => {
      ({ queryByTestId } = render(<ConfirmDRepRetirementContainer tx={tx} {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmDRepRetirementContainer')).toBeInTheDocument();
    expect(mockConfirmDRepRetirement).toHaveBeenLastCalledWith(
      {
        dappInfo,
        metadata: {
          depositReturned: depositPaidWithSymbol(certificate.deposit, cardanoCoinMock as Wallet.CoinId),
          drepId: drepIDasBech32FromHash(certificate.dRepCredential.hash)
        },
        translations: {
          metadata: t('core.DRepRetirement.metadata'),
          labels: {
            depositReturned: t('core.DRepRetirement.depositReturned'),
            drepId: t('core.DRepRetirement.drepId')
          }
        }
      },
      {}
    );
  });

  test('should render ConfirmDRepRetirementContainer component with proper error for own retirement', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmDRepRetirementContainer tx={tx} {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmDRepRetirementContainer')).toBeInTheDocument();
  });

  test('should render ConfirmDRepRetirementContainer component with proper error for not own retirement', async () => {
    mockUseGetOwnPubDRepKeyHash.mockReset();
    mockUseGetOwnPubDRepKeyHash.mockImplementation(() => ({
      loading: false,
      ownPubDRepKeyHash: Crypto.Hash28ByteBase16(Buffer.from('WRONG_dRepCredentialHashdRep').toString('hex'))
    }));
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmDRepRetirementContainer tx={tx} {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappError')).toBeInTheDocument();
    expect(onErrorMock).toBeCalledTimes(1);
    expect(mockDisallowSignTx).toBeCalledTimes(1);
    expect(mockDisallowSignTx).toBeCalledWith(request, true);
  });
});
