import { useCallback, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type {
  StackNavigationProp,
  StackParameterList,
  StackRoutes,
} from '@lace-lib/navigation';

export const useNotificationDetails = ({
  navigation,
  notificationId,
}: {
  navigation: StackNavigationProp<
    StackParameterList,
    StackRoutes.NotificationDetails,
    undefined
  >;
  notificationId: string;
}) => {
  const notification = useLaceSelector(
    'notificationCenter.selectNotificationById',
    notificationId,
  );
  const removeNotification = useDispatchLaceAction(
    'notificationCenter.removeNotification',
  );

  const onBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const notificationItemParams = useMemo(() => {
    return {
      notificationId,
      headerTitle: notification?.message.chain ?? '',
      title: notification?.message.title ?? '',
      content: notification?.message.body ?? '',
      onBackPress,
      onDeletePress: () => {
        removeNotification({ id: notificationId });
        navigation.goBack();
      },
    };
  }, [
    navigation,
    notificationId,
    notification,
    removeNotification,
    onBackPress,
  ]);

  return {
    notificationItemParams,
  };
};
