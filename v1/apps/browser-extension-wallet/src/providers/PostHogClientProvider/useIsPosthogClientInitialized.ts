import { usePostHogClientContext } from '@providers/PostHogClientProvider/context';
import { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useIsPosthogClientInitialized = () => {
  const postHogClient = usePostHogClientContext();
  const [posthogInitialized, setPosthogInitialized] = useState(false);

  useEffect(() => {
    postHogClient.hasPostHogInitialized$.subscribe(setPosthogInitialized);
  }, [postHogClient.hasPostHogInitialized$]);

  return posthogInitialized;
};
