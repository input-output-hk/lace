/* eslint-disable no-magic-numbers */
import create, { UseStore } from 'zustand';
import { Wallet } from '@lace/cardano';
import { sendTransactionSlice } from '../send-transaction-slice';
import { renderHook, act } from '@testing-library/react-hooks';
import { SendTransactionSlice } from '../../types';
import '@testing-library/jest-dom';

describe('Testing send transaction store slice', () => {
  let useSendTxHook: UseStore<SendTransactionSlice>;
  const address = Wallet.Cardano.PaymentAddress(
    'addr_test1qpr3akacs72xelgd60ucdz0j4uw8dkg86jhntqd6gjpk84adv3qw0nafy8arl48xwhhnlzxre3cwx0xjnlwxfm77l00smqpvpz'
  );
  beforeEach(() => {
    useSendTxHook = create<SendTransactionSlice>((...args) => sendTransactionSlice(...args));
  });

  test('should create send store hook with send transaction slice and default states', () => {
    const { result } = renderHook(() => useSendTxHook());

    expect(result.current.destinationAddress).toBeUndefined();
    expect(result.current.transaction).toBeUndefined();
    expect(result.current.transactionValue).toBeUndefined();
    expect(result.current.transactionFeeLovelace).toEqual('0');
    expect(typeof result.current.setDestinationAddress).toBe('function');
    expect(typeof result.current.setTransaction).toBe('function');
    expect(typeof result.current.setTransactionValue).toBe('function');
    expect(typeof result.current.setTransactionFeeLovelace).toBe('function');
  });

  test('should be able to set destination address', () => {
    const { result } = renderHook(() => useSendTxHook());
    act(() => {
      result.current.setDestinationAddress(address);
    });

    expect(result.current.destinationAddress).toEqual(address);
  });

  test('should be able to set transaction value', () => {
    const { result } = renderHook(() => useSendTxHook());
    const txValue = {
      coins: BigInt(1_000_000),
      assets: new Map([
        [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt(2_000_000)]
      ])
    };
    act(() => {
      result.current.setTransactionValue(txValue);
    });

    expect(result.current.transactionValue).toEqual(txValue);
  });

  test('should be able to set transaction fee lovelace', () => {
    const { result } = renderHook(() => useSendTxHook());
    act(() => {
      result.current.setTransactionFeeLovelace('2000000');
    });

    expect(result.current.transactionFeeLovelace).toEqual('2000000');
  });
});
