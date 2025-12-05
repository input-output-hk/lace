/* eslint-disable unicorn/no-null */
// Needs to be initialized before imports so it can be used in jest.mock
const useLocationMock = jest.fn().mockReturnValue({ search: '' });
/* eslint-disable import/imports-first */
import { renderHook } from '@testing-library/react-hooks';
import { useSearchParams } from '../useSearchParams';

jest.mock('react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('react-router'),
  useLocation: useLocationMock
}));

describe('useSearchParams', () => {
  test('returns an object with the url params and their values', () => {
    useLocationMock.mockReturnValueOnce({ search: '?param=value&test=123' });
    const { result } = renderHook(() => useSearchParams(['param', 'test']));
    expect(result.current).toEqual({ param: 'value', test: '123' });
  });

  test('returns null for params not included in the url', () => {
    useLocationMock.mockReturnValueOnce({ search: '?param=value' });
    const { result } = renderHook(() => useSearchParams(['param', 'test']));
    expect(result.current).toEqual({ param: 'value', test: null });
  });

  test('returns only the url params specified in the hook parameter array', () => {
    useLocationMock.mockReturnValueOnce({ search: '?param=value&test=123' });
    const { result } = renderHook(() => useSearchParams(['test']));
    expect(result.current).toEqual({ test: '123' });
    expect(result.current).not.toHaveProperty('param');
  });

  test('returns null for all params if the search string is empty', () => {
    const { result } = renderHook(() => useSearchParams(['param', 'test']));
    expect(result.current).toEqual({ param: null, test: null });
  });

  test('returns an empty object if hook parameter array is empty regardless of search string', () => {
    useLocationMock.mockReturnValueOnce({ search: '?param=value' });
    const { result } = renderHook(() => useSearchParams([]));
    expect(result.current).toEqual({});
  });
});
