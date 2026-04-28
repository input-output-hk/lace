import type { ReactNode } from 'react';

import { connectActivityChannel } from '@lace-contract/app-lock';
import React, { useEffect, useMemo } from 'react';
import { fromEvent, merge, throttleTime } from 'rxjs';

import { useLoadModules } from './hooks';

export const registerActivityListener = (reportActivity: () => void) => {
  const subscription = merge(
    fromEvent(document, 'click', { capture: true }),
    fromEvent(document, 'keydown', { capture: true }),
    fromEvent(document, 'mousemove', { capture: true }),
    fromEvent(document, 'scroll', { capture: true }),
  )
    .pipe(throttleTime(1000))
    .subscribe(() => {
      reportActivity();
    });

  return () => {
    subscription.unsubscribe();
  };
};

export const ActivityDetector = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const [activityChannelExtension] =
    useLoadModules('addons.loadActivityChannelExtension') || [];

  const activityChannel = useMemo(() => {
    if (!activityChannelExtension) return null;
    return connectActivityChannel({
      consumeChannel: activityChannelExtension.consumeActivityChannel,
    });
  }, [activityChannelExtension]);

  useEffect(
    () =>
      registerActivityListener(() => {
        void activityChannel?.reportActivity();
      }),
    [activityChannel],
  );

  return <>{children}</>;
};
