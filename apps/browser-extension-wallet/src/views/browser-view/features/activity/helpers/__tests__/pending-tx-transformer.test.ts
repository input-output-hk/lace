/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
const mockLovelacesToAdaString = jest.fn();
let actualLovelacesToAdaString: any;
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable import/imports-first */
/* eslint-disable max-len */
/* eslint-disable no-magic-numbers */
import { pendingTxTransformer } from '../pending-tx-transformer';
import { Wallet } from '@lace/cardano';
import { cardanoCoin } from '@utils/constants';
import { Serialization } from '@cardano-sdk/core';
import { DEFAULT_TIME_FORMAT, formatTime } from '@src/utils/format-date';
import BigNumber from 'bignumber.js';
import { getFormattedFiatAmount } from '../common-tx-transformer';
import { CurrencyInfo } from '@src/types';
import { currencyCode } from '@providers/currency/constants';

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  actualLovelacesToAdaString = actual.Wallet.util.lovelacesToAdaString;
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      util: {
        ...actual.Wallet.util,
        lovelacesToAdaString: mockLovelacesToAdaString
      }
    }
  };
});

describe('Testing tx transformers utils', () => {
  describe('Testing pendingTxTransformer function', () => {
    const sendingAddress = Wallet.Cardano.PaymentAddress(
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
    );
    const pendingTx: Wallet.Cardano.Tx = {
      id: Wallet.Cardano.TransactionId('6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad'),
      body: {
        inputs: [
          {
            txId: Wallet.Cardano.TransactionId('4123d70f66414cc921f6ffc29a899aafc7137a99a0fd453d6b200863ef5702d6'),
            index: 1,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore "address" property is actually present at runtime and it's crucial for the current transformer
            // logic to work propely and "know" whether inputs belong to the wallet or not
            // see LW-8767 ticket that is requesting the SDK type to be fixed
            address: sendingAddress
          }
        ],
        outputs: [
          {
            address: Wallet.Cardano.PaymentAddress(
              'addr_test1qz7xvvc30qghk00sfpzcfhsw3s2nyn7my0r8hq8c2jj47zsxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flkns6sjg2v'
            ),
            value: {
              assets: new Map([
                [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('100')]
              ]) as Wallet.Cardano.TokenMap,
              coins: BigInt('1000000')
            }
          }
        ],
        fee: BigInt('1000000'),
        validityInterval: {
          invalidBefore: Wallet.Cardano.Slot(1),
          invalidHereafter: Wallet.Cardano.Slot(2)
        }
      },
      witness: {
        signatures: new Map([
          [
            Wallet.Crypto.Ed25519PublicKeyHex('6199186adb51974690d7247d2646097d2c62763b767b528816fb7ed3f9f55d39'),
            Wallet.Crypto.Ed25519SignatureHex(
              '709f937c4ce152c81f8406c03279ff5a8556a12a8657e40a578eaaa6223d2e6a2fece39733429e3ec73a6c798561b5c2d47d82224d656b1d964cfe8b5fdffe09'
            )
          ]
        ])
      }
    };
    test('should return parsed pending tx', async () => {
      mockLovelacesToAdaString.mockImplementation(actualLovelacesToAdaString);
      const date = new Date();
      const result = await pendingTxTransformer({
        tx: { ...pendingTx, cbor: Serialization.TxCBOR.serialize(pendingTx) },
        walletAddresses: [
          {
            address: sendingAddress,
            rewardAccount: Wallet.Cardano.RewardAccount(
              'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx'
            )
          }
        ] as Wallet.KeyManagement.GroupedAddress[],
        fiatCurrency: {
          code: currencyCode.USD,
          symbol: '$'
        },
        fiatPrice: 1,
        protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Wallet.ProtocolParameters,
        cardanoCoin,
        date,
        resolveInput: () =>
          Promise.resolve({
            address: sendingAddress,
            value: {
              coins: BigInt('2000000')
            }
          })
      });
      expect(result).toStrictEqual([
        {
          type: 'outgoing',
          status: 'sending',
          deposit: undefined,
          depositReclaim: undefined,
          direction: 'Outgoing',
          fee: '1.00',
          fiatAmount: '1.00 USD',
          id: '6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad',
          amount: '1.00 ADA',
          assets: [
            {
              id: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
              val: '100'
            }
          ],
          assetsNumber: 2,
          date,
          formattedDate: 'Sending',
          formattedTimestamp: formatTime({
            date,
            format: DEFAULT_TIME_FORMAT,
            type: 'local'
          })
        }
      ]);
    });
  });

  describe('getFormattedFiatAmount', () => {
    test('shoud return properly formatted fiat amount', () => {
      const amount = new BigNumber('10');
      const fiatPrice = 2;
      const fiatCurrency = { code: 'code', symbol: 'symbol' } as unknown as CurrencyInfo;
      mockLovelacesToAdaString.mockImplementationOnce((val) => val);

      expect(getFormattedFiatAmount({ amount, fiatPrice, fiatCurrency })).toEqual(
        `${amount.times(new BigNumber(fiatPrice)).toString()} ${fiatCurrency.code}`
      );
    });
    test('shoud return properly formatted fiat amount in case there is no fiat price', () => {
      const amount = new BigNumber('10');
      const fiatPrice = 0;
      const fiatCurrency = { code: 'code', symbol: 'symbol' } as unknown as CurrencyInfo;
      mockLovelacesToAdaString.mockImplementationOnce((val) => val);

      expect(getFormattedFiatAmount({ amount, fiatPrice, fiatCurrency })).toEqual('-');
    });
  });
});
