import { Wallet } from '@lace/cardano';
import { PostHogClient, POSTHOG_ENABLED } from '../AnalyticsProvider/postHog';
import { ExtensionViews } from '@providers/AnalyticsProvider/analyticsTracker';
import { BackgroundStorage, UserIdService } from '@lib/scripts/types';

export class PostHogClientInstance {
  protected postHogClientInstance: PostHogClient;

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
    if (this.prototype.postHogClientInstance || !POSTHOG_ENABLED) return this.prototype.postHogClientInstance;
    this.prototype.postHogClientInstance = new PostHogClient(
      chain,
      userIdService,
      {
        getBackgroundStorage,
        setBackgroundStorage
      },
      view
    );
    return this.prototype.postHogClientInstance;
  }
}
