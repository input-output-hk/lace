/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { RedirectionHandler, useRedirection } from '../useRedirection';

const mockUseLocationValue = {
  push: jest.fn()
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<any>('react-router-dom'),
  useHistory: () => mockUseLocationValue
}));

describe('Testing useRedirection hook', () => {
  afterEach(() => {
    mockUseLocationValue.push.mockReset();
  });
  test('should call history push with proper url', () => {
    const path = 'path';
    const hook = renderHook(() => useRedirection<any>(path));
    const handleRedirection = hook.result.current as RedirectionHandler<never>;
    handleRedirection();

    expect(mockUseLocationValue.push).toBeCalledWith('path');
  });
  test('should call history push with proper url (with params and search query)', () => {
    const path = 'path/:id';
    const hook = renderHook(() => useRedirection<any>(path));
    const handleRedirection = hook.result.current;
    handleRedirection({ params: { id: '1', search: 1 }, search: { searchKey: 'searchValue' } });

    expect(mockUseLocationValue.push).toBeCalledWith('path/1?searchKey=searchValue');
  });
  test('should call history push with proper url (with params only)', () => {
    const path = 'path/:id';
    const hook = renderHook(() => useRedirection<any>(path));
    const handleRedirection = hook.result.current;
    handleRedirection({ params: { id: '1', search: 1 } });

    expect(mockUseLocationValue.push).toBeCalledWith('path/1');
  });

  test('should call history push with proper url (with search query only)', () => {
    const path = 'path';
    const hook = renderHook(() => useRedirection<any>(path));
    const handleRedirection = hook.result.current;
    handleRedirection({ search: { searchKey: 'searchValue' } });

    expect(mockUseLocationValue.push).toBeCalledWith('path?searchKey=searchValue');
  });
});
