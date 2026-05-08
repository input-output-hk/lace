import {
  DEFAULT_INACTIVITY_TIMEOUT_MS_MOBILE,
  type ActivityChannel,
  type ReportActivityChannel,
} from '@lace-contract/app-lock';
import { BehaviorSubject } from 'rxjs';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const activityChannel$ = new BehaviorSubject<ReportActivityChannel | null>(
  null,
);

const exposeActivityChannel: ActivityChannel['exposeActivityChannel'] =
  channel => {
    activityChannel$.next(channel);
  };

const consumeActivityChannel: ActivityChannel['consumeActivityChannel'] =
  () => {
    if (!activityChannel$.value) {
      throw new Error('Activity Channel not available');
    }
    return activityChannel$.value;
  };

const activityChannelMobile: ContextualLaceInit<
  ActivityChannel,
  AvailableAddons
> = () => ({
  defaultInactivityTimeoutMs: DEFAULT_INACTIVITY_TIMEOUT_MS_MOBILE,
  exposeActivityChannel,
  consumeActivityChannel,
});

export default activityChannelMobile;
