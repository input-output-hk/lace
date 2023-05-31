/* eslint-disable no-magic-numbers */
import { renderHook } from '@testing-library/react-hooks';
import { useNetworkError } from '../useNetworkError';
import { NetworkConnectionStates } from '@src/types';
import { Message, MessageTypes } from '@lib/scripts/types';

const setNetworkConnection = jest.fn();
const subscribeArr: Array<(msg: Message) => void> = [];

const backgroundServices = {
  requestMessage$: {
    subscribeArr,
    next: (msg: Message) => {
      subscribeArr.forEach((cb) => cb(msg));
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subscribe: (cb: () => void) => {
      const index = subscribeArr.length;
      subscribeArr.push(cb);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return {
        unsubscribe: () => {
          subscribeArr.splice(index, 1);
        }
      };
    }
  }
};

jest.mock('../../providers', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../providers'),
  useBackgroundServiceAPIContext: () => backgroundServices
}));

jest.mock('../../stores', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('../../stores'),
  useWalletStore: () => ({
    setNetworkConnection
  })
}));

describe('Testing useBuildDelegation hook', () => {
  test('should return build delegation transaction function', async () => {
    const cb = jest.fn();
    renderHook(() => useNetworkError(cb));

    expect(cb).toHaveBeenCalledTimes(0);
    expect(setNetworkConnection).toHaveBeenCalledTimes(0);

    // offline
    backgroundServices.requestMessage$.next({ type: MessageTypes.HTTP_CONNECTION, data: { connected: false } });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(setNetworkConnection).toHaveBeenNthCalledWith(1, NetworkConnectionStates.OFFLINE);

    // back online
    backgroundServices.requestMessage$.next({ type: MessageTypes.HTTP_CONNECTION, data: { connected: true } });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(setNetworkConnection).toHaveBeenNthCalledWith(2, NetworkConnectionStates.CONNNECTED);
  });
});
