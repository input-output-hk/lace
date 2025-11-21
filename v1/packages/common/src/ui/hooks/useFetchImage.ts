import { useState, useEffect } from 'react';

export type ImageFetchStatus = 'loading' | 'loaded' | 'error';

type ImageFetchStateMap = {
  loading: { status: 'loading' };
  loaded: { status: 'loaded'; imageSrc: string };
  error: { status: 'error'; imageSrc: string };
};

export type UseFetchImageState = ImageFetchStateMap[ImageFetchStatus];

const BLOCKFROST_IPFS_URL = process.env.BLOCKFROST_IPFS_URL || ' ';

const maxConcurrentBlockfrostRequests = Number.parseInt(process.env.BLOCKFROST_IPFS_CONCURRENT_REQUESTS || '0', 10);
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

  const contentLength = response.headers.get('content-length');
  if (contentLength && blob.size !== Number.parseInt(contentLength, 10)) {
    throw new Error('Incomplete blob size');
  }

  return URL.createObjectURL(blob);
};

const isImageLoading = (imageUrl: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve());
    img.addEventListener('error', (err) => reject(new Error(err.message)));
    img.src = imageUrl;
  });

export const useFetchImage = ({ url, fallbackImage }: { url: string; fallbackImage: string }): UseFetchImageState => {
  const [state, setState] = useState<UseFetchImageState>({ status: 'loading' });

  useEffect(() => {
    if (url.startsWith('data:image/') || !url.startsWith(BLOCKFROST_IPFS_URL)) {
      isImageLoading(url)
        .then(() => {
          setState({ status: 'loaded', imageSrc: url });
        })
        .catch(() => {
          setState({ status: 'error', imageSrc: fallbackImage });
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
