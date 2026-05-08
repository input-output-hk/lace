import type { ReactNode } from 'react';

import { connectActivityChannel } from '@lace-contract/app-lock';
import { createContextualUseLoadModules } from '@lace-lib/util-render';
import throttle from 'lodash/fp/throttle';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { AvailableAddons } from '.';

const useLoadModules = createContextualUseLoadModules<AvailableAddons>();

export const ActivityDetector = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const [activityChannel] = useLoadModules('addons.loadActivityChannel') || [];

  const handleTouchStart = useMemo(
    () =>
      throttle(1000, () => {
        if (!activityChannel) return;
        try {
          const { reportActivity } = connectActivityChannel({
            consumeChannel: activityChannel.consumeActivityChannel,
          });
          void reportActivity();
        } catch {
          return;
        }
      }),
    [activityChannel],
  );
  return (
    <View onTouchStart={handleTouchStart} style={{ flex: 1 }}>
      {children}
    </View>
  );
};
