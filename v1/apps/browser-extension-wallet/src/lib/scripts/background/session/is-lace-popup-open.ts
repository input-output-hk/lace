import { createBackgroundMessenger } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { TRACK_POPUP_CHANNEL } from '@src/utils/constants';
import { distinctUntilChanged, map, share } from 'rxjs';
import { runtime } from 'webextension-polyfill';

const channel = createBackgroundMessenger({ logger, runtime }).getChannel(TRACK_POPUP_CHANNEL);
export const isLacePopupOpen$ = channel.ports$.pipe(
  map((ports) => ports.size > 0),
  distinctUntilChanged(),
  share()
);
