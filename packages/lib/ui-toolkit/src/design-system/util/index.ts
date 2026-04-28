export { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { ShareAction } from 'react-native';

import * as ExpoClipboard from 'expo-clipboard';
import { Platform, Linking, Share } from 'react-native';

export * from './commons';
export * from './hooks';
export * from './color-utils';
export type * from './types';
export * from './text-utils';
export * from './image-format';
export * from './schedule-native-list-scroll-to-top';

/**
 * Adds a platform-dependent abstraction
 * Use this interface to extend/modify
 * any clipboard interactions
 */
export const Clipboard =
  Platform.OS === 'web'
    ? {
        getStringAsync: async () => window.navigator.clipboard.readText(),
        setStringAsync: async (value: string) =>
          window.navigator.clipboard.writeText(value),
      }
    : {
        getStringAsync: async () => ExpoClipboard.getStringAsync(),
        setStringAsync: async (value: string) =>
          ExpoClipboard.setStringAsync(value),
      };

type OpenUrlParams = {
  url: string;
  onError: (error: unknown) => void;
};

export const openUrl = async ({
  url,
  onError,
}: OpenUrlParams): Promise<void> => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    onError(error);
  }
};

export const shareString = async (
  message: string,
  onSuccess?: (action: ShareAction) => void,
  onError?: (error: unknown) => void,
): Promise<void> => {
  try {
    const result = await Share.share({
      message: message,
    });

    if (result.action === Share.sharedAction) {
      onSuccess?.(result);
    } else if (result.action === Share.dismissedAction) {
      onError?.(new Error('Share dismissed'));
    }
  } catch (error) {
    onError?.(error);
  }
};
