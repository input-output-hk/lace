import '@testing-library/jest-dom';
import { getTransactionData } from '../ActivityDetail';
import {
  incomingTransactionOutput,
  missingDataTransactionOutput,
  outgoingTransactionOutput
} from '@src/utils/mocks/test-helpers';

jest.mock('../../../../../../providers/currency', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../../../../../providers/currency'),
  useCurrencyStore: () =>
    jest.fn().mockReturnValue({
      fiatCurrency: {
        code: 'USD',
        symbol: '$'
      },
      setFiatCurrency: jest.fn()
    })()
}));

describe('Testing Transaction details data function', () => {
  test('should return correct data for incoming transactions', async () => {
    const { outputs, inputs, walletAddresses, incomingTransaction } = incomingTransactionOutput;
    const result = getTransactionData({
      addrInputs: inputs,
      addrOutputs: outputs,
      walletAddresses,
      isIncomingTransaction: incomingTransaction
    });

    expect(result.length).toBeGreaterThan(0);
  });

  test('should return correct data for outgoing transactions', async () => {
    const { outputs, walletAddresses, incomingTransaction } = outgoingTransactionOutput;
    const result = getTransactionData({
      addrInputs: [],
      addrOutputs: outputs,
      walletAddresses,
      isIncomingTransaction: incomingTransaction
    });

    expect(result.length).toBeGreaterThan(0);
  });

  test('should return empty array when data is missing', async () => {
    const { outputs, inputs, walletAddresses, incomingTransaction } = missingDataTransactionOutput;
    const result = getTransactionData({
      addrInputs: inputs,
      addrOutputs: outputs,
      walletAddresses,
      isIncomingTransaction: incomingTransaction
    });

    expect(result.length).toEqual(0);
  });
});
