/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/prefer-add-event-listener */
import { act, renderHook } from '@testing-library/react-hooks';
import { fireEvent } from '@testing-library/react';
import { useFetchImage } from '../useFetchImage';

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

  test('return loading status', () => {
    const { result } = renderHook(() => useFetchImage({ url: 'testImage', fallbackImage: 'fallbackImage' }));
    const response = result.current;
    expect(response).toEqual({ status: 'loading' });
  });

  test('return loaded status and image url', async () => {
    const { result } = renderHook(() => useFetchImage({ url: 'testImage', fallbackImage: 'fallbackImage' }));
    const initialResponse = result.current;
    expect(initialResponse).toEqual({ status: 'loading' });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(result.current).toEqual({ status: 'loaded', imageSrc: 'testImage' });
    });
  });

  test('return loaded status and actual image dataUrl', async () => {
    const { result } = renderHook(() =>
      useFetchImage({
        url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
        fallbackImage: 'fallbackImage'
      })
    );
    const initialResponse = result.current;
    expect(initialResponse).toEqual({ status: 'loading' });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(result.current).toEqual({
        status: 'loaded',
        imageSrc: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
      });
    });
  });

  test('return error for malformed dataUrl', async () => {
    imageEventMock.mockImplementationOnce(() => {
      fireEvent.error(mockImage);
    });

    const { result } = renderHook(() =>
      useFetchImage({ url: 'data:image/unknown;undefined', fallbackImage: 'fallbackImage' })
    );
    const initialResponse = result.current;
    expect(initialResponse).toEqual({ status: 'loading' });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(result.current).toEqual({ status: 'error', imageSrc: 'fallbackImage' });
    });
  });

  test('return error status and fallback image when error event is fired', async () => {
    imageEventMock.mockImplementationOnce(() => {
      fireEvent.error(mockImage);
    });
    const { result } = renderHook(() => useFetchImage({ url: 'testImage', fallbackImage: 'fallbackImage' }));
    const initialResponse = result.current;
    expect(initialResponse).toEqual({ status: 'loading' });
    // eslint-disable-next-line sonarjs/no-identical-functions
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(result.current).toEqual({ status: 'error', imageSrc: 'fallbackImage' });
    });
  });
});
