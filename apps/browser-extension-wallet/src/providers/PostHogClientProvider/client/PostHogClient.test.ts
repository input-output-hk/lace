import { Wallet } from '@lace/cardano';
import dayjs from 'dayjs';
import { UserIdService } from '@lib/scripts/types';
import { ExtensionViews, PostHogAction, UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';
import { DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP } from '@providers/PostHogClientProvider/client/config';
import { PostHogClient } from './PostHogClient';
import { userIdServiceMock } from '@src/utils/mocks/test-helpers';
import posthog from 'posthog-js';
import { BehaviorSubject } from 'rxjs';
import { waitFor } from '@testing-library/react';

const mockSentDate = new Date('2023-07-25T15:31:10.275000+00:00');
const mockBackgroundStorageUtil = { getBackgroundStorage: jest.fn(), setBackgroundStorage: jest.fn() };
const mockUserTrackingType$ = new BehaviorSubject<UserTrackingType>(UserTrackingType.Basic);

jest.mock('posthog-js');

describe('PostHogClient', () => {
  const publicPostHogHost = 'test';
  const chain = Wallet.Cardano.ChainIds.Preprod;
  const userId = 'userId';
  const mockUserIdService: UserIdService = {
    ...userIdServiceMock,
    userTrackingType$: mockUserTrackingType$,
    getUserId: jest.fn().mockImplementation(() => Promise.resolve(userId))
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize posthog on construction', async () => {
    // eslint-disable-next-line no-new
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      publicPostHogHost
    });

    await waitFor(() => expect(client).toBeDefined());
    expect(posthog.init).toHaveBeenCalledWith(
      expect.stringContaining(DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[chain.networkMagic]),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        api_host: publicPostHogHost
      })
    );
  });

  it('should send page navigation events with distinct id and view = extended as default', async () => {
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      publicPostHogHost
    });
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
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      publicPostHogHost
    });
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
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      publicPostHogHost
    });
    expect(posthog.set_config).not.toHaveBeenCalled();
    client.setChain(previewChain);
    expect(posthog.set_config).toHaveBeenCalledWith(
      expect.objectContaining({
        token: DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP[previewChain.networkMagic]
      })
    );
  });

  it('should send events with property view = popup', async () => {
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Popup,
      publicPostHogHost
    });
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
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Extended,
      publicPostHogHost
    });
    const event = PostHogAction.OnboardingCreateClick;

    await client.sendEvent(event);

    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        view: 'extended'
      })
    );
  });

  it('should send events with property lace_version = 1.2.3', async () => {
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Extended,
      publicPostHogHost,
      laceVersion: '1.2.3'
    });
    const event = PostHogAction.OnboardingCreateClick;

    await client.sendEvent(event);

    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        lace_version: '1.2.3'
      })
    );
  });

  it('should send events with property sent at local', async () => {
    jest.useFakeTimers().setSystemTime(mockSentDate);
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Extended,
      publicPostHogHost
    });
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

  it('should send alias event if alias and id properties are defined', async () => {
    const mockAliasProperties = { id: 'walletBasedId', alias: 'aliasId' };
    const mockGetAliasProperties = jest.fn().mockReturnValue(mockAliasProperties);
    const client = new PostHogClient({
      chain,
      userIdService: { ...mockUserIdService, getAliasProperties: mockGetAliasProperties },
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Extended,
      publicPostHogHost
    });
    await client.sendAliasEvent();
    expect(posthog.alias).toHaveBeenCalledWith(mockAliasProperties.alias, mockAliasProperties.id);
  });

  it('should not send alias event if alias or id properties are not defined', async () => {
    const mockGetAliasProperties = jest.fn().mockReturnValue({});
    const client = new PostHogClient({
      chain,
      userIdService: { ...mockUserIdService, getAliasProperties: mockGetAliasProperties },
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Extended,
      publicPostHogHost
    });
    await client.sendAliasEvent();
    expect(posthog.alias).not.toHaveBeenCalled();
  });

  it('should return user_tracking_type enhanced', async () => {
    const event = PostHogAction.OnboardingCreateClick;
    const client = new PostHogClient({
      chain,
      userIdService: mockUserIdService,
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Extended,
      publicPostHogHost
    });
    mockUserIdService.userTrackingType$.next(UserTrackingType.Enhanced);
    await client.sendEvent(event);
    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        $set: {
          // eslint-disable-next-line camelcase
          user_tracking_type: 'enhanced'
        }
      })
    );
    client.shutdown();
  });

  it('should return user_tracking_type basic after calling twice', async () => {
    const event = PostHogAction.OnboardingCreateClick;
    const tracking = new BehaviorSubject(UserTrackingType.Enhanced);
    const client = new PostHogClient({
      chain,
      userIdService: { ...mockUserIdService, userTrackingType$: tracking },
      backgroundServiceUtils: mockBackgroundStorageUtil,
      view: ExtensionViews.Extended,
      publicPostHogHost
    });

    await client.sendEvent(event);
    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        $set: {
          // eslint-disable-next-line camelcase
          user_tracking_type: 'enhanced'
        }
      })
    );
    tracking.next(UserTrackingType.Basic);
    await client.sendEvent(event);
    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        $set: {
          // eslint-disable-next-line camelcase
          user_tracking_type: 'basic'
        }
      })
    );
    client.shutdown();
  });
});
