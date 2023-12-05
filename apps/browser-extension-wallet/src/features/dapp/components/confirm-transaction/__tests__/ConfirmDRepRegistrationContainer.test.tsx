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
import BigNumber from 'bignumber.js';
import { getWrapper } from '../testing.utils';

const LOVELACE_VALUE = 1_000_000;
const DEFAULT_DECIMALS = 2;

const { Cardano, Crypto, HexBlob } = Wallet;

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
  symbol: 'cardanoCoinMockSymbol'
};

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
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

    const dappInfo = {
      name: 'dappName',
      logo: 'dappLogo',
      url: 'dappUrl'
    };
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
    const errorMessage = 'errorMessage';
    const props = { signTxData: { dappInfo, tx }, errorMessage };

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmDRepRegistrationContainer {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmDRepRegistration')).toBeInTheDocument();
    expect(mockConfirmDRepRegistration).toHaveBeenLastCalledWith(
      {
        dappInfo,
        metadata: {
          depositPaid: `${new BigNumber(certificate.deposit.toString())
            .dividedBy(LOVELACE_VALUE)
            .toFixed(DEFAULT_DECIMALS)} ${cardanoCoinMock.symbol}`,
          drepId: Cardano.DRepID(HexBlob.toTypedBech32('drep', Wallet.HexBlob(certificate.dRepCredential.hash))),
          hash: certificate.anchor?.dataHash,
          url: certificate.anchor?.url
        },
        translations: {
          metadata: t('core.DRepRegistration.metadata'),
          labels: {
            depositPaid: t('core.DRepRegistration.depositPaid'),
            drepId: t('core.DRepRegistration.drepId'),
            hash: t('core.DRepRegistration.hash'),
            url: t('core.DRepRegistration.url')
          }
        },
        errorMessage
      },
      {}
    );
  });
});
