/* eslint-disable no-magic-numbers */
import create, { UseStore } from 'zustand';
import { sendCancelModalSlice } from '../send-cancel-modal-slice';
import { renderHook, act } from '@testing-library/react-hooks';
import { SendCancelModalSlice } from '../../types';
import '@testing-library/jest-dom';

describe('Testing send cancel modal store slice', () => {
  let useSendTxHook: UseStore<SendCancelModalSlice>;

  beforeEach(() => {
    useSendTxHook = create<SendCancelModalSlice>((...args) => sendCancelModalSlice(...args));
  });

  test('should create send store hook with send cancel modal slice and default states', () => {
    const { result } = renderHook(() => useSendTxHook());

    expect(result.current.showCancelSendModal).toBe(false);
    expect(typeof result.current.setShowCancelSendModal).toBe('function');
  });

  test('should be able to set cancel modal status', () => {
    const { result } = renderHook(() => useSendTxHook());
    act(() => {
      result.current.setShowCancelSendModal(true);
    });

    expect(result.current.showCancelSendModal).toEqual(true);
  });
});
