import '@testing-library/jest-dom';
import { getTransactionData } from '../TransactionDetail';
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
    const { outputs, inputs, walletAddress, incomingTransaction } = incomingTransactionOutput;
    const result = getTransactionData({
      addrInputs: inputs,
      addrOutputs: outputs,
      walletAddress,
      isIncomingTransaction: incomingTransaction
    });

    expect(result.length).toBeGreaterThan(0);
  });

  test('should return correct data for outgoing transactions', async () => {
    const { outputs, walletAddress, incomingTransaction } = outgoingTransactionOutput;
    const result = getTransactionData({
      addrInputs: [],
      addrOutputs: outputs,
      walletAddress,
      isIncomingTransaction: incomingTransaction
    });

    expect(result.length).toBeGreaterThan(0);
  });

  test('should return empty array when data is missing', async () => {
    const { outputs, inputs, walletAddress, incomingTransaction } = missingDataTransactionOutput;
    const result = getTransactionData({
      addrInputs: inputs,
      addrOutputs: outputs,
      walletAddress,
      isIncomingTransaction: incomingTransaction
    });

    expect(result.length).toEqual(0);
  });
});
