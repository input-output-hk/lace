/* eslint-disable no-magic-numbers */
/* eslint-disable sonarjs/no-identical-functions */
import { ConnectionStatus } from '../src/ConnectionStatus';
import { NotificationsLogger } from '../src/types';

describe('ConnectionStatus', () => {
  let mockCallback: jest.Mock;
  let mockLogger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let connectionStatus: ConnectionStatus;

  beforeEach(() => {
    mockCallback = jest.fn();
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    connectionStatus = new ConnectionStatus(mockLogger as NotificationsLogger, mockCallback);
  });

  describe('constructor', () => {
    test('should initialize with idle status', () => {
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('setError', () => {
    test('should call callback with error and set status to error', async () => {
      const error = new Error('Connection failed');

      const callbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(error);

      const callbackArgs = await callbackPromise;

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(callbackArgs[0]).toBe(error);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should handle multiple error calls', async () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      const expectedCallCount = 2;

      const firstCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(error1);
      const firstArgs = await firstCallbackPromise;

      const secondCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(error2);
      const secondArgs = await secondCallbackPromise;

      expect(mockCallback).toHaveBeenCalledTimes(expectedCallCount);
      expect(firstArgs[0]).toBe(error1);
      expect(secondArgs[0]).toBe(error2);
    });

    test('should log error when callback throws an exception', async () => {
      const connectionError = new Error('Connection failed');
      const callbackError = new Error('Callback error');
      mockCallback.mockImplementation(() => {
        throw callbackError;
      });

      const errorLogPromise = new Promise<unknown[]>((resolve) => {
        mockLogger.error.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(connectionError);

      const errorLogArgs = await errorLogPromise;

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(connectionError);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(errorLogArgs).toEqual(['Failed to notify connection status change', callbackError]);
    });
  });

  describe('setOk', () => {
    test('should call callback and set status to connected when status is idle', async () => {
      const callbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();

      await callbackPromise;

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should call callback and set status to connected when status is connecting', async () => {
      // Simulate connecting state by calling setError first, then setOk
      const firstCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(new Error('test'));
      await firstCallbackPromise;
      mockCallback.mockClear();

      const secondCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();
      await secondCallbackPromise;

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith();
    });

    test('should not call callback again when already connected', async () => {
      const firstCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();
      await firstCallbackPromise;
      mockCallback.mockClear();
      mockLogger.error.mockClear();

      connectionStatus.setOk();

      // Wait a bit to ensure callback is not called
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should handle transition from error to connected', async () => {
      const error = new Error('Connection error');
      const firstCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(error);
      await firstCallbackPromise;
      mockCallback.mockClear();

      const secondCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();
      await secondCallbackPromise;

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith();
    });

    test('should log error when callback throws an exception', async () => {
      const callbackError = new Error('Callback error');
      mockCallback.mockImplementation(() => {
        throw callbackError;
      });

      const errorLogPromise = new Promise<unknown[]>((resolve) => {
        mockLogger.error.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();

      const errorLogArgs = await errorLogPromise;

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith();
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(errorLogArgs).toEqual(['Failed to notify connection status change', callbackError]);
    });

    test('should log error when callback throws an exception during transition from error to connected', async () => {
      const connectionError = new Error('Connection error');
      const callbackError = new Error('Callback error');
      const firstCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(connectionError);
      await firstCallbackPromise;
      mockCallback.mockClear();
      mockCallback.mockImplementation(() => {
        throw callbackError;
      });

      const errorLogPromise = new Promise<unknown[]>((resolve) => {
        mockLogger.error.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();

      const errorLogArgs = await errorLogPromise;

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith();
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(errorLogArgs).toEqual(['Failed to notify connection status change', callbackError]);
    });
  });

  describe('state transitions', () => {
    test('should handle full connection lifecycle', async () => {
      // Initial state: idle
      expect(mockCallback).not.toHaveBeenCalled();

      // Set to connected
      const firstCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();
      await firstCallbackPromise;
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith();

      // Already connected, should not call again
      mockCallback.mockClear();
      connectionStatus.setOk();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockCallback).not.toHaveBeenCalled();

      // Set error
      const error = new Error('Connection lost');
      const errorCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setError(error);
      await errorCallbackPromise;
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(error);

      // Recover from error
      mockCallback.mockClear();
      const recoverCallbackPromise = new Promise<unknown[]>((resolve) => {
        mockCallback.mockImplementationOnce((...args) => {
          resolve(args);
        });
      });

      connectionStatus.setOk();
      await recoverCallbackPromise;
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith();

      // Should not call again when already connected
      mockCallback.mockClear();
      connectionStatus.setOk();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
