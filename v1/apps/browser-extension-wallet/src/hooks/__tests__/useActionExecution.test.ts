/* eslint-disable unicorn/numeric-separators-style */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockNotify = jest.fn();
const mockUseTranslation = jest.fn();
import { renderHook } from '@testing-library/react-hooks';
import { ActionExecutionArgs, useActionExecution } from '@hooks/useActionExecution';
import { ToastProps } from '@lace/common';

jest.mock('react-i18next', () => {
  const original = jest.requireActual('react-i18next');
  return {
    __esModule: true,
    ...original,
    useTranslation: mockUseTranslation
  };
});

jest.mock('@lace/common', () => {
  const original = jest.requireActual('@lace/common');
  return {
    __esModule: true,
    ...original,
    toast: {
      notify: mockNotify
    }
  };
});

describe('Testing useActionExecution hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should execute action and return proper result', async () => {
    mockUseTranslation.mockReturnValue({ t: jest.fn() });
    const hook = renderHook((withProps = true) =>
      useActionExecution(
        withProps
          ? ({
              shouldDisplayToastOnSuccess: true,
              toastDuration: 'toastDuration'
            } as unknown as ActionExecutionArgs)
          : undefined
      )
    );
    const result = 'result';
    const action = jest.fn().mockImplementation(async () => await result);
    const actionParams = { duration: 'duration', text: 'text' } as unknown as ToastProps;

    expect(await hook.result.current[0](action, actionParams)).toEqual(result);
    expect(mockNotify).toBeCalledWith(actionParams);

    expect(await hook.result.current[0](action)).toEqual(result);
    expect(mockNotify).toBeCalledTimes(1);

    hook.rerender(false);

    expect(await hook.result.current[0](action, actionParams)).toEqual(result);
    expect(mockNotify).toBeCalledTimes(1);
  });

  test('should handle error scenarios', async () => {
    const errorResult = 'errorResult';
    const getErrorMessage = jest.fn().mockReturnValue(errorResult);

    const t = jest.fn().mockImplementation((res) => res);
    mockUseTranslation.mockReturnValue({
      t
    });

    const hook = renderHook((withProps = true) =>
      useActionExecution(
        withProps
          ? ({
              getErrorMessage,
              toastDuration: 'toastDuration'
            } as unknown as ActionExecutionArgs)
          : undefined
      )
    );

    const errorMessage = 'errorMessage';
    const action = jest.fn().mockImplementation(async () => {
      throw new Error(errorMessage);
    });
    try {
      await hook.result.current[0](action);
    } catch (error: any) {
      expect(error).toEqual(errorResult);
    }
    expect(mockNotify).toBeCalledWith({
      text: errorResult,
      duration: 'toastDuration',
      icon: 'div'
    });

    hook.rerender(false);
    try {
      await hook.result.current[0](action);
    } catch (error: any) {
      expect(error).toEqual(errorMessage);
    }
    expect(mockNotify).toBeCalledWith({
      text: errorMessage,
      duration: 3,
      icon: 'div'
    });
  });
});
