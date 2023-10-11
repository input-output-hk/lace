/* eslint-disable @typescript-eslint/no-explicit-any */
import { userIdServiceMock } from '@src/utils/mocks/test-helpers';
import { Wallet } from '@lace/cardano';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import * as userIdService from '@providers/AnalyticsProvider/getUserIdService';
import { MatomoClient } from '@providers/AnalyticsProvider/matomo';
import { PostHogClient } from '@providers/PostHogClientProvider/client';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsTracker,
  EnhancedAnalyticsOptInStatus,
  PostHogAction,
  ExtensionViews,
  UserTrackingType
} from '.';
import { UserIdService } from '@lib/scripts/types';
import { BehaviorSubject } from 'rxjs';

jest.mock('../matomo/MatomoClient');
jest.mock('@providers/PostHogClientProvider/client');
jest.mock('../getUserIdService', () => ({
  getUserIdService: jest.fn().mockReturnValue(userIdServiceMock)
}));

const mockBackgroundServiceUtils = {
  getBackgroundStorage: jest.fn(),
  setBackgroundStorage: jest.fn()
};

const getPostHogClient = (view = ExtensionViews.Extended) =>
  new PostHogClient(
    Wallet.Cardano.ChainIds.Preprod,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userIdServiceMock as any,
    mockBackgroundServiceUtils,
    view
  );

