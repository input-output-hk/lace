import type { ReactNode } from 'react';

import { connectActivityChannel } from '@lace-contract/app-lock';
import throttle from 'lodash/fp/throttle';
import React, { useMemo } from 'react';
import { View } from 'react-native';

export const ActivityDetector = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const { reportActivity } = useMemo(() => connectActivityChannel(), []);
  const handleTouchStart = useMemo(
    () =>
      throttle(1000, () => {
        void reportActivity();
      }),
    [reportActivity],
  );
  return (
    <View onTouchStart={handleTouchStart} style={{ flex: 1 }}>
      {children}
    </View>
  );
};
