/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useReducer } from 'react';

enum IMAGE_FETCH_ACTION_TYPES {
  FETCHING = 'FETCHING',
  FETCHED = 'FETCHED',
  FETCH_ERROR = 'FETCH_ERROR'
}

export enum IMAGE_FETCH_STATUS {
  LOADING,
  LOADED,
  ERROR
}

interface ImageResponse {
  status?: IMAGE_FETCH_STATUS;
  src?: string;
}

interface FetchImageArgs {
  url: string;
  fallback: string;
}

type FetchAction = {
  type: IMAGE_FETCH_ACTION_TYPES;
  payload?: string;
};

const handleImageFetch = (image: string) => {
  const downloadingImage = new Image();

  const imageResponse: Promise<ImageResponse> = new Promise<ImageResponse>((resolve) => {
    const onLoadEvent = (event: any) => {
      resolve({
        status: IMAGE_FETCH_STATUS.LOADED,
        src: event.path?.[0].currentSrc || image
      });
    };
    const onErrorEvent = () => {
      resolve({
        status: IMAGE_FETCH_STATUS.ERROR
      });
    };

    downloadingImage.addEventListener('load', onLoadEvent);
    downloadingImage.addEventListener('error', onErrorEvent);
  });

  downloadingImage.src = image;

  return imageResponse;
};

const initialState = { status: IMAGE_FETCH_STATUS.LOADING };

const fetchImageReducer = (state: ImageResponse, action: FetchAction): ImageResponse => {
  switch (action.type) {
    case IMAGE_FETCH_ACTION_TYPES.FETCHING:
      return { ...initialState, status: IMAGE_FETCH_STATUS.LOADING };
    case IMAGE_FETCH_ACTION_TYPES.FETCHED:
      return { ...initialState, status: IMAGE_FETCH_STATUS.LOADED, src: action.payload };
    case IMAGE_FETCH_ACTION_TYPES.FETCH_ERROR:
      return { ...initialState, status: IMAGE_FETCH_STATUS.ERROR };
    default:
      return state;
  }
};

const fetchImageDispatcher = async (url: string, dispatcher: React.Dispatch<FetchAction>) => {
  const response = await handleImageFetch(url);

  const type =
    response.status === IMAGE_FETCH_STATUS.LOADED
      ? IMAGE_FETCH_ACTION_TYPES.FETCHED
      : // eslint-disable-next-line unicorn/no-nested-ternary
      response.status === IMAGE_FETCH_STATUS.ERROR
      ? IMAGE_FETCH_ACTION_TYPES.FETCH_ERROR
      : IMAGE_FETCH_ACTION_TYPES.FETCHING;
  const dispatchValue = { payload: response.src, type };

  dispatcher(dispatchValue);
};

export const useFetchImage = ({ url, fallback }: FetchImageArgs): [ImageResponse, () => Promise<void>] => {
  const [result, dispatch] = useReducer(fetchImageReducer, initialState);
  const handleLoad = useCallback(async () => {
    await fetchImageDispatcher(url, dispatch);
  }, [url]);

  const resultWithFallback = useMemo(
    () => ({
      ...result,
      src: result?.src || fallback
    }),
    [result, fallback]
  );

  return [resultWithFallback, handleLoad];
};
