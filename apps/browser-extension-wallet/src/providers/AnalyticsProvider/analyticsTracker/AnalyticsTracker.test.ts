/* eslint-disable @typescript-eslint/no-explicit-any */
import { userIdServiceMock } from '@src/utils/mocks/test-helpers';
import { Wallet } from '@lace/cardano';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import * as userIdService from '@providers/AnalyticsProvider/getUserIdService';
import { PostHogClient } from '@providers/PostHogClientProvider/client';
import { AnalyticsTracker, EnhancedAnalyticsOptInStatus, PostHogAction, ExtensionViews, UserTrackingType } from '.';
import { UserId, UserIdService } from '@lib/scripts/types';
import { ReplaySubject } from 'rxjs';

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
      new AnalyticsTracker({ postHogClient: getPostHogClient() });
      expect(getUserIdService).toHaveBeenCalledTimes(1);
      expect(PostHogClient).toHaveBeenCalledWith(
        preprodChain,
        userIdServiceMock,
        mockBackgroundServiceUtils,
        ExtensionViews.Extended
      );
    });
    it('should not setup anything if analytics are disabled', () => {
      // eslint-disable-next-line no-new
      new AnalyticsTracker({ analyticsDisabled: true });
      expect(getUserIdService).not.toHaveBeenCalled();
      expect(PostHogClient).not.toHaveBeenCalled();
    });
    it('should setup Post Hog client with view = popup', () => {
      // eslint-disable-next-line no-new
      new AnalyticsTracker({
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
      const tracker = new AnalyticsTracker({ postHogClient: getPostHogClient() });
      await tracker.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedIn);
      expect(userIdServiceMock.makePersistent).toHaveBeenCalledTimes(1);
    });
    it('should make the user id temporary if user opted-out', async () => {
      const tracker = new AnalyticsTracker({ postHogClient: getPostHogClient() });
      await tracker.setOptedInForEnhancedAnalytics(EnhancedAnalyticsOptInStatus.OptedOut);
      expect(userIdServiceMock.makeTemporary).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendPageNavigationEvent', () => {
    it('should use the posthog client to send a page navigation event', async () => {
      const tracker = new AnalyticsTracker({
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendPageNavigationEvent();
      expect(mockedPostHogClient.sendPageNavigationEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendEventToPostHog', () => {
    it('should use the posthog client to send an event', async () => {
      const tracker = new AnalyticsTracker({
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

  describe('posthog sendSessionStartEvent', () => {
    it('should send start session event', async () => {
      const tracker = new AnalyticsTracker({
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      const event = PostHogAction.OnboardingCreateClick;
      await tracker.sendEventToPostHog(event);
      expect(mockedPostHogClient.sendSessionStartEvent).toHaveBeenCalled();
      expect(mockedPostHogClient.sendEvent).toHaveBeenCalledWith(event, {});
    });
  });

  describe('excluded events', () => {
    it('should ommit sending onboarding | new wallet events', async () => {
      const tracker = new AnalyticsTracker({
        isPostHogEnabled: true,
        excludedEvents: 'onboarding | new wallet',
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendEventToPostHog(PostHogAction.OnboardingAnalyticsAgreeClick);
      await tracker.sendEventToPostHog(PostHogAction.OnboardingCreateClick);
      expect(mockedPostHogClient.sendEvent).not.toHaveBeenCalled();
    });

    it('should ommit sending excluded events', async () => {
      const tracker = new AnalyticsTracker({
        isPostHogEnabled: true,
        excludedEvents: 'onboarding | new wallet',
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendEventToPostHog(PostHogAction.OnboardingAnalyticsAgreeClick);
      await tracker.sendEventToPostHog(PostHogAction.OnboardingRestoreEnterWalletClick);
      expect(mockedPostHogClient.sendEvent).toHaveBeenCalledTimes(1);
    });

    it('should send all events', async () => {
      const tracker = new AnalyticsTracker({
        isPostHogEnabled: true,
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendEventToPostHog(PostHogAction.OnboardingAnalyticsAgreeClick);
      expect(mockedPostHogClient.sendEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('setChain', () => {
    it('should set the chain on both clients', async () => {
      const tracker = new AnalyticsTracker({
        postHogClient: getPostHogClient()
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      const previewChain = Wallet.Cardano.ChainIds.Preview;
      await tracker.setChain(previewChain);
      expect(mockedPostHogClient.setChain).toHaveBeenCalledWith(previewChain);
    });
  });

  describe('avoid event for opted out users', () => {
    let spy: jest.SpyInstance<UserIdService, []>;
    let userId$: ReplaySubject<UserId>;
    beforeAll(() => {
      spy = jest.spyOn(userIdService, 'getUserIdService');
      userId$ = new ReplaySubject();
      spy.mockReturnValue({
        ...userIdServiceMock,
        userId$
      });
    });

    afterAll(() => {
      spy.mockReset();
    });

    it('should not call Post Hog sendPageNavigationEvent for opted out user', async () => {
      const tracker = new AnalyticsTracker({ postHogClient: getPostHogClient() });
      userId$.next({
        type: UserTrackingType.Basic,
        id: 'userid'
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendPageNavigationEvent();
      expect(mockedPostHogClient.sendPageNavigationEvent).not.toHaveBeenCalled();
    });
    it('should not call Post Hog sentEvent for opted out user', async () => {
      const tracker = new AnalyticsTracker({ postHogClient: getPostHogClient() });
      userId$.next({
        type: UserTrackingType.Basic,
        id: 'userid'
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      const event = PostHogAction.OnboardingCreateClick;
      await tracker.sendEventToPostHog(event);
      expect(mockedPostHogClient.sendEvent).not.toHaveBeenCalled();
      expect(userIdServiceMock.extendLifespan).not.toHaveBeenCalled();
    });
    it('should not call Post Hog sendAliasEvent for opted out user', async () => {
      const tracker = new AnalyticsTracker({ postHogClient: getPostHogClient() });
      userId$.next({
        type: UserTrackingType.Basic,
        id: 'userid'
      });
      const mockedPostHogClient = (PostHogClient as any).mock.instances[0];
      await tracker.sendAliasEvent();
      expect(mockedPostHogClient.sendAliasEvent).not.toHaveBeenCalled();
    });
  });
});
