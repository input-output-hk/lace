/**
 * Deterministic props for the ui-toolkit NotificationCard list benchmark, in
 * the shape the notifications page feeds each row (headerTitle / headerIcon /
 * bodyTitle / isRead). No Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import type { NotificationCard } from '../../src';

type NotificationCardProps = React.ComponentProps<typeof NotificationCard>;

const TITLES = [
  'Delegation rewards received',
  'New governance action available',
  'Wallet update available',
  'Price alert: ADA moved 5%',
];

export const makeNotificationCardProps = (
  count: number,
): NotificationCardProps[] =>
  Array.from({ length: count }, (_, index) => ({
    headerTitle: `Lace · notification ${index}`,
    headerIcon: 'Notification' as const,
    bodyTitle: TITLES[index % TITLES.length],
    isRead: index % 3 === 0,
    onPress: noop,
    testID: `perf-notification-${index}`,
  }));
