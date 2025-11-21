import { Subject, tap } from 'rxjs';
import { TrackerSubject } from '@cardano-sdk/util-rxjs';
import { logger } from '@lace/common';
import { createUserSessionTracker } from './user-session-tracker';
import { isLacePopupOpen$ } from './is-lace-popup-open';
import { isLaceTabActive$ } from './is-lace-tab-active';
import { SESSION_TIMEOUT } from '../config';

export const dAppConnectorActivity$ = new Subject<void>();

export const pollController$ = new TrackerSubject(
  createUserSessionTracker(isLacePopupOpen$, isLaceTabActive$, dAppConnectorActivity$, SESSION_TIMEOUT).pipe(
    tap((isActive) => logger.debug('Session active:', isActive))
  )
);
