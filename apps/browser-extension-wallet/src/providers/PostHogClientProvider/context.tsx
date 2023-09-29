import shallow from 'zustand/shallow';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { PostHogClient } from './client';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ExtensionViews } from '@providers/AnalyticsProvider/analyticsTracker';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';

const userIdService = getUserIdService();

// eslint-disable-next-line unicorn/no-null
const PostHogClientContext = createContext<PostHogClient | null>(null);

export const usePostHogClientContext = (): PostHogClient => {
  const postHogClientContext = useContext(PostHogClientContext);
  if (postHogClientContext === null) throw new Error('PostHogClientContext not defined');
  return postHogClientContext;
};

interface PostHogClientProps {
  children: React.ReactNode;
  postHogCustomClient?: PostHogClient;
}

export const PostHogClientProvider = ({ children, postHogCustomClient }: PostHogClientProps): React.ReactElement => {
  const { getBackgroundStorage, setBackgroundStorage } = useBackgroundServiceAPIContext();
  const { currentChain, view } = useWalletStore(
    (state) => ({ currentChain: state?.currentChain, view: state.walletUI.appMode }),
    shallow
  );

  const postHogClientInstance = useMemo(
    () =>
      postHogCustomClient ||
      PostHogClient.getInstance(
        currentChain,
        userIdService,
        { getBackgroundStorage, setBackgroundStorage },
        view === 'popup' ? ExtensionViews.Popup : ExtensionViews.Extended
      ),
    [currentChain, getBackgroundStorage, postHogCustomClient, setBackgroundStorage, view]
  );

  useEffect(() => () => postHogClientInstance.shutdown(), [postHogClientInstance]);

  return <PostHogClientContext.Provider value={postHogClientInstance}>{children}</PostHogClientContext.Provider>;
};
