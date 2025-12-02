import { renderHook } from '@testing-library/react-hooks';
import { getSendStoreContext } from '../../../utils/mocks/test-helpers';
import { cancelModalSelector, sendTransactionSelector } from '../selectors';
import { useSendStore } from '../stores';

describe('Testing cancelModalSelector', () => {
  test('should return cancel modal status and setter', () => {
    const { result } = renderHook(() => useSendStore(cancelModalSelector), {
      wrapper: getSendStoreContext()
    });

    expect(result.current).toHaveProperty('showCancelSendModal');
    expect(result.current).toHaveProperty('setShowCancelSendModal');
  });
});

describe('Testing sendTransactionSelector', () => {
  test('should return address, built tx, tx value and setters', () => {
    const { result } = renderHook(() => useSendStore(sendTransactionSelector), {
      wrapper: getSendStoreContext()
    });

    expect(result.current).toHaveProperty('destinationAddress');
    expect(result.current).toHaveProperty('transactionValue');
    expect(result.current).toHaveProperty('transaction');
    expect(result.current).toHaveProperty('transactionFeeLovelace');
    expect(result.current).toHaveProperty('setDestinationAddress');
    expect(result.current).toHaveProperty('setTransactionValue');
    expect(result.current).toHaveProperty('setTransaction');
    expect(result.current).toHaveProperty('setTransactionFeeLovelace');
  });
});
