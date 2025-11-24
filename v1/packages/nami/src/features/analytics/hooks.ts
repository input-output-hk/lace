import { useCommonOutsideHandles } from '../../features/common-outside-handles-provider';

import type { Events } from './events';
import type { PostHogProperties } from '@lace/common';

export const useCaptureEvent = () => {
  const { sendEventToPostHog } = useCommonOutsideHandles();

  return async (
    event: Events,
    properties?: PostHogProperties,
  ): Promise<void> => {
    await sendEventToPostHog(event, properties);
  };
};
