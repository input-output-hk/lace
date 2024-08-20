/* eslint-disable functional/no-throw-statements */
import { useOutsideHandles } from '../../ui';

import type { Events } from './events';

export const useCaptureEvent = () => {
  const { sendEventToPostHog } = useOutsideHandles();

  return async (event: Events): Promise<void> => {
    await sendEventToPostHog(event);
  };
};