describe('AnalyticsTracker', () => {
  const preprodChain = Wallet.Cardano.ChainIds.Preprod;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('construction', () => {
    it('should setup both clients with the user id service', () => {
      // eslint-disable-next-line no-new
      new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      expect(getUserIdService).toHaveBeenCalledTimes(1);
      expect(MatomoClient).toHaveBeenCalledWith(preprodChain, userIdServiceMock);
      expect(PostHogClient).toHaveBeenCalledWith(
        preprodChain,
        userIdServiceMock,
        mockBackgroundServiceUtils,
        ExtensionViews.Extended
      );
    });
    it('should only setup matomo client if posthog is disabled', () => {
      // eslint-disable-next-line no-new
      new AnalyticsTracker({ chain: preprodChain });
      expect(getUserIdService).toHaveBeenCalledTimes(1);
      expect(MatomoClient).toHaveBeenCalledWith(preprodChain, userIdServiceMock);
      expect(PostHogClient).not.toHaveBeenCalled();
    });
    it('should not setup anything if analytics are disabled', () => {
      // eslint-disable-next-line no-new
      new AnalyticsTracker({ chain: preprodChain, analyticsDisabled: true });
      expect(getUserIdService).not.toHaveBeenCalled();
      expect(MatomoClient).not.toHaveBeenCalled();
      expect(PostHogClient).not.toHaveBeenCalled();
    });
    it('should setup Post Hog client with view = popup', () => {
      // eslint-disable-next-line no-new
      new AnalyticsTracker({
        chain: preprodChain,
        view: ExtensionViews.Popup,
        postHogClient: getPostHogClient(ExtensionViews.Popup)
      });
      expect(PostHogClient).toHaveBeenCalledWith(
        preprodChain,
        userIdServiceMock,
        mockBackgroundServiceUtils,
        ExtensionViews.Popup
      );
    });
    it('should setup Post Hog client with view = extended', () => {
      // eslint-disable-next-line no-new
      new AnalyticsTracker({
        chain: preprodChain,
        view: ExtensionViews.Extended,
        postHogClient: getPostHogClient()
      });
      expect(PostHogClient).toHaveBeenCalledWith(
        preprodChain,
        userIdServiceMock,
        mockBackgroundServiceUtils,
        ExtensionViews.Extended
      );
    });
  });

  describe('setOptedInForEnhancedAnalytics', () => {
    it('should make the user id persistent if user opted-in', async () => {
      const tracker = new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      await tracker.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
      expect(userIdServiceMock.makePersistent).toHaveBeenCalledTimes(1);
    });
    it('should make the user id temporary if user opted-out', async () => {
      const tracker = new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      await tracker.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedOut);
      expect(userIdServiceMock.makeTemporary).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendPageNavigationEvent', () => {
    it('should use the posthog client to send a page navigation event', async () => {
      const tracker = new AnalyticsTracker({
        chain: preprodChain,
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendPageNavigationEvent();
      expect(mockedPostHogClient.sendPageNavigationEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendEvent', () => {
    it('should use the matomo client to send an event', async () => {
      const tracker = new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      const mockedMatomoClient = (MatomoClient as jest.Mock<MatomoClient>).mock.instances[0];
      const event = {
        category: MatomoEventCategories.WALLET_RESTORE,
        action: MatomoEventActions.CLICK_EVENT,
        name: 'test'
      };
      await tracker.sendEventToMatomo(event);
      expect(mockedMatomoClient.sendEvent).toHaveBeenCalledTimes(1);
      expect(mockedMatomoClient.sendEvent).toHaveBeenCalledWith(event);
      expect(userIdServiceMock.extendLifespan).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendEventToPostHog', () => {
    it('should use the posthog client to send an event', async () => {
      const tracker = new AnalyticsTracker({
        chain: preprodChain,
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      const event = PostHogAction.OnboardingCreateClick;
      await tracker.sendEventToPostHog(event);
      expect(mockedPostHogClient.sendEvent).toHaveBeenCalledWith(event, {});
      expect(mockedPostHogClient.sendEvent).toHaveBeenCalledTimes(1);
      expect(userIdServiceMock.extendLifespan).toHaveBeenCalledTimes(1);
    });
  });

  describe('excluded events', () => {
    it('should ommit sending onboarding | new wallet events', async () => {
      const tracker = new AnalyticsTracker({
        chain: preprodChain,
        isPostHogEnabled: true,
        excludedEvents: 'onboarding | new wallet',
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendEventToPostHog(PostHogAction.OnboardingCreateAnalyticsAgreeClick);
      await tracker.sendEventToPostHog(PostHogAction.OnboardingCreateClick);
      expect(mockedPostHogClient.sendEvent).not.toHaveBeenCalled();
    });

    it('should ommit sending excluded events', async () => {
      const tracker = new AnalyticsTracker({
        chain: preprodChain,
        isPostHogEnabled: true,
        excludedEvents: 'onboarding | new wallet',
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendEventToPostHog(PostHogAction.OnboardingCreateAnalyticsAgreeClick);
      await tracker.sendEventToPostHog(PostHogAction.OnboardingRestoreDoneGoToWallet);
      expect(mockedPostHogClient.sendEvent).toHaveBeenCalledTimes(1);
    });

    it('should send all events', async () => {
      const tracker = new AnalyticsTracker({
        chain: preprodChain,
        isPostHogEnabled: true,
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendEventToPostHog(PostHogAction.OnboardingCreateAnalyticsAgreeClick);
      expect(mockedPostHogClient.sendEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('setChain', () => {
    it('should set the chain on both clients', async () => {
      const tracker = new AnalyticsTracker({
        chain: preprodChain,
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      const mockedMatomoClient = (MatomoClient as jest.Mock<MatomoClient>).mock.instances[0];
      const previewChain = Wallet.Cardano.ChainIds.Preview;
      await tracker.setChain(previewChain);
      expect(mockedPostHogClient.setChain).toHaveBeenCalledWith(previewChain);
      expect(mockedMatomoClient.setChain).toHaveBeenCalledWith(previewChain);
    });
  });

  describe('avoid event for opted out users', () => {
    let spy: jest.SpyInstance<UserIdService, []>;
    beforeAll(() => {
      spy = jest.spyOn(userIdService, 'getUserIdService');
      spy.mockReturnValue({
        ...userIdServiceMock,
        userTrackingType$: new BehaviorSubject(UserTrackingType.Basic)
      });
    });

    afterAll(() => {
      spy.mockReset();
    });

    it('should not call Post Hog sendPageNavigationEvent for opted out user', async () => {
      const tracker = new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      spy.getMockImplementation()().userTrackingType$.next(UserTrackingType.Basic);
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendPageNavigationEvent();
      expect(mockedPostHogClient.sendPageNavigationEvent).not.toHaveBeenCalled();
    });
    it('should not call Post Hog sentEvent for opted out user', async () => {
      const tracker = new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      spy.getMockImplementation()().userTrackingType$.next(UserTrackingType.Basic);
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      const event = PostHogAction.OnboardingCreateClick;
      await tracker.sendEventToPostHog(event);
      expect(mockedPostHogClient.sendEvent).not.toHaveBeenCalled();
      expect(userIdServiceMock.extendLifespan).not.toHaveBeenCalled();
    });
    it('should not call Post Hog sendAliasEvent for opted out user', async () => {
      const tracker = new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      spy.getMockImplementation()().userTrackingType$.next(UserTrackingType.Basic);
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendAliasEvent();
      expect(mockedPostHogClient.sendAliasEvent).not.toHaveBeenCalled();
    });
    it('should not call Matomo sentEvent for opted out user', async () => {
      const tracker = new AnalyticsTracker({ chain: preprodChain, postHogClient: getPostHogClient() });
      spy.getMockImplementation()().userTrackingType$.next(UserTrackingType.Basic);
      const mockedMatomoClient = (MatomoClient as jest.Mock<MatomoClient>).mock.instances[0];
      const event = {
        category: MatomoEventCategories.WALLET_RESTORE,
        action: MatomoEventActions.CLICK_EVENT,
        name: 'test'
      };
      await tracker.sendEventToMatomo(event);
      expect(mockedMatomoClient.sendEvent).not.toHaveBeenCalled();
    });
  });
});
