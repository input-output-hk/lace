import { useState, useEffect } from 'react';

export type ImageFetchStatus = 'loading' | 'loaded' | 'error';

type ImageFetchStateMap = {
  loading: { status: 'loading' };
  loaded: { status: 'loaded'; imageSrc: string };
  error: { status: 'error'; imageSrc: string };
};

export type UseFetchImageState = ImageFetchStateMap[ImageFetchStatus];

// Blockfrost IPFS allows up to 100 concurrent requests, but we limit it to 80 for now
const maxConcurrentBlockfrostRequests = 80;
let concurrentBlockfrostRequestsCount = 0;

const blockfrostRequestQueue: Set<() => Promise<void>> = new Set();

const processNextBlockfrostIpfsRequest = async () => {
  if (blockfrostRequestQueue.size > 0 && concurrentBlockfrostRequestsCount < maxConcurrentBlockfrostRequests) {
    const [nextBlockfrostRequest] = blockfrostRequestQueue;
    blockfrostRequestQueue.delete(nextBlockfrostRequest);
    concurrentBlockfrostRequestsCount++;
    try {
      await nextBlockfrostRequest();
    } finally {
      processNextBlockfrostIpfsRequest();
    }
  }
};

const fetchImage = async (url: string, controller: AbortController) => {
  const response = await fetch(url, { signal: controller.signal });

  if (!response.ok) throw new Error('Image fetch failed');

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

const isImageLoading = (imageUrl: string): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(true));
    img.addEventListener('error', () => resolve(false));
    img.src = imageUrl;
  });

export const useFetchImage = ({ url, fallbackImage }: { url: string; fallbackImage: string }) => {
  const [state, setState] = useState<UseFetchImageState>({ status: 'loading' });

  useEffect(() => {
    if (url.startsWith('data:image/') || !url.startsWith('https://ipfs.blockfrost.dev')) {
      // eslint-disable-next-line promise/catch-or-return
      isImageLoading(url).then((isValid) => {
        if (isValid) {
          setState({ status: 'loaded', imageSrc: url });
        } else {
          setState({ status: 'error', imageSrc: fallbackImage });
        }
      });

      return () => void 0;
    }

    const controller = new AbortController();

    const loadImageFromBlockfrost = async () => {
      try {
        setState({ status: 'loading' });

        const imageSrc = await fetchImage(url, controller);

        setState({ status: 'loaded', imageSrc });
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: 'error', imageSrc: fallbackImage });
        }
      } finally {
        concurrentBlockfrostRequestsCount--;
        processNextBlockfrostIpfsRequest();
      }
    };

    if (concurrentBlockfrostRequestsCount < maxConcurrentBlockfrostRequests) {
      concurrentBlockfrostRequestsCount++;
      loadImageFromBlockfrost();
    } else {
      blockfrostRequestQueue.add(loadImageFromBlockfrost);
    }

    return () => {
      controller.abort();
      blockfrostRequestQueue.delete(loadImageFromBlockfrost);
    };
  }, [url, fallbackImage]);

  return state;
};
