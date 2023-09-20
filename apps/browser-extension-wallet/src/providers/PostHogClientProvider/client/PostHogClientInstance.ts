import { Wallet } from '@lace/cardano';
import { ExtensionViews } from '@providers/AnalyticsProvider/analyticsTracker';
import { BackgroundStorage, UserIdService } from '@lib/scripts/types';
import { PostHogClient } from './PostHogClient';
import { POSTHOG_ENABLED } from './config';

export class PostHogClientInstance {
  protected static postHogClientInstance: PostHogClient;

  static createInstance(
    chain: Wallet.Cardano.ChainId,
    userIdService: UserIdService,
    {
      getBackgroundStorage,
      setBackgroundStorage
    }: {
      getBackgroundStorage: () => Promise<BackgroundStorage>;
      setBackgroundStorage: (data: BackgroundStorage) => Promise<void>;
    },
    view?: ExtensionViews
  ): PostHogClient {
    // create post hog instance once. If post hog is disabled we just return an empty client
    if (this.postHogClientInstance || !POSTHOG_ENABLED) return this.postHogClientInstance;
    this.postHogClientInstance = new PostHogClient(
      chain,
      userIdService,
      {
        getBackgroundStorage,
        setBackgroundStorage
      },
      view
    );
    return this.postHogClientInstance;
  }
}
