import { Wallet } from '@lace/cardano';
import dayjs from 'dayjs';
import { UserIdService } from '@lib/scripts/types';
import { ExtensionViews, PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP } from '@providers/AnalyticsProvider/postHog/config';
import { PostHogClient } from '@providers/AnalyticsProvider/postHog/PostHogClient';
import { userIdServiceMock } from '@src/utils/mocks/test-helpers';
import posthog from 'posthog-js';

const mockSentDate = new Date('2023-07-25T15:31:10.275000+00:00');

jest.mock('posthog-js');

describe('PostHogClient', () => {
  const publicPosthogHost = 'test';
  const chain = Wallet.Cardano.ChainIds.Preprod;
  const userId = 'userId';
  const mockUserIdService: UserIdService = {
    ...userIdServiceMock
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize posthog on construction', () => {
    // eslint-disable-next-line no-new
    new PostHogClient(chain, mockUserIdService, undefined, publicPosthogHost);
    expect(posthog.init).toHaveBeenCalledWith(
      expect.stringContaining(DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkMagic]),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        api_host: publicPosthogHost
      })
    );
  });

  it('should send page navigation events with distinct id and view = extended as default', async () => {
    const client = new PostHogClient(chain, mockUserIdService, undefined, publicPosthogHost);
    await client.sendPageNavigationEvent();
    expect(posthog.capture).toHaveBeenCalledWith(
      '$pageview',
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        distinct_id: userId,
        view: 'extended'
      })
    );
  });

  it('should send events with distinct id', async () => {
    const client = new PostHogClient(chain, mockUserIdService, undefined, publicPosthogHost);
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
    const client = new PostHogClient(chain, mockUserIdService, undefined, publicPosthogHost);
    expect(posthog.set_config).not.toHaveBeenCalled();
    client.setChain(previewChain);
    expect(posthog.set_config).toHaveBeenCalledWith(
      expect.objectContaining({
        token: DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[previewChain.networkMagic]
      })
    );
  });

  it('should send events with property view = popup', async () => {
    const client = new PostHogClient(chain, mockUserIdService, ExtensionViews.Popup, publicPosthogHost);
    const event = PostHogAction.OnboardingCreateClick;

    await client.sendEvent(event);

    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        view: 'popup'
      })
    );
  });

  it('should send events with property view = extended', async () => {
    const client = new PostHogClient(chain, mockUserIdService, ExtensionViews.Extended, publicPosthogHost);
    const event = PostHogAction.OnboardingCreateClick;

    await client.sendEvent(event);

    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        view: 'extended'
      })
    );
  });

  it('should send events with property sent at local', async () => {
    jest.useFakeTimers().setSystemTime(mockSentDate);
    const client = new PostHogClient(chain, mockUserIdService, ExtensionViews.Extended, publicPosthogHost);
    const event = PostHogAction.OnboardingCreateClick;

    await client.sendEvent(event);

    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        sent_at_local: dayjs(mockSentDate).format()
      })
    );
  });

  it('should not send alias event if one of alias_id or distinct_id metadata is not defined', async () => {
    const client = new PostHogClient(chain, mockUserIdService, ExtensionViews.Extended, publicPosthogHost);
    await client.sendAliasEvent();
    expect(posthog.alias).not.toHaveBeenCalled();
  });
});
