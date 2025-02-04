import { Wallet } from '@lace/cardano';
import dayjs from 'dayjs';
import { UserId } from '@lib/scripts/types';
import { ExtensionViews, PostHogAction, UserTrackingType } from '@providers/AnalyticsProvider/analyticsTracker';
import {
  DEV_POSTHOG_TOKEN,
  featureFlagPayloadsInitialValue,
  featureFlagsByNetworkInitialValue
} from '@providers/PostHogClientProvider/client/config';
import { PostHogClient } from './PostHogClient';
import { userIdServiceMock } from '@src/utils/mocks/test-helpers';
import posthog from 'posthog-js';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { setTimeout } from 'node:timers/promises';
import { ExperimentName, FeatureFlagsByNetwork } from '@lib/scripts/types/feature-flags';

const mockSentDate = new Date('2023-07-25T15:31:10.275000+00:00');
const mockBackgroundStorageUtil = {
  getBackgroundStorage: jest.fn(() => Promise.resolve({})),
  setBackgroundStorage: jest.fn()
};
const mockUserId$ = new ReplaySubject<UserId>();

jest.mock('posthog-js');

describe('PostHogClient', () => {
  const posthogHost = 'test';
  const chain = Wallet.Cardano.ChainIds.Preprod;
  const userId = 'userId';
  const mockUserIdService = {
    ...userIdServiceMock,
    userId$: mockUserId$,
    getUserId: jest.fn().mockImplementation(() => Promise.resolve(userId))
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize posthog on construction', async () => {
    // eslint-disable-next-line no-new
    const client = new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);

    await waitFor(() => expect(client).toBeDefined());
    expect(posthog.init).toHaveBeenCalledWith(
      expect.stringContaining(DEV_POSTHOG_TOKEN),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        api_host: posthogHost
      })
    );
  });

  it('should send page navigation events with distinct id and view = extended as default', async () => {
    const client = new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
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

  it('should send session started event', async () => {
    const client = new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
    await client.sendSessionStartEvent();
    expect(posthog.capture).toHaveBeenCalledWith(
      PostHogAction.WalletSessionStartPageview,
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        distinct_id: userId,
        view: 'extended'
      })
    );
  });

  it('should send events with distinct id', async () => {
    const client = new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
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
    const client = new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
    expect(posthog.set_config).not.toHaveBeenCalled();
    client.setChain(previewChain);
    expect(posthog.set_config).toHaveBeenCalledWith(
      expect.objectContaining({
        token: DEV_POSTHOG_TOKEN
      })
    );
  });

  it('should send events with property view = popup', async () => {
    const client = new PostHogClient(
      chain,
      mockUserIdService,
      mockBackgroundStorageUtil,
      ExtensionViews.Popup,
      posthogHost
    );
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
    const client = new PostHogClient(
      chain,
      mockUserIdService,
      mockBackgroundStorageUtil,
      ExtensionViews.Extended,
      posthogHost
    );
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
    const client = new PostHogClient(
      chain,
      mockUserIdService,
      mockBackgroundStorageUtil,
      ExtensionViews.Extended,
      posthogHost
    );
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
    const client = new PostHogClient(
      chain,
      { ...mockUserIdService, getAliasProperties: mockGetAliasProperties },
      mockBackgroundStorageUtil,
      ExtensionViews.Extended,
      posthogHost
    );
    await client.sendAliasEvent();
    expect(posthog.alias).toHaveBeenCalledWith(mockAliasProperties.alias, mockAliasProperties.id);
  });

  it('should not send alias event if alias or id properties are not defined', async () => {
    const mockGetAliasProperties = jest.fn().mockReturnValue({});
    const client = new PostHogClient(
      chain,
      { ...mockUserIdService, getAliasProperties: mockGetAliasProperties },
      mockBackgroundStorageUtil,
      ExtensionViews.Extended,
      posthogHost
    );
    await client.sendAliasEvent();
    expect(posthog.alias).not.toHaveBeenCalled();
  });

  it('should return user_tracking_type enhanced', async () => {
    const event = PostHogAction.OnboardingCreateClick;
    const client = new PostHogClient(
      chain,
      mockUserIdService,
      mockBackgroundStorageUtil,
      ExtensionViews.Extended,
      posthogHost
    );
    mockUserIdService.userId$.next({
      type: UserTrackingType.Enhanced,
      id: userId
    });

    await setTimeout(0);
    await client.sendEvent(event);
    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        $set: {
          // eslint-disable-next-line camelcase
          opted_in_beta: false,
          // eslint-disable-next-line camelcase
          user_tracking_type: 'enhanced'
        }
      })
    );
    client.shutdown();
  });

  it('should return user_tracking_type basic after calling twice', async () => {
    const event = PostHogAction.OnboardingCreateClick;
    const tracking = new BehaviorSubject<UserId>({
      type: UserTrackingType.Enhanced,
      id: userId
    });
    const client = new PostHogClient(
      chain,
      { ...mockUserIdService, userId$: tracking },
      mockBackgroundStorageUtil,
      ExtensionViews.Extended,
      posthogHost
    );

    await setTimeout(0);
    await client.sendEvent(event);
    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        $set: {
          // eslint-disable-next-line camelcase
          opted_in_beta: false,
          // eslint-disable-next-line camelcase
          user_tracking_type: 'enhanced'
        }
      })
    );
    tracking.next({
      type: UserTrackingType.Basic,
      id: userId
    });
    await client.sendEvent(event);
    expect(posthog.capture).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        $set: {
          // eslint-disable-next-line camelcase
          opted_in_beta: false,
          // eslint-disable-next-line camelcase
          user_tracking_type: 'basic'
        }
      })
    );
    client.shutdown();
  });

  describe('Feature Flags', () => {
    const initialFeatureFlags = {
      [ExperimentName.SHARED_WALLETS]: true
    };
    const initialFeatureFlagPayloads = {
      [ExperimentName.SHARED_WALLETS]: JSON.stringify({
        allowedNetworks: ['mainnet']
      })
    };

    it('initializes posthog with FFs and payloads from from background storage', async () => {
      mockBackgroundStorageUtil.getBackgroundStorage.mockResolvedValueOnce({
        initialPosthogFeatureFlags: initialFeatureFlags,
        initialPosthogFeatureFlagPayloads: initialFeatureFlagPayloads
      });

      // eslint-disable-next-line no-new
      new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
      await setTimeout(0);

      expect(posthog.init).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          bootstrap: expect.objectContaining({
            featureFlags: initialFeatureFlags,
            featureFlagPayloads: initialFeatureFlagPayloads
          })
        })
      );
    });

    it('notifies when initialisation completed', async () => {
      const client = new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
      await setTimeout(0);

      expect(client.hasPostHogInitialized$.value).toEqual(true);
    });

    describe('when received feature flags from posthog', () => {
      const expectedFeatureFlags: FeatureFlagsByNetwork = {
        ...featureFlagsByNetworkInitialValue,
        [Wallet.Cardano.NetworkMagics.Mainnet]: {
          ...featureFlagsByNetworkInitialValue[Wallet.Cardano.NetworkMagics.Mainnet],
          ...initialFeatureFlags
        }
      };
      const expectedFeatureFlagPayloads = {
        ...featureFlagPayloadsInitialValue,
        [ExperimentName.SHARED_WALLETS]: JSON.parse(initialFeatureFlagPayloads[ExperimentName.SHARED_WALLETS])
      };

      beforeEach(() => {
        (posthog.featureFlags.getFlagPayloads as jest.Mock).mockReturnValue(initialFeatureFlagPayloads);
        (posthog.onFeatureFlags as jest.Mock).mockImplementation((cb) => cb('ignored', initialFeatureFlags));
      });

      it('consumes received FFs and payloads', async () => {
        const client = new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
        await setTimeout(0);

        expect(client.featureFlagsByNetwork).toEqual(expectedFeatureFlags);
        expect(client.featureFlagPayloads).toEqual(expectedFeatureFlagPayloads);
      });

      it('stores received FFs in background storage', async () => {
        // eslint-disable-next-line no-new
        new PostHogClient(chain, mockUserIdService, mockBackgroundStorageUtil, undefined, posthogHost);
        await setTimeout(0);

        expect(mockBackgroundStorageUtil.setBackgroundStorage).toHaveBeenCalledWith({
          featureFlags: expectedFeatureFlags,
          featureFlagPayloads: expectedFeatureFlagPayloads,
          initialPosthogFeatureFlags: initialFeatureFlags,
          initialPosthogFeatureFlagPayloads: initialFeatureFlagPayloads
        });
      });
    });
  });
});
