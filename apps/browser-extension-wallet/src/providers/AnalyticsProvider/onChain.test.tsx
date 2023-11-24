/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-magic-numbers */
import { sendConfirmedTransactionAnalytics, useOnChainEventAnalytics } from './onChain';
import { TxCreationType } from './analyticsTracker';
import { renderHook } from '@testing-library/react-hooks';
import { Subject } from 'rxjs';

describe('sendConfirmedTransactionAnalytics', () => {
  const sendEventToPostHog = jest.fn();
  const getUnconfirmedTransactionsFn = jest.fn();
  const saveUnconfirmedTransactionsFn = jest.fn();

  beforeEach(() => {
    sendEventToPostHog.mockClear();
    getUnconfirmedTransactionsFn.mockClear();
    saveUnconfirmedTransactionsFn.mockClear();
  });

  test('should take no action when there are no unconfirmed transactions', async () => {
    const onChainTransactionIds = ['id1'];
    getUnconfirmedTransactionsFn.mockReturnValue([]);

    await sendConfirmedTransactionAnalytics({
      onChainTransactionIds,
      sendEventToPostHog,
      getUnconfirmedTransactionsFn,
      saveUnconfirmedTransactionsFn
    });

    expect(sendEventToPostHog).not.toHaveBeenCalled();
    expect(getUnconfirmedTransactionsFn).toHaveBeenCalledTimes(1);
    expect(saveUnconfirmedTransactionsFn).not.toHaveBeenCalled();
  });

  test('should take no action if there are no historical transactions and unconfirmed transactions are fresh', async () => {
    getUnconfirmedTransactionsFn.mockReturnValue([
      {
        id: 'id',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      }
    ]);

    await sendConfirmedTransactionAnalytics({
      onChainTransactionIds: [],
      sendEventToPostHog,
      getUnconfirmedTransactionsFn,
      saveUnconfirmedTransactionsFn
    });

    expect(sendEventToPostHog).not.toHaveBeenCalled();
    expect(getUnconfirmedTransactionsFn).toHaveBeenCalledTimes(1);
    expect(saveUnconfirmedTransactionsFn).not.toHaveBeenCalled();
  });

  test('should clear old unconfirmed transactions and parse confirmed transactions', async () => {
    const onChainTransactionIds = ['id1'];
    getUnconfirmedTransactionsFn.mockReturnValue([
      {
        id: 'id1',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      },
      {
        id: 'id2',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      },
      {
        id: 'id3',
        creationType: TxCreationType.Internal,
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toString()
      }
    ]);

    await sendConfirmedTransactionAnalytics({
      onChainTransactionIds,
      sendEventToPostHog,
      getUnconfirmedTransactionsFn,
      saveUnconfirmedTransactionsFn
    });

    expect(sendEventToPostHog).toHaveBeenCalledTimes(1);
    expect(getUnconfirmedTransactionsFn).toHaveBeenCalledTimes(1);
    expect(saveUnconfirmedTransactionsFn).toHaveBeenCalledWith([
      {
        id: 'id2',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      }
    ]);
  });

  test('should parse confirmed transactions and clear unconfirmed transactions', async () => {
    const onChainTransactionIds = ['id1', 'id2'];
    getUnconfirmedTransactionsFn.mockReturnValue([
      {
        id: 'id2',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      }
    ]);

    await sendConfirmedTransactionAnalytics({
      onChainTransactionIds,
      sendEventToPostHog,
      getUnconfirmedTransactionsFn,
      saveUnconfirmedTransactionsFn
    });

    expect(sendEventToPostHog).toHaveBeenCalledTimes(1);
    expect(getUnconfirmedTransactionsFn).toHaveBeenCalledTimes(1);
    expect(saveUnconfirmedTransactionsFn).toHaveBeenCalledWith([]);
  });

  test('should parse confirmed transactions and clear unconfirmed transactions', async () => {
    const onChainTransactionIds = ['id1', 'id2'];
    getUnconfirmedTransactionsFn.mockReturnValue([
      {
        id: 'id1',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      },
      {
        id: 'id2',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      }
    ]);

    await sendConfirmedTransactionAnalytics({
      onChainTransactionIds,
      sendEventToPostHog,
      getUnconfirmedTransactionsFn,
      saveUnconfirmedTransactionsFn
    });

    expect(sendEventToPostHog).toHaveBeenCalledTimes(2);
    expect(getUnconfirmedTransactionsFn).toHaveBeenCalledTimes(1);
    expect(saveUnconfirmedTransactionsFn).toHaveBeenCalledWith([]);
  });

  test('should parse confirmed transactions and clear unconfirmed transactions', async () => {
    getUnconfirmedTransactionsFn.mockReturnValue([
      {
        id: 'id1',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      },
      {
        id: 'id2',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      }
    ]);

    await sendConfirmedTransactionAnalytics({
      onChainTransactionIds: ['id1'],
      sendEventToPostHog,
      getUnconfirmedTransactionsFn,
      saveUnconfirmedTransactionsFn
    });

    expect(sendEventToPostHog).toHaveBeenCalledTimes(1);
    expect(getUnconfirmedTransactionsFn).toHaveBeenCalledTimes(1);
    expect(saveUnconfirmedTransactionsFn).toHaveBeenCalledWith([
      {
        id: 'id2',
        creationType: TxCreationType.Internal,
        date: new Date().toString()
      }
    ]);
  });
});

describe('useOnChainEventAnalytics', () => {
  const mockRequestLock = jest.fn();
  const mockOnChainEvent = jest.fn();
  const mockUseOnChainEventAnalytics = {
    observable$: new Subject<string[]>(),
    requestLock: mockRequestLock,
    onChainEvent: mockOnChainEvent
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should subscribe to the observable and call onChainEvent on each emission', () => {
    mockRequestLock.mockImplementation((_, __, callback) => callback());

    renderHook(() => useOnChainEventAnalytics(mockUseOnChainEventAnalytics));

    mockUseOnChainEventAnalytics.observable$.next(['1']);

    expect(mockRequestLock).toHaveBeenCalledTimes(1);
    expect(mockOnChainEvent).toHaveBeenCalledTimes(1);
    expect(mockOnChainEvent).toHaveBeenCalledWith(['1']);
  });

  test('should subscribe multiple times to the observable but call onChainEvent only once because of the lock', () => {
    mockRequestLock.mockImplementationOnce((_, __, callback) => callback()).mockImplementation();

    renderHook(() => useOnChainEventAnalytics(mockUseOnChainEventAnalytics));
    renderHook(() => useOnChainEventAnalytics(mockUseOnChainEventAnalytics));

    mockUseOnChainEventAnalytics.observable$.next(['1']);

    expect(mockRequestLock).toHaveBeenCalledTimes(2);
    expect(mockOnChainEvent).toHaveBeenCalledTimes(1);
    expect(mockOnChainEvent).toHaveBeenCalledWith(['1']);
  });
});
