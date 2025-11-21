/* eslint-disable unicorn/numeric-separators-style */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockdayjsinner = jest.fn();
import { renderHook } from '@testing-library/react-hooks';
import { useTimeSpentOnPage } from '@hooks/useTimeSpentOnPage';
import { act } from 'react-dom/test-utils';

jest.mock('dayjs', () => {
  const original = jest.requireActual('dayjs');
  return {
    __esModule: true,
    ...original.default,
    ...original,
    default: mockdayjsinner
  };
});

describe('Testing useWalletInfoSubscriber hook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should calculate time spend om page and handle updates respectively', async () => {
    const diffMock = jest.fn();
    mockdayjsinner.mockReturnValueOnce('initialTime').mockReturnValueOnce({ diff: diffMock });
    const { result } = renderHook(() => useTimeSpentOnPage('initialTime'));

    diffMock.mockReturnValueOnce('diffFirstResult');
    expect(result.current.calculateTimeSpentOnPage()).toEqual('diffFirstResult');
    expect(mockdayjsinner).toBeCalledWith('initialTime');
    expect(diffMock).toHaveBeenNthCalledWith(1, 'initialTime', 'seconds');

    mockdayjsinner.mockReturnValue('newTime');
    act(() => {
      result.current.updateEnteredAtTime('newTime');
    });
    expect(mockdayjsinner).toBeCalledWith('newTime');
    mockdayjsinner.mockReset();

    diffMock.mockReturnValueOnce('diffSecondResult');
    mockdayjsinner.mockReturnValueOnce({ diff: diffMock });
    expect(result.current.calculateTimeSpentOnPage()).toEqual('diffSecondResult');
    expect(diffMock).toHaveBeenNthCalledWith(2, 'newTime', 'seconds');
  });

  test('should handle default values', async () => {
    const diffMock = jest.fn();
    mockdayjsinner.mockReturnValueOnce('initialTime').mockReturnValueOnce({ diff: diffMock });
    const { result } = renderHook(() => useTimeSpentOnPage());

    diffMock.mockReturnValueOnce('diffFirstResult');
    expect(result.current.calculateTimeSpentOnPage()).toEqual('diffFirstResult');
    expect(mockdayjsinner).toBeCalledWith();
    expect(diffMock).toHaveBeenNthCalledWith(1, 'initialTime', 'seconds');

    mockdayjsinner.mockReturnValue('newTime');
    act(() => {
      result.current.updateEnteredAtTime();
    });
    expect(mockdayjsinner).toBeCalledWith();
    mockdayjsinner.mockReset();

    diffMock.mockReturnValueOnce('diffSecondResult');
    mockdayjsinner.mockReturnValueOnce({ diff: diffMock });
    expect(result.current.calculateTimeSpentOnPage()).toEqual('diffSecondResult');
    expect(diffMock).toHaveBeenNthCalledWith(2, 'newTime', 'seconds');
  });
});
