/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/prefer-add-event-listener */
import { act, renderHook } from '@testing-library/react-hooks';
import { fireEvent } from '@testing-library/react';
import { IMAGE_FETCH_STATUS, useFetchImage } from '../useFetchImage';

const OriginalImage = Image;
const mockImage = new Image();

describe('useFetchImage', () => {
  const imageEventMock = jest.fn(() => {
    fireEvent.load(mockImage);
  });

  beforeAll(() => {
    global.Image = class {
      constructor() {
        setTimeout(() => imageEventMock(), 100);
        return mockImage;
      }
    } as typeof Image;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.Image = OriginalImage;
  });

  test('return loading status and fallback image before calling load function', () => {
    const { result } = renderHook(() => useFetchImage({ url: 'testImage', fallback: 'fallbackImage' }));
    const [response, handleLoad] = result.current;
    expect(response).toEqual({ status: IMAGE_FETCH_STATUS.LOADING, src: 'fallbackImage' });
    expect(typeof handleLoad).toEqual('function');
  });

  test('return loaded status and actual image when load event is fired', async () => {
    const { result } = renderHook(() => useFetchImage({ url: 'testImage', fallback: 'fallbackImage' }));
    const [initialResponse, handleLoad] = result.current;
    expect(initialResponse).toEqual({ status: IMAGE_FETCH_STATUS.LOADING, src: 'fallbackImage' });
    await act(async () => {
      await handleLoad();
      expect(result.current[0]).toEqual({ status: IMAGE_FETCH_STATUS.LOADED, src: 'testImage' });
    });
  });

  test('return error status and fallback image when error event is fired', async () => {
    imageEventMock.mockImplementationOnce(() => {
      fireEvent.error(mockImage);
    });
    const { result } = renderHook(() => useFetchImage({ url: 'testImage', fallback: 'fallbackImage' }));
    const [initialResponse, handleLoad] = result.current;
    expect(initialResponse).toEqual({ status: IMAGE_FETCH_STATUS.LOADING, src: 'fallbackImage' });
    await act(async () => {
      await handleLoad();
      expect(result.current[0]).toEqual({ status: IMAGE_FETCH_STATUS.ERROR, src: 'fallbackImage' });
    });
  });
});
