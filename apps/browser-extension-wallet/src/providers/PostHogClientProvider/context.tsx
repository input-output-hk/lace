import shallow from 'zustand/shallow';
import React, { createContext, useContext, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { PostHogClient } from '../AnalyticsProvider/postHog';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ExtensionViews } from '@providers/AnalyticsProvider/analyticsTracker';
import { PostHogClientInstance } from './PostHogClientInstance';

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
        view === 'popup' ? ExtensionViews.Popup : ExtensionViews.Extended
      ),
    // we have two options here, we keep the memoization with PostHogClientInstance or
    // we remove currentChain and view from the depencency array to avoid redefine this every time these fields change and we call new PostHogClient() here
    [currentChain, postHogCustomClient, view]
  );

  return <PostHogClientContext.Provider value={postHogClientInstance}>{children}</PostHogClientContext.Provider>;
};
