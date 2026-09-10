/**
 * NotificationCard render cost: the row the notifications page renders per
 * notification (headerTitle / headerIcon / bodyTitle / isRead). 20 rows ≈ a
 * loaded inbox page.
 */
import React from 'react';
import { View } from 'react-native';
import { measureRenders } from 'reassure';

import { NotificationCard } from '../src';

import { makeNotificationCardProps } from './fixtures/notifications';
import { expectMounted, PerfProviders } from './testUtils';

const ROWS = 20;
const notifications = makeNotificationCardProps(ROWS);

test('NotificationCard × 20 — notifications page, initial render', async () => {
  await measureRenders(
    <View>
      {notifications.map(notification => (
        <NotificationCard key={notification.testID} {...notification} />
      ))}
    </View>,
    { scenario: expectMounted('perf-notification-0'), wrapper: PerfProviders },
  );
});
