import shallow from 'zustand/shallow';
import React, { createContext, useContext, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { PostHogClient } from './client';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ExtensionViews } from '@providers/AnalyticsProvider/analyticsTracker';
import { PostHogClientInstance } from './client/PostHogClientInstance';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';

// do we move it to PostHogClientInstance?
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
      PostHogClientInstance.createInstance(
        currentChain,
        userIdService,
        { getBackgroundStorage, setBackgroundStorage },
        view === 'popup' ? ExtensionViews.Popup : ExtensionViews.Extended
      ),
    // we have two options here, we keep the memoization with PostHogClientInstance or
    // we remove currentChain and view from the depencency array to avoid redefine this every time these fields change and we call new PostHogClient() here
    [currentChain, getBackgroundStorage, postHogCustomClient, setBackgroundStorage, view]
  );

  return <PostHogClientContext.Provider value={postHogClientInstance}>{children}</PostHogClientContext.Provider>;
};
