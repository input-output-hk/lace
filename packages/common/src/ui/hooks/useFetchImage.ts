import { useState, useEffect } from 'react';

export type ImageFetchStatus = 'loading' | 'loaded' | 'error';

type ImageFetchStateMap = {
  loading: { status: 'loading' };
  loaded: { status: 'loaded'; imageSrc: string };
  error: { status: 'error'; imageSrc: string };
};

export type UseFetchImageState = ImageFetchStateMap[ImageFetchStatus];

const maxConcurrentRequests = 5;
const requestQueue: Set<() => Promise<void>> = new Set();
let concurrentRequestsCount = 0;

const processNextRequest = async () => {
  if (requestQueue.size > 0 && concurrentRequestsCount < maxConcurrentRequests) {
    const [nextRequest] = requestQueue;
    requestQueue.delete(nextRequest);
    concurrentRequestsCount++;
    try {
      await nextRequest();
    } finally {
      processNextRequest();
    }
  }
};

const fetchImage = async (url: string, controller: AbortController) => {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { 'Cache-Control': 'public, max-age=86400' }
  });

  if (!response.ok) throw new Error('Image fetch failed');

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const useFetchImage = ({ url, fallbackImage }: { url: string; fallbackImage: string }) => {
  const [state, setState] = useState<UseFetchImageState>({ status: 'loading' });

  useEffect(() => {
    if (url.startsWith('data:')) {
      // TODO investigate the below problem + use getAssetImageUrl
      // Solve broken links e.g. data:image/png;base64,https://storage.something.com/assets/1235
      const httpPosition = url.indexOf('http');
      if (httpPosition === -1) {
        setState({ status: 'loaded', imageSrc: url });
      } else {
        setState({ status: 'loaded', imageSrc: url.slice(httpPosition) });
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }

    const controller = new AbortController();

    const loadImage = async () => {
      try {
        setState({ status: 'loading' });

        const imageSrc = await fetchImage(url, controller);

        setState({ status: 'loaded', imageSrc });
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: 'error', imageSrc: fallbackImage });
        }
      } finally {
        concurrentRequestsCount--;
        processNextRequest();
      }
    };

    if (concurrentRequestsCount < maxConcurrentRequests) {
      concurrentRequestsCount++;
      loadImage();
    } else {
      requestQueue.add(loadImage);
    }

    return () => {
      controller.abort();
      requestQueue.delete(loadImage);
    };
  }, [url, fallbackImage]);

  return state;
};
