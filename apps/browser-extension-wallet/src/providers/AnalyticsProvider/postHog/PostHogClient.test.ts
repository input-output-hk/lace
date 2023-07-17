import { Wallet } from '@lace/cardano';
import { UserIdService } from '@lib/scripts/types';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP } from '@providers/AnalyticsProvider/postHog/config';
import { PostHogClient } from '@providers/AnalyticsProvider/postHog/PostHogClient';
import { userIdServiceMock } from '@src/utils/mocks/test-helpers';
import posthog from 'posthog-js';

jest.mock('posthog-js');

describe('PostHogClient', () => {
  const publicPosthogHost = 'test';
  const chain = Wallet.Cardano.ChainIds.Preprod;
  const userId = 'userId';
  const mockUserIdService: UserIdService = {
    ...userIdServiceMock,
    getId: () => Promise.resolve(userId)
  };

  it('should initialize posthog on construction', () => {
    // eslint-disable-next-line no-new
    new PostHogClient(chain, mockUserIdService, publicPosthogHost);
    expect(posthog.init).toHaveBeenCalledWith(
      expect.stringContaining(DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkMagic]),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        api_host: publicPosthogHost
      })
    );
  });

  it('should send page navigation events with distinct id', async () => {
    const client = new PostHogClient(chain, mockUserIdService, publicPosthogHost);
    await client.sendPageNavigationEvent();
    expect(posthog.capture).toHaveBeenCalledWith(
      '$pageview',
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        distinct_id: userId
      })
    );
  });

  it('should send events with distinct id', async () => {
    const client = new PostHogClient(chain, mockUserIdService, publicPosthogHost);
    const event = PostHogAction.OnboardingCreateClick;
    const extraProps = { some: 'prop', another: 'test' };

    await client.sendEvent(event, extraProps);

    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        distinct_id: userId,
        ...extraProps
      })
    );
  });

  it('should be possible to change the chain', () => {
    const previewChain = Wallet.Cardano.ChainIds.Preview;
    const client = new PostHogClient(chain, mockUserIdService, publicPosthogHost);
    expect(posthog.set_config).not.toHaveBeenCalled();
    client.setChain(previewChain);
    expect(posthog.set_config).toHaveBeenCalledWith(
      expect.objectContaining({
        token: DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[previewChain.networkMagic]
      })
    );
  });
});
